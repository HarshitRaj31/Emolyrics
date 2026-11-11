"""
EmoLyrics Multilingual Embedding & Feature Cache Manager
Extracts and caches 384-dimensional multilingual embeddings using
sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2.
Allows instant sub-second reloads without repeated neural inference on CPU.
"""

import os
import json
import numpy as np
from typing import Dict, Any, List, Tuple
from sentence_transformers import SentenceTransformer

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_ML_DIR, "cache")
PROCESSED_DIR = os.path.join(BASE_ML_DIR, "datasets", "processed")
CACHE_FILE = os.path.join(CACHE_DIR, "multilingual_minilm_embeddings.npz")

TARGET_TAXONOMY = [
    "Happiness", "Sadness", "Love", "Anger", "Nostalgia",
    "Fear", "Excitement", "Hope", "Loneliness", "Calmness"
]
LABEL_TO_IDX = {label: idx for idx, label in enumerate(TARGET_TAXONOMY)}
IDX_TO_LABEL = {idx: label for idx, label in enumerate(TARGET_TAXONOMY)}


class EmbeddingManager:
    def __init__(
        self,
        model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        cache_path: str = CACHE_FILE,
        processed_dir: str = PROCESSED_DIR,
        device: str = "cpu"
    ):
        self.model_name = model_name
        self.cache_path = cache_path
        self.processed_dir = processed_dir
        self.device = device
        self.encoder: Optional[SentenceTransformer] = None
        os.makedirs(os.path.dirname(self.cache_path), exist_ok=True)

    def _get_encoder(self) -> SentenceTransformer:
        if self.encoder is None:
            print(f"[EmbeddingManager] Loading pretrained encoder on {self.device}: {self.model_name}...")
            try:
                self.encoder = SentenceTransformer(self.model_name, device=self.device, local_files_only=True)
            except Exception:
                self.encoder = SentenceTransformer(self.model_name, device=self.device)
        return self.encoder

    def load_jsonl(self, split_name: str) -> List[Dict[str, Any]]:
        filepath = os.path.join(self.processed_dir, f"{split_name}.jsonl")
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Split file missing: {filepath}")
        records = []
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        return records

    def get_features(self, force_recompute: bool = False) -> Dict[str, Any]:
        """
        Loads embeddings and metadata for train, val, and test splits.
        Loads from cache if available, or computes and caches to disk.
        """
        if os.path.exists(self.cache_path) and not force_recompute:
            print(f"[EmbeddingManager] Loading cached embeddings from {self.cache_path}...")
            data = np.load(self.cache_path, allow_pickle=True)
            return {
                "X_train": data["X_train"],
                "y_train": data["y_train"],
                "meta_train": data["meta_train"].tolist(),
                "X_val": data["X_val"],
                "y_val": data["y_val"],
                "meta_val": data["meta_val"].tolist(),
                "X_test": data["X_test"],
                "y_test": data["y_test"],
                "meta_test": data["meta_test"].tolist(),
                "label_order": TARGET_TAXONOMY
            }

        print("[EmbeddingManager] Computing multilingual embeddings across dataset splits...")
        train_records = self.load_jsonl("train_combined")
        val_records = self.load_jsonl("val_combined")
        test_records = self.load_jsonl("test_combined")

        encoder = self._get_encoder()

        def extract_split(recs: List[Dict[str, Any]]):
            texts = [r["text"] for r in recs]
            emotions = [LABEL_TO_IDX[r["emotion"]] for r in recs]
            metadata = [
                {
                    "language": r.get("language"),
                    "domain": r.get("domain"),
                    "source": r.get("source"),
                    "emotion": r.get("emotion"),
                    "text": r.get("text")
                }
                for r in recs
            ]
            print(f"  Encoding {len(texts)} samples (batch_size=32)...")
            embeddings = encoder.encode(
                texts,
                batch_size=32,
                show_progress_bar=True,
                convert_to_numpy=True,
                normalize_embeddings=True
            )
            return embeddings, np.array(emotions, dtype=np.int64), metadata

        X_train, y_train, meta_train = extract_split(train_records)
        X_val, y_val, meta_val = extract_split(val_records)
        X_test, y_test, meta_test = extract_split(test_records)

        # Save cache
        np.savez_compressed(
            self.cache_path,
            X_train=X_train,
            y_train=y_train,
            meta_train=np.array(meta_train, dtype=object),
            X_val=X_val,
            y_val=y_val,
            meta_val=np.array(meta_val, dtype=object),
            X_test=X_test,
            y_test=y_test,
            meta_test=np.array(meta_test, dtype=object)
        )
        print(f"[EmbeddingManager] Saved cached embeddings to {self.cache_path} ({os.path.getsize(self.cache_path) / 1024 / 1024:.2f} MB)")

        return {
            "X_train": X_train,
            "y_train": y_train,
            "meta_train": meta_train,
            "X_val": X_val,
            "y_val": y_val,
            "meta_val": meta_val,
            "X_test": X_test,
            "y_test": y_test,
            "meta_test": meta_test,
            "label_order": TARGET_TAXONOMY
        }

