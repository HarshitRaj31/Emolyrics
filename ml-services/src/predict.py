"""
EmoLyrics Multilingual Emotion Prediction Module
Provides high-performance CPU inference across 5 target languages
(English, Hindi, Bengali, Spanish, French) without requiring English translation.
"""

import os
import sys
import re
import time
import hashlib
from collections import OrderedDict

# Prevent network timeout checks on local CPU inference
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

# Configurable CPU Thread Capping to prevent Windows thread exhaustion
DEFAULT_NUM_THREADS = int(os.getenv("TORCH_NUM_THREADS", "4"))

import json
import torch
torch.set_num_threads(DEFAULT_NUM_THREADS)
import torch.nn.functional as F
import numpy as np
from typing import Dict, Any, List, Optional
from sentence_transformers import SentenceTransformer

from .model import load_checkpoint, NeuralEmotionClassifier
from .code_switch import CodeSwitchAnalyzer, normalize_lyric_text
from .calibration import TemperatureScaler, assess_prediction_uncertainty
from .embedding_manager import TARGET_TAXONOMY, IDX_TO_LABEL

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_CHECKPOINT = os.path.join(BASE_ML_DIR, "models", "multilingual_classifier.pt")
MAX_INPUT_CHARACTERS = int(os.getenv("MAX_INPUT_CHARS", "5000"))
LRU_CACHE_MAX_SIZE = int(os.getenv("PREDICTION_CACHE_SIZE", "1000"))


def get_offline_model_path(model_name: str) -> str:
    """Finds exact local HF snapshot to bypass network latency and sandbox blocking."""
    org_repo = model_name.replace("/", "--")
    cache_dir = os.path.expanduser(os.path.join("~", ".cache", "huggingface", "hub", f"models--{org_repo}", "snapshots"))
    if os.path.exists(cache_dir):
        snapshots = os.listdir(cache_dir)
        if snapshots:
            candidate = os.path.join(cache_dir, snapshots[0])
            if os.path.isdir(candidate):
                return candidate
    return model_name


class MultilingualEmotionPredictor:
    def __init__(
        self,
        checkpoint_path: str = DEFAULT_CHECKPOINT,
        encoder_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        device: str = "cpu"
    ):
        self.device = device
        self.checkpoint_path = checkpoint_path
        self.encoder_name = get_offline_model_path(encoder_name)
        self.encoder: Optional[SentenceTransformer] = None
        self.model: Optional[NeuralEmotionClassifier] = None
        self.checkpoint_meta: Optional[Dict[str, Any]] = None
        self.code_switch_analyzer = CodeSwitchAnalyzer()
        self.temperature = 1.0295

        # High-Performance In-Memory LRU Prediction Cache
        self._cache: OrderedDict = OrderedDict()
        self._cache_max_size: int = LRU_CACHE_MAX_SIZE

        self._load_components()

    def get_system_telemetry(self) -> Dict[str, Any]:
        """Returns runtime memory, CPU thread allocation, and cache metrics."""
        try:
            import psutil
            proc = psutil.Process()
            mem_mb = round(proc.memory_info().rss / (1024 * 1024), 2)
        except Exception:
            mem_mb = 0.0

        return {
            "memoryRssMb": mem_mb,
            "cpuThreads": torch.get_num_threads(),
            "cacheEntries": len(self._cache),
            "cacheMaxSize": self._cache_max_size,
            "device": self.device,
            "modelVersion": getattr(self, "model_version", "v1.2.0-production-calibrated")
        }

    def _load_components(self):
        if not os.path.exists(self.checkpoint_path):
            raise FileNotFoundError(f"Model checkpoint not found at: {self.checkpoint_path}")
        self.model, self.checkpoint_meta = load_checkpoint(self.checkpoint_path, device=self.device)
        self.label_order = self.checkpoint_meta.get("label_order", TARGET_TAXONOMY)
        self.temperature = float(self.checkpoint_meta.get("config", {}).get("temperature", 1.0295))

        # Resolve model version from production metadata if available
        meta_path = os.path.join(os.path.dirname(self.checkpoint_path), "model_metadata.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta_dict = json.load(f)
                    self.model_version = meta_dict.get("version", "v1.2.0-production-calibrated")
            except Exception:
                self.model_version = "v1.2.0-production-calibrated"
        else:
            self.model_version = self.checkpoint_meta.get("config", {}).get("model_version", "v1.2.0-production-calibrated")

        try:
            self.encoder = SentenceTransformer(self.encoder_name, device=self.device, local_files_only=True)
        except Exception:
            self.encoder = SentenceTransformer(self.encoder_name, device=self.device)

    def predict(self, text: str, specified_language: Optional[str] = None) -> Dict[str, Any]:
        start_time = time.time()

        if not text or not isinstance(text, str) or not text.strip():
            return {
                "error": "Empty text provided.",
                "primary_emotion": None,
                "confidence": 0.0,
                "probabilities": {e: 0.0 for e in self.label_order},
                "durationMs": 0.0,
                "isCached": False
            }

        # Safe input length limiting to prevent Denial of Service & memory exhaustion
        was_truncated = False
        raw_input = text.strip()
        if len(raw_input) > MAX_INPUT_CHARACTERS:
            raw_input = raw_input[:MAX_INPUT_CHARACTERS]
            was_truncated = True

        # Language-aware normalization (preserves diacritics & handles elongated slang)
        norm_text = normalize_lyric_text(raw_input)

        # LRU Cache Lookup (Sub-millisecond duplicate query handling)
        cache_key = hashlib.md5(f"{specified_language or ''}::{norm_text}".encode("utf-8")).hexdigest()
        if cache_key in self._cache:
            cached_res = dict(self._cache[cache_key])
            self._cache.move_to_end(cache_key)
            cached_res["isCached"] = True
            cached_res["durationMs"] = round((time.time() - start_time) * 1000, 2)
            return cached_res

        # Code-Switching & Language Audit
        cs_info = self.code_switch_analyzer.analyze(norm_text)
        if specified_language:
            lang = specified_language.strip().lower()
        else:
            lang = cs_info.get("primaryLanguage", "en")

        # Embedding Extraction on CPU
        emb = self.encoder.encode([norm_text], convert_to_numpy=True, normalize_embeddings=True)
        emb_tensor = torch.tensor(emb, dtype=torch.float32).to(self.device)

        # Inference with Temperature Scaling Calibration
        with torch.no_grad():
            logits = self.model(emb_tensor)
            scaled_logits = logits / max(0.01, self.temperature)
            probs_tensor = F.softmax(scaled_logits, dim=-1)[0]
            probs = probs_tensor.cpu().numpy()

        sorted_indices = np.argsort(probs)[::-1]
        primary_idx = int(sorted_indices[0])
        primary_emotion = self.label_order[primary_idx]
        primary_confidence = float(probs[primary_idx])

        # Evaluate Prediction Uncertainty & Calibration Margins
        uncertainty_info = assess_prediction_uncertainty(probs)

        # Secondary emotions (next top 2 with prob >= 0.05)
        secondary_emotions = []
        for idx in sorted_indices[1:4]:
            p = float(probs[idx])
            if p >= 0.05:
                secondary_emotions.append({
                    "emotion": self.label_order[int(idx)],
                    "confidence": round(p, 4)
                })

        all_probs = {self.label_order[i]: round(float(probs[i]), 4) for i in range(len(self.label_order))}

        # Construct comprehensive warning if applicable
        warnings = []
        if was_truncated:
            warnings.append(f"Input exceeded {MAX_INPUT_CHARACTERS} characters and was safely truncated.")
        if cs_info.get("warning"):
            warnings.append(cs_info["warning"])
        if uncertainty_info.get("warningReason"):
            warnings.append(uncertainty_info["warningReason"])
        combined_warning = " | ".join(warnings) if warnings else None

        duration_ms = round((time.time() - start_time) * 1000, 2)

        result = {
            "text_preview": norm_text[:120] + ("..." if len(norm_text) > 120 else ""),
            "detected_language": lang,
            "language_name": cs_info.get("languageName", lang.upper()),
            "is_code_switched": cs_info.get("isCodeSwitched", False),
            "code_switch_type": cs_info.get("codeSwitchType"),
            "script_breakdown": cs_info.get("scriptBreakdown", {}),
            "language_distribution": cs_info.get("languageDistribution", {}),
            "language_info": cs_info,
            "primary_emotion": primary_emotion,
            "confidence": round(primary_confidence, 4),
            "is_uncertain": uncertainty_info.get("isUncertain", False),
            "uncertainty_details": uncertainty_info,
            "temperature": round(self.temperature, 4),
            "temperature_used": round(self.temperature, 4),
            "secondary_emotions": secondary_emotions,
            "probabilities": all_probs,
            "warning": combined_warning,
            "durationMs": duration_ms,
            "isCached": False,
            "model_version": getattr(self, "model_version", "v1.2.0-production-calibrated")
        }

        # Add to LRU Cache
        if len(self._cache) >= self._cache_max_size:
            self._cache.popitem(last=False)
        self._cache[cache_key] = result

        return result

    def predict_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        return [self.predict(t) for t in texts]

    def predict_lines(
        self,
        lines: List[str],
        context_window: int = 1,
        specified_language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Context-aware line-by-line emotion classification with batched inference.
        Preserves original line order, structural headers, and handles short ambiguous lines.
        """
        if not lines:
            return []

        header_pattern = re.compile(
            r"^(?:\[.*?\]|\(.*?\)|(?:intro|verse|chorus|bridge|outro|pre-chorus|hook|interlude|refrain)\s*[\d:]*)$",
            re.IGNORECASE
        )

        parsed_entries = []
        valid_lyric_items = []

        for idx, raw_line in enumerate(lines):
            line_str = (raw_line or "").strip()
            if not line_str:
                continue

            orig_num = idx + 1
            is_header = bool(header_pattern.match(line_str))

            entry = {
                "originalLineNumber": orig_num,
                "text": line_str,
                "isSectionHeader": is_header
            }

            if is_header:
                clean_header = line_str.strip("[](): ")
                entry.update({
                    "language": specified_language or "en",
                    "languageName": "Structure",
                    "isCodeSwitched": False,
                    "codeSwitchType": None,
                    "primaryEmotion": "Structure",
                    "secondaryEmotions": [],
                    "secondaryEmotionsData": [],
                    "confidence": 1.0,
                    "isUncertain": False,
                    "uncertaintyReason": None,
                    "emotionProbabilities": {e: 0.0 for e in self.label_order},
                    "isAmbiguous": False,
                    "explanation": f"Song structural marker ({clean_header})"
                })
                parsed_entries.append(entry)
            else:
                entry["lyricIndex"] = len(valid_lyric_items)
                valid_lyric_items.append(entry)
                parsed_entries.append(entry)

        if not valid_lyric_items:
            for i, p in enumerate(parsed_entries):
                p["lineNumber"] = i + 1
            return parsed_entries

        # Document-level language hint
        joined_sample = " ".join([item["text"] for item in valid_lyric_items[:6]])
        doc_cs_info = self.code_switch_analyzer.analyze(joined_sample)
        doc_lang = specified_language if specified_language in {"en", "hi", "bn", "es", "fr"} else doc_cs_info.get("primaryLanguage", "en")

        # Build normalized local and contextual texts
        local_texts = [normalize_lyric_text(item["text"]) for item in valid_lyric_items]
        context_texts = []
        ambiguity_flags = []

        for j, item in enumerate(valid_lyric_items):
            words = item["text"].split()
            word_count = len(words)
            is_ambig = word_count <= 3 or (
                word_count <= 4 and words[0].lower() in {"oh", "yeah", "ah", "la", "na", "ooh", "hey", "and", "then", "hum", "yeh"}
            )
            ambiguity_flags.append(is_ambig)

            start_j = max(0, j - context_window)
            end_j = min(len(valid_lyric_items), j + context_window + 1)
            ctx_str = " ".join([local_texts[k] for k in range(start_j, end_j)])
            context_texts.append(ctx_str)

        # Batched SentenceTransformer Encoding (Single CPU Pass)
        if context_window > 0:
            texts_to_encode = local_texts + context_texts
        else:
            texts_to_encode = local_texts

        embs = self.encoder.encode(texts_to_encode, batch_size=32, convert_to_numpy=True, normalize_embeddings=True)
        embs_tensor = torch.tensor(embs, dtype=torch.float32).to(self.device)

        # Apply Temperature Scaling Calibration to line logits
        with torch.no_grad():
            all_logits = self.model(embs_tensor)
            scaled_logits = all_logits / max(0.01, self.temperature)
            all_probs_mat = F.softmax(scaled_logits, dim=-1).cpu().numpy()

        local_probs_mat = all_probs_mat[:len(local_texts)]
        context_probs_mat = all_probs_mat[len(local_texts):] if context_window > 0 else local_probs_mat

        # Blend probabilities and construct line predictions
        for j, item in enumerate(valid_lyric_items):
            is_ambig = ambiguity_flags[j]
            local_p = local_probs_mat[j]
            context_p = context_probs_mat[j]

            if context_window > 0:
                alpha = 0.50 if is_ambig else 0.25
                blended_p = (1.0 - alpha) * local_p + alpha * context_p
            else:
                blended_p = local_p

            blended_p = blended_p / np.sum(blended_p)

            sorted_indices = np.argsort(blended_p)[::-1]
            primary_idx = int(sorted_indices[0])
            primary_emotion = self.label_order[primary_idx]
            raw_conf = float(blended_p[primary_idx])

            # Damp extreme false confidence on ambiguous short lines
            conf = round(min(raw_conf * 0.92, 0.82) if is_ambig else raw_conf, 4)

            # Evaluate uncertainty for each line
            line_uncertainty = assess_prediction_uncertainty(blended_p)

            sec_emotions_str = []
            sec_emotions_data = []
            for idx in sorted_indices[1:3]:
                sp = float(blended_p[idx])
                if sp >= 0.08:
                    emo_name = self.label_order[int(idx)]
                    sec_emotions_str.append(emo_name)
                    sec_emotions_data.append({
                        "emotion": emo_name,
                        "confidence": round(sp, 4),
                        "percentage": int(round(sp * 100))
                    })

            all_line_probs = {self.label_order[k]: round(float(blended_p[k]), 4) for k in range(len(self.label_order))}

            # Line-level language and code-switching audit
            line_cs_info = self.code_switch_analyzer.analyze(item["text"])
            line_lang = line_cs_info["primaryLanguage"] if not line_cs_info.get("isUncertain") else doc_lang
            line_lang_name = line_cs_info.get("languageName", line_lang.upper())

            if is_ambig:
                explanation = f"Short lyric expression conveying subtle {primary_emotion.lower()} tones within local context."
            elif line_uncertainty.get("isUncertain"):
                explanation = f"Expresses subtle emotional nuances tending toward {primary_emotion.lower()} with blended secondary currents."
            else:
                explanation = f"Evokes {primary_emotion.lower()} through expressive lyrical phrasing and emotional valence."

            item.update({
                "language": line_lang,
                "languageName": line_lang_name,
                "isCodeSwitched": line_cs_info.get("isCodeSwitched", False),
                "codeSwitchType": line_cs_info.get("codeSwitchType"),
                "primaryEmotion": primary_emotion,
                "secondaryEmotions": sec_emotions_str,
                "secondaryEmotionsData": sec_emotions_data,
                "confidence": conf,
                "isUncertain": line_uncertainty.get("isUncertain", False),
                "uncertaintyReason": line_uncertainty.get("warningReason"),
                "uncertaintyDetails": line_uncertainty,
                "emotionProbabilities": all_line_probs,
                "isAmbiguous": is_ambig,
                "explanation": explanation
            })
            item.pop("lyricIndex", None)

        for line_num, entry in enumerate(parsed_entries, 1):
            entry["lineNumber"] = line_num

        return parsed_entries


if __name__ == "__main__":
    if os.path.exists(DEFAULT_CHECKPOINT):
        predictor = MultilingualEmotionPredictor()
        test_lyrics = [
            "I feel so happy today and the sunshine is bright",
            "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम",
            "আমার সোনার বাংলা আমি তোমায় ভালোবাসি",
            "Mi corazón siente una gran tristeza y dolor",
            "Dans la nuit je ressens une peur immense et terrifiante"
        ]
        for t in test_lyrics:
            res = predictor.predict(t)
            print(f"[{res['detected_language']}] {res['text_preview']} -> {res['primary_emotion']} ({res['confidence']})")

