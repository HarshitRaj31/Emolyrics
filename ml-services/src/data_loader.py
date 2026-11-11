"""
EmoLyrics Data Loader & Preprocessing Module
Extracts, validates, and normalizes lyric and general emotion records from:
  1. MIREX (raw dataset with UTF-16 CSV metadata and numeric ID text files) [domain: lyrics]
  2. In-repo Multilingual Benchmark dataset [domain: lyrics]
  3. GoEmotions (Google Research) [domain: social_media]
  4. XED (Helsinki-NLP French & Spanish projections) [domain: general_text]
  5. BEmoC (Bengali Emotion Corpus) [domain: general_text]
  6. Hindi Emotion Analysis Corpus [domain: general_text]

Includes high-precision script & n-gram language detection with code-switching awareness.
"""

import os
import csv
import json
import re
import hashlib
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Tuple, Set
from collections import Counter

from .label_mapping import LabelMapper

# ---------------------------------------------------------------------------
# Language Detection Engine
# ---------------------------------------------------------------------------

class LanguageDetector:
    """
    Multilingual text and script classifier supporting English (en), Hindi (hi),
    Bengali (bn), Spanish (es), and French (fr), with Hinglish/Banglish recognition.
    """
    
    ES_WORDS = {
        "el", "la", "de", "que", "y", "en", "un", "se", "no", "por", "con", "para",
        "los", "las", "del", "una", "más", "pero", "como", "esta", "todo", "cuando",
        "está", "si", "yo", "te", "mi", "tu", "vida", "corazón", "amor", "siento",
        "donde", "siempre", "nunca", "nada", "nadie", "canción", "noche", "día",
        "alma", "beso", "tus", "mis", "quiero", "tiempo", "ojos", "ahora", "muy"
    }

    FR_WORDS = {
        "le", "la", "de", "et", "un", "une", "dans", "les", "des", "en", "du", "que",
        "pour", "pas", "qui", "sur", "avec", "est", "ce", "il", "elle", "sont", "plus",
        "par", "je", "tu", "mon", "ma", "mes", "tout", "nous", "vous", "ils", "temps",
        "vie", "sans", "faire", "quand", "comme", "moi", "toi", "monde", "cœur", "coeur",
        "yeux", "jamais", "toujours", "rien", "bonheur", "joie", "amour"
    }

    EN_WORDS = {
        "the", "and", "you", "that", "was", "for", "are", "with", "his", "they",
        "at", "be", "this", "have", "from", "one", "had", "by", "word", "but",
        "not", "what", "all", "were", "we", "when", "your", "can", "said", "there",
        "use", "each", "which", "she", "do", "how", "their", "if", "will", "up",
        "other", "about", "out", "many", "then", "them", "these", "so", "some",
        "her", "would", "make", "like", "him", "into", "time", "has", "look", "love"
    }

    HINGLISH_WORDS = {
        "dil", "pyar", "pyaar", "mohabbat", "khushi", "dard", "aansu", "aankhon",
        "zindagi", "sanam", "hum", "tum", "mera", "meri", "tera", "teri", "ishq",
        "jashn", "khushboo", "muskaan", "dhadkan", "chahat", "wafa", "tere", "mere",
        "kuch", "nahi", "saath", "deewana", "deewani", "raat", "mehfil", "jeena"
    }

    BANGLISH_WORDS = {
        "amar", "amra", "tumi", "tomar", "bhalobasha", "bhalobasi", "mon", "dukkho",
        "kanna", "chokher", "jol", "gaan", "shonar", "bangla", "hridoy", "hasimukh",
        "ullas", "sukhi", "alor", "majhe", "tara", "kotha"
    }

    DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
    BENGALI_RE = re.compile(r"[\u0980-\u09FF]")
    ES_CHARS_RE = re.compile(r"[áéíóúñ¿¡]", re.IGNORECASE)
    FR_CHARS_RE = re.compile(r"[éèêëàâçîïôùûüœæ]", re.IGNORECASE)

    def detect(self, text: str) -> Dict[str, Any]:
        if not text or not isinstance(text, str) or not text.strip():
            return {
                "language": "unknown",
                "script": "unknown",
                "confidence": "none",
                "is_supported": False,
                "notes": "Empty text"
            }

        cleaned = text.strip()

        # 1. Check Devanagari script (Hindi)
        dev_matches = len(self.DEVANAGARI_RE.findall(cleaned))
        if dev_matches >= 3:
            return {
                "language": "hi",
                "script": "Devanagari",
                "confidence": "high",
                "is_supported": True,
                "notes": f"Devanagari script ({dev_matches} chars)"
            }

        # 2. Check Bengali script (Bengali)
        beng_matches = len(self.BENGALI_RE.findall(cleaned))
        if beng_matches >= 3:
            return {
                "language": "bn",
                "script": "Bengali",
                "confidence": "high",
                "is_supported": True,
                "notes": f"Bengali script ({beng_matches} chars)"
            }

        # 3. Latin Script Analysis
        tokens = [w.lower().strip(".,!?:;\"'()[]{}<>-/*~`$#@%^_=+|\n\r\t") for w in cleaned.split()]
        tokens = [t for t in tokens if len(t) > 1 and t.isalpha()]

        if not tokens:
            return {
                "language": "unknown",
                "script": "Latin",
                "confidence": "low",
                "is_supported": False,
                "notes": "No alphabetic tokens"
            }

        # Check for Transliterated Hindi (Hinglish)
        hinglish_hits = sum(1 for t in tokens if t in self.HINGLISH_WORDS)
        if hinglish_hits >= 2 or (hinglish_hits >= 1 and len(tokens) <= 10):
            return {
                "language": "hi",
                "script": "Latin",
                "confidence": "medium",
                "is_supported": True,
                "notes": f"Transliterated Hindi (Hinglish: {hinglish_hits} markers)"
            }

        # Check for Transliterated Bengali (Banglish)
        banglish_hits = sum(1 for t in tokens if t in self.BANGLISH_WORDS)
        if banglish_hits >= 2 or (banglish_hits >= 1 and len(tokens) <= 10):
            return {
                "language": "bn",
                "script": "Latin",
                "confidence": "medium",
                "is_supported": True,
                "notes": f"Transliterated Bengali (Banglish: {banglish_hits} markers)"
            }

        # Check Spanish vs French vs English
        es_char_hits = len(self.ES_CHARS_RE.findall(cleaned))
        fr_char_hits = len(self.FR_CHARS_RE.findall(cleaned))

        es_word_hits = sum(1 for t in tokens if t in self.ES_WORDS)
        fr_word_hits = sum(1 for t in tokens if t in self.FR_WORDS)
        en_word_hits = sum(1 for t in tokens if t in self.EN_WORDS)

        total_tokens = len(tokens)
        es_score = (es_word_hits * 2) + es_char_hits
        fr_score = (fr_word_hits * 2) + fr_char_hits
        en_score = en_word_hits * 2

        if es_score > fr_score and es_score > en_score and (es_word_hits >= 2 or es_char_hits >= 1):
            return {
                "language": "es",
                "script": "Latin",
                "confidence": "high" if es_score >= 4 else "medium",
                "is_supported": True,
                "notes": f"Spanish (words: {es_word_hits}, special: {es_char_hits})"
            }

        if fr_score > es_score and fr_score > en_score and (fr_word_hits >= 2 or fr_char_hits >= 1):
            return {
                "language": "fr",
                "script": "Latin",
                "confidence": "high" if fr_score >= 4 else "medium",
                "is_supported": True,
                "notes": f"French (words: {fr_word_hits}, special: {fr_char_hits})"
            }

        if en_word_hits >= 2 or total_tokens <= 15:
            return {
                "language": "en",
                "script": "Latin",
                "confidence": "high" if en_word_hits >= 3 else "medium",
                "is_supported": True,
                "notes": f"English (words: {en_word_hits}/{total_tokens})"
            }

        return {
            "language": "en",
            "script": "Latin",
            "confidence": "low",
            "is_supported": True,
            "notes": "Latin text defaulted to English with low confidence"
        }


# ---------------------------------------------------------------------------
# Group A: MIREX Dataset Ingestion (Lyrics)
# ---------------------------------------------------------------------------

class MirexLoader:
    def __init__(self, mirex_root: str, label_mapper: Optional[LabelMapper] = None):
        self.mirex_root = os.path.abspath(mirex_root)
        self.label_mapper = label_mapper or LabelMapper()
        self.lang_detector = LanguageDetector()

    def load_records(self) -> List[Dict[str, Any]]:
        archive_dir = os.path.join(self.mirex_root, "archive (2)")
        dataset_dir = os.path.join(archive_dir, "dataset") if os.path.exists(archive_dir) else self.mirex_root
        lyrics_dir = os.path.join(dataset_dir, "Lyrics")
        csv_path = os.path.join(dataset_dir, "dataset info.csv")
        clusters_path = os.path.join(dataset_dir, "clusters.txt")
        categories_path = os.path.join(dataset_dir, "categories.txt")

        if not os.path.exists(csv_path) or not os.path.exists(lyrics_dir):
            raise FileNotFoundError(f"MIREX dataset files missing in {dataset_dir}")

        with open(clusters_path, "r", encoding="utf-8", errors="replace") as f:
            clusters = [line.strip() for line in f if line.strip()]

        with open(categories_path, "r", encoding="utf-8", errors="replace") as f:
            categories = [line.strip() for line in f if line.strip()]

        csv_rows = []
        try:
            with open(csv_path, "r", encoding="utf-16") as f:
                reader = csv.reader(f, delimiter=";")
                header = next(reader, [])
                for row in reader:
                    if row and len(row) > 1 and row[0].strip():
                        csv_rows.append([col.strip() for col in row])
        except Exception:
            with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f, delimiter=";")
                header = next(reader, [])
                for row in reader:
                    if row and len(row) > 1 and row[0].strip():
                        csv_rows.append([col.strip() for col in row])

        lyric_files_on_disk = set(os.listdir(lyrics_dir))
        content_hashes: Dict[str, str] = {}
        records: List[Dict[str, Any]] = []

        for idx, row in enumerate(csv_rows):
            title = row[0]
            artist = row[1] if len(row) > 1 else None
            album = row[2] if len(row) > 2 else None
            year = row[4] if len(row) > 4 else None
            filename = row[8] if len(row) > 8 else f"{idx+1:03d}.mp3"
            stem = os.path.splitext(filename)[0].strip()
            txt_filename = f"{stem}.txt"

            cluster = clusters[idx] if idx < len(clusters) else "Unknown"
            category = categories[idx] if idx < len(categories) else "Unknown"

            if txt_filename not in lyric_files_on_disk:
                records.append({
                    "text": "",
                    "language": "unknown",
                    "emotion": None,
                    "source": "mirex",
                    "source_id": stem,
                    "artist": artist,
                    "title": title,
                    "album": album,
                    "year": year,
                    "label_original": category,
                    "domain": "lyrics",
                    "label_confidence": None,
                    "cluster": cluster,
                    "is_mapped": False,
                    "is_empty": True,
                    "is_duplicate": False,
                    "exclusion_reason": "Missing lyric file on disk (instrumental or unavailable)"
                })
                continue

            full_path = os.path.join(lyrics_dir, txt_filename)
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as lf:
                    content = lf.read().strip()
            except Exception:
                content = ""

            if not content:
                records.append({
                    "text": "",
                    "language": "unknown",
                    "emotion": None,
                    "source": "mirex",
                    "source_id": stem,
                    "artist": artist,
                    "title": title,
                    "album": album,
                    "year": year,
                    "label_original": category,
                    "domain": "lyrics",
                    "label_confidence": None,
                    "cluster": cluster,
                    "is_mapped": False,
                    "is_empty": True,
                    "is_duplicate": False,
                    "exclusion_reason": "Empty lyric file"
                })
                continue

            norm_content = re.sub(r"\s+", " ", content.lower()).strip()
            chash = hashlib.md5(norm_content.encode("utf-8")).hexdigest()
            is_dupe = chash in content_hashes
            if not is_dupe:
                content_hashes[chash] = stem

            lang_info = self.lang_detector.detect(content)
            detected_lang = lang_info["language"]

            mapped_emo, emo_conf, emo_reason = self.label_mapper.map_mirex_label(category)
            is_mapped = self.label_mapper.is_defensible(mapped_emo)

            exclusion_reason = None
            if not is_mapped:
                exclusion_reason = f"Unmapped MIREX category: {category} ({emo_reason})"

            records.append({
                "text": content,
                "language": detected_lang,
                "emotion": mapped_emo,
                "source": "mirex",
                "source_id": stem,
                "artist": artist,
                "title": title,
                "album": album,
                "year": year,
                "label_original": category,
                "domain": "lyrics",
                "label_confidence": emo_conf,
                "cluster": cluster,
                "mapping_reason": emo_reason,
                "is_mapped": is_mapped,
                "is_empty": False,
                "is_duplicate": is_dupe,
                "duplicate_of": content_hashes[chash] if is_dupe else None,
                "exclusion_reason": exclusion_reason,
                "language_info": lang_info
            })

        return records


# ---------------------------------------------------------------------------
# Group A: Benchmark Dataset Ingestion (Lyrics)
# ---------------------------------------------------------------------------

class BenchmarkLoader:
    def __init__(self, benchmark_path: str, label_mapper: Optional[LabelMapper] = None):
        self.benchmark_path = os.path.abspath(benchmark_path)
        self.label_mapper = label_mapper or LabelMapper()
        self.lang_detector = LanguageDetector()

    def load_records(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.benchmark_path):
            raise FileNotFoundError(f"Benchmark dataset not found at {self.benchmark_path}")

        with open(self.benchmark_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        records: List[Dict[str, Any]] = []

        for idx, item in enumerate(raw_data):
            text = (item.get("text") or "").strip()
            orig_label = item.get("label", "").strip()
            specified_lang = item.get("lang", "").strip()

            if not text:
                continue

            detected = self.lang_detector.detect(text)
            lang = specified_lang if specified_lang in {"en", "hi", "bn", "es", "fr"} else detected["language"]

            mapped_emo, emo_conf, emo_reason = self.label_mapper.map_benchmark_label(orig_label)
            is_mapped = self.label_mapper.is_defensible(mapped_emo)

            records.append({
                "text": text,
                "language": lang,
                "emotion": mapped_emo,
                "source": "benchmark",
                "source_id": f"bench_{idx+1:03d}",
                "artist": item.get("artist"),
                "title": item.get("title"),
                "label_original": orig_label,
                "domain": "lyrics",
                "label_confidence": emo_conf,
                "mapping_reason": emo_reason,
                "is_mapped": is_mapped,
                "is_empty": False,
                "is_duplicate": False,
                "exclusion_reason": None if is_mapped else f"Unmapped label: {orig_label}",
                "language_info": detected
            })

        return records


# ---------------------------------------------------------------------------
# Group B: GoEmotions Ingestion (Social Media / Reddit)
# ---------------------------------------------------------------------------

class GoEmotionsLoader:
    def __init__(self, raw_dir: str, label_mapper: Optional[LabelMapper] = None):
        self.raw_dir = os.path.abspath(raw_dir)
        self.label_mapper = label_mapper or LabelMapper()
        self.lang_detector = LanguageDetector()

    def load_records(self) -> List[Dict[str, Any]]:
        dev_path = os.path.join(self.raw_dir, "dev.tsv")
        emotions_path = os.path.join(self.raw_dir, "emotions.txt")

        if not os.path.exists(dev_path) or not os.path.exists(emotions_path):
            raise FileNotFoundError(f"GoEmotions files missing in {self.raw_dir}")

        with open(emotions_path, "r", encoding="utf-8") as f:
            emotion_names = [line.strip() for line in f if line.strip()]

        records: List[Dict[str, Any]] = []
        with open(dev_path, "r", encoding="utf-8", errors="replace") as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                parts = line.split("\t")
                if len(parts) < 2:
                    continue
                text = parts[0].strip()
                raw_label_idx_str = parts[1].strip()
                sample_id = parts[2].strip() if len(parts) > 2 else f"goemo_{idx:05d}"

                if not text:
                    continue

                label_indices = [int(i.strip()) for i in raw_label_idx_str.split(",") if i.strip().isdigit()]
                original_labels = [emotion_names[i] for i in label_indices if i < len(emotion_names)]

                # Map labels
                mapped_emotions = []
                for orig in original_labels:
                    mapped, conf, reason = self.label_mapper.map_goemotions_label(orig)
                    if mapped:
                        mapped_emotions.append((mapped, conf, orig, reason))

                if not mapped_emotions:
                    # Unmapped (e.g. neutral, amusement, surprise)
                    records.append({
                        "text": text,
                        "language": "en",
                        "emotion": None,
                        "source": "goemotions",
                        "source_id": sample_id,
                        "artist": None,
                        "title": None,
                        "label_original": ",".join(original_labels),
                        "domain": "social_media",
                        "label_confidence": None,
                        "is_mapped": False,
                        "is_empty": False,
                        "is_duplicate": False,
                        "exclusion_reason": f"Unmapped GoEmotions label(s): {','.join(original_labels)}"
                    })
                    continue

                # Take dominant mapped emotion (highest confidence / first)
                primary_mapped, primary_conf, primary_orig, primary_reason = mapped_emotions[0]
                records.append({
                    "text": text,
                    "language": "en",
                    "emotion": primary_mapped,
                    "source": "goemotions",
                    "source_id": sample_id,
                    "artist": None,
                    "title": None,
                    "label_original": primary_orig,
                    "domain": "social_media",
                    "label_confidence": primary_conf,
                    "mapping_reason": primary_reason,
                    "is_mapped": True,
                    "is_empty": False,
                    "is_duplicate": False,
                    "exclusion_reason": None
                })

        return records


# ---------------------------------------------------------------------------
# Group B: XED Ingestion (Subtitles: French & Spanish)
# ---------------------------------------------------------------------------

class XEDLoader:
    def __init__(self, raw_dir: str, label_mapper: Optional[LabelMapper] = None):
        self.raw_dir = os.path.abspath(raw_dir)
        self.label_mapper = label_mapper or LabelMapper()
        self.lang_detector = LanguageDetector()

    def load_records(self, target_lang: Optional[str] = None) -> List[Dict[str, Any]]:
        langs = [target_lang] if target_lang else ["fr", "es"]
        records: List[Dict[str, Any]] = []

        for lang in langs:
            tsv_path = os.path.join(self.raw_dir, f"{lang}-projections.tsv")
            if not os.path.exists(tsv_path):
                continue

            with open(tsv_path, "r", encoding="utf-8", errors="replace") as f:
                for idx, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split("\t")
                    if len(parts) < 2:
                        continue
                    text = parts[0].strip()
                    label_str = parts[1].strip()
                    sample_id = f"xed_{lang}_{idx+1:05d}"

                    if not text:
                        continue

                    raw_codes = [c.strip() for c in label_str.split(",") if c.strip()]
                    mapped_list = []
                    for code in raw_codes:
                        mapped, conf, reason = self.label_mapper.map_xed_label(code)
                        if mapped:
                            mapped_list.append((mapped, conf, code, reason))

                    if not mapped_list:
                        records.append({
                            "text": text,
                            "language": lang,
                            "emotion": None,
                            "source": "xed",
                            "source_id": sample_id,
                            "artist": None,
                            "title": None,
                            "label_original": label_str,
                            "domain": "general_text",
                            "label_confidence": None,
                            "is_mapped": False,
                            "is_empty": False,
                            "is_duplicate": False,
                            "exclusion_reason": f"Unmapped XED label: {label_str}"
                        })
                        continue

                    # Select first mapped label
                    primary_mapped, primary_conf, primary_orig, primary_reason = mapped_list[0]
                    records.append({
                        "text": text,
                        "language": lang,
                        "emotion": primary_mapped,
                        "source": "xed",
                        "source_id": sample_id,
                        "artist": None,
                        "title": None,
                        "label_original": primary_orig,
                        "domain": "general_text",
                        "label_confidence": primary_conf,
                        "mapping_reason": primary_reason,
                        "is_mapped": True,
                        "is_empty": False,
                        "is_duplicate": False,
                        "exclusion_reason": None
                    })

        return records


# ---------------------------------------------------------------------------
# Group B: BEmoC Ingestion (Bengali Literature & Social Text)
# ---------------------------------------------------------------------------

class BEmoCLoader:
    def __init__(self, raw_dir: str, label_mapper: Optional[LabelMapper] = None):
        self.raw_dir = os.path.abspath(raw_dir)
        self.label_mapper = label_mapper or LabelMapper()
        self.lang_detector = LanguageDetector()

    def load_records(self) -> List[Dict[str, Any]]:
        xlsx_path = os.path.join(self.raw_dir, "cleaned_BEmoC7k.xlsx")
        if not os.path.exists(xlsx_path):
            raise FileNotFoundError(f"BEmoC file missing at {xlsx_path}")

        records: List[Dict[str, Any]] = []
        try:
            with zipfile.ZipFile(xlsx_path, "r") as z:
                # Shared strings table
                sst: List[str] = []
                if "xl/sharedStrings.xml" in z.namelist():
                    root_sst = ET.fromstring(z.read("xl/sharedStrings.xml"))
                    for si in root_sst.findall(".//{*}si"):
                        t_nodes = si.findall(".//{*}t")
                        sst.append("".join(t.text or "" for t in t_nodes))

                sheet_root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
                rows = sheet_root.findall(".//{*}row")

                for idx, r in enumerate(rows[1:], start=1):
                    c_nodes = r.findall("{*}c")
                    cells: List[str] = []
                    for c in c_nodes:
                        val_node = c.find("{*}v")
                        val = val_node.text if val_node is not None else ""
                        if c.get("t") == "s" and val.isdigit():
                            s_idx = int(val)
                            cells.append(sst[s_idx] if s_idx < len(sst) else "")
                        else:
                            cells.append(val or "")

                    if len(cells) < 2:
                        continue
                    text = cells[0].strip()
                    orig_label = cells[1].strip()
                    sample_id = f"bemoc_{idx:05d}"

                    if not text:
                        continue

                    mapped_emo, conf, reason = self.label_mapper.map_bemoc_label(orig_label)
                    is_mapped = self.label_mapper.is_defensible(mapped_emo)

                    records.append({
                        "text": text,
                        "language": "bn",
                        "emotion": mapped_emo,
                        "source": "bemoc",
                        "source_id": sample_id,
                        "artist": None,
                        "title": None,
                        "label_original": orig_label,
                        "domain": "general_text",
                        "label_confidence": conf,
                        "mapping_reason": reason,
                        "is_mapped": is_mapped,
                        "is_empty": False,
                        "is_duplicate": False,
                        "exclusion_reason": None if is_mapped else f"Unmapped BEmoC category: {orig_label}"
                    })
        except Exception as e:
            print(f"[BEmoCLoader] Error parsing {xlsx_path}: {e}")

        return records


# ---------------------------------------------------------------------------
# Group B: Hindi Emotion Analysis Corpus Ingestion (Devanagari Sentences)
# ---------------------------------------------------------------------------

class HindiCorpusLoader:
    def __init__(self, raw_dir: str, label_mapper: Optional[LabelMapper] = None):
        self.raw_dir = os.path.abspath(raw_dir)
        self.label_mapper = label_mapper or LabelMapper()
        self.lang_detector = LanguageDetector()

    def load_records(self) -> List[Dict[str, Any]]:
        files = {
            "happy.csv": "happy",
            "sad.csv": "sad",
            "angry.csv": "angry",
            "neutral.csv": "neutral"
        }
        records: List[Dict[str, Any]] = []

        for fname, label_key in files.items():
            fpath = os.path.join(self.raw_dir, fname)
            if not os.path.exists(fpath):
                continue

            with open(fpath, "r", encoding="utf-8", errors="replace") as fp:
                reader = csv.reader(fp)
                header = next(reader, [])
                for idx, row in enumerate(reader):
                    if not row or len(row) < 2:
                        continue
                    text = row[1].strip() if len(row) > 1 else ""
                    if not text:
                        continue

                    mapped_emo, conf, reason = self.label_mapper.map_hindi_corpus_label(label_key)
                    is_mapped = self.label_mapper.is_defensible(mapped_emo)
                    sample_id = f"hi_{label_key}_{idx+1:04d}"

                    records.append({
                        "text": text,
                        "language": "hi",
                        "emotion": mapped_emo,
                        "source": "hindi_corpus",
                        "source_id": sample_id,
                        "artist": None,
                        "title": None,
                        "label_original": label_key,
                        "domain": "general_text",
                        "label_confidence": conf,
                        "mapping_reason": reason,
                        "is_mapped": is_mapped,
                        "is_empty": False,
                        "is_duplicate": False,
                        "exclusion_reason": None if is_mapped else f"Unmapped Hindi label: {label_key}"
                    })

        return records
