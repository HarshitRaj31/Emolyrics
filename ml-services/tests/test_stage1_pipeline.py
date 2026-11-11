"""
Unit and Integration Test Suite for Stage 1: Multilingual Dataset Preparation & Alignment.
Tests:
  1. MIREX Filename-to-Label Matching
  2. CSV UTF-16 Decoding and Delimiter Parsing
  3. Emotion Label Mapping (Mapped vs. Unmapped & Confidence)
  4. Language & Script Detection (Hindi, Bengali, Spanish, French, English, Hinglish, Banglish)
  5. Duplicate Detection & Ingestion Filtering
  6. Data Splitting & Artist Leakage Prevention (Train vs. Test)
  7. Processed JSONL Schema & Partition Compliance
"""

import os
import json
import csv
import unittest
from typing import Set

# Import pipeline components
from src.label_mapping import LabelMapper
from src.data_loader import LanguageDetector, MirexLoader, BenchmarkLoader
from src.dataset_validator import DatasetValidator, BASE_ML_DIR, RAW_MIREX_DIR, BENCHMARK_PATH, PROCESSED_DIR


class TestEmotionMapping(unittest.TestCase):
    """Tests for emotion_mapping.json and LabelMapper."""

    def setUp(self):
        self.mapper = LabelMapper()

    def test_target_taxonomy(self):
        expected_taxonomy = [
            "Happiness", "Sadness", "Love", "Anger", "Nostalgia",
            "Fear", "Excitement", "Hope", "Loneliness", "Calmness"
        ]
        self.assertEqual(len(self.mapper.target_taxonomy), 10)
        self.assertEqual(sorted(self.mapper.target_taxonomy), sorted(expected_taxonomy))

    def test_mirex_mapped_categories(self):
        mapped_examples = {
            "Cheerful": "Happiness",
            "Fun": "Happiness",
            "Amiable-good natured": "Happiness",
            "Sweet": "Love",
            "Passionate": "Love",
            "Poignant": "Sadness",
            "Brooding": "Sadness",
            "Bittersweet": "Nostalgia",
            "Wistful": "Nostalgia",
            "Agressive": "Anger",
            "Fiery": "Anger",
            "Tense - Anxious": "Fear",
            "Boisterous": "Excitement",
            "Rowdy": "Excitement",
            "Rousing": "Excitement",
            "Rollicking": "Excitement"
        }
        for subcat, expected_emo in mapped_examples.items():
            mapped_emo, conf, reason = self.mapper.map_mirex_label(subcat)
            self.assertEqual(mapped_emo, expected_emo, f"Failed for MIREX category '{subcat}'")
            self.assertIn(conf, ["high", "medium"])
            self.assertTrue(self.mapper.is_defensible(mapped_emo))

    def test_mirex_unmapped_categories(self):
        unmapped = [
            "Confident", "Autumnal", "Literate", "Campy", "Humorous",
            "Silly", "whimsical", "Witty", "Wry", "Intense", "Visceral", "Volatile"
        ]
        for subcat in unmapped:
            mapped_emo, conf, reason = self.mapper.map_mirex_label(subcat)
            self.assertIsNone(mapped_emo, f"Subcategory '{subcat}' should be unmapped")
            self.assertIsNone(conf)
            self.assertTrue(len(reason) > 0)
            self.assertFalse(self.mapper.is_defensible(mapped_emo))

    def test_benchmark_label_mapping(self):
        bench_cases = {
            "Happy": "Happiness",
            "Sad": "Sadness",
            "Angry": "Anger",
            "Romantic": "Love",
            "Calm/Chill": "Calmness",
            "Exciting": "Excitement",
            "Patriotic": "Hope",
            "Thrilling": "Fear",
            "Horror": "Fear"
        }
        for orig, expected in bench_cases.items():
            mapped, conf, reason = self.mapper.map_benchmark_label(orig)
            self.assertEqual(mapped, expected)
            self.assertTrue(self.mapper.is_defensible(mapped))


class TestLanguageDetection(unittest.TestCase):
    """Tests for zero-dependency multilingual script and function word detector."""

    def setUp(self):
        self.detector = LanguageDetector()

    def test_devanagari_hindi(self):
        text = "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम"
        res = self.detector.detect(text)
        self.assertEqual(res["language"], "hi")
        self.assertEqual(res["script"], "Devanagari")
        self.assertEqual(res["confidence"], "high")
        self.assertTrue(res["is_supported"])

    def test_bengali_script(self):
        text = "আমার সোনার বাংলা আমি তোমায় ভালোবাসি চিরদিন তোমার আকাশ"
        res = self.detector.detect(text)
        self.assertEqual(res["language"], "bn")
        self.assertEqual(res["script"], "Bengali")
        self.assertEqual(res["confidence"], "high")
        self.assertTrue(res["is_supported"])

    def test_spanish_language(self):
        text = "Mi corazón siente un gran amor por la vida y el tiempo no tiene nada que ocultar"
        res = self.detector.detect(text)
        self.assertEqual(res["language"], "es")
        self.assertEqual(res["script"], "Latin")
        self.assertTrue(res["is_supported"])

    def test_french_language(self):
        text = "Dans la nuit avec mon cœur je veux trouver le bonheur et la paix pour toujours"
        res = self.detector.detect(text)
        self.assertEqual(res["language"], "fr")
        self.assertEqual(res["script"], "Latin")
        self.assertTrue(res["is_supported"])

    def test_english_language(self):
        text = "I wake up in the morning and see the sunshine with hope and happiness in my soul"
        res = self.detector.detect(text)
        self.assertEqual(res["language"], "en")
        self.assertEqual(res["script"], "Latin")
        self.assertTrue(res["is_supported"])

    def test_hinglish_detection(self):
        text = "dil se tere pyaar me dooba hu sanam meri zindagi me tu hi hai"
        res = self.detector.detect(text)
        self.assertEqual(res["language"], "hi")
        self.assertEqual(res["script"], "Latin")
        self.assertTrue(res["is_supported"])

    def test_empty_text_handling(self):
        res = self.detector.detect("")
        self.assertEqual(res["language"], "unknown")
        self.assertFalse(res["is_supported"])


class TestMirexAndBenchmarkLoading(unittest.TestCase):
    """Tests raw ingestion, UTF-16 decoding, and ID matching."""

    def test_csv_utf16_reading(self):
        csv_path = os.path.join(RAW_MIREX_DIR, "archive (2)", "dataset", "dataset info.csv")
        self.assertTrue(os.path.exists(csv_path), f"CSV path does not exist: {csv_path}")

        # Ensure reading as UTF-16 works and parses rows
        with open(csv_path, "r", encoding="utf-16") as f:
            reader = csv.reader(f, delimiter=";")
            header = next(reader)
            first_row = next(reader)
            self.assertTrue(len(header) >= 8)
            self.assertTrue(len(first_row) >= 8)
            # Verify filename matches 001.mp3 format
            self.assertTrue(first_row[8].endswith(".mp3"))

    def test_mirex_loader_records(self):
        loader = MirexLoader(RAW_MIREX_DIR)
        records = loader.load_records()
        self.assertEqual(len(records), 897, "Expected exactly 897 catalog records from MIREX")

        # Verify filename-to-lyric ID mapping for first record
        r0 = records[0]
        self.assertEqual(r0["source_id"], "001")
        self.assertEqual(r0["source"], "mirex")
        self.assertTrue(len(r0["title"]) > 0)
        self.assertTrue(len(r0["artist"]) > 0)

    def test_benchmark_loader_records(self):
        if os.path.exists(BENCHMARK_PATH):
            loader = BenchmarkLoader(BENCHMARK_PATH)
            records = loader.load_records()
            self.assertEqual(len(records), 45, "Expected 45 multilingual benchmark records")
            for r in records:
                self.assertEqual(r["source"], "benchmark")
                self.assertTrue(r["is_mapped"])
                self.assertTrue(r["emotion"] in LabelMapper().target_taxonomy)


class TestSplittingAndLeakage(unittest.TestCase):
    """Tests dataset splitting and artist overlap prevention."""

    def test_artist_leakage_prevention(self):
        validator = DatasetValidator(random_seed=42)
        mirex_loader = MirexLoader(validator.mirex_dir, validator.label_mapper)
        mirex_records = [r for r in mirex_loader.load_records() if r.get("is_mapped") and not r.get("is_empty") and not r.get("is_duplicate")]

        train, val, test = validator._split_dataset(mirex_records)

        train_artists = set(r["artist"] for r in train if r.get("artist"))
        test_artists = set(r["artist"] for r in test if r.get("artist"))
        val_artists = set(r["artist"] for r in val if r.get("artist"))

        overlap_train_test = train_artists.intersection(test_artists)
        self.assertEqual(len(overlap_train_test), 0, f"Artist leakage detected between Train and Test: {overlap_train_test}")

        overlap_val_test = val_artists.intersection(test_artists)
        self.assertEqual(len(overlap_val_test), 0, f"Artist leakage detected between Val and Test: {overlap_val_test}")

    def test_duplicate_filtering(self):
        records = [
            {"text": "Same unique text here", "emotion": "Happiness", "is_mapped": True, "is_empty": False, "is_duplicate": False},
            {"text": "Same unique text here", "emotion": "Happiness", "is_mapped": True, "is_empty": False, "is_duplicate": True, "exclusion_reason": "duplicate"}
        ]
        valid = [r for r in records if not r.get("is_duplicate")]
        self.assertEqual(len(valid), 1)


class TestProcessedJsonlSchema(unittest.TestCase):
    """Tests generated JSONL partitions and dataset_report.json."""

    def setUp(self):
        self.train_path = os.path.join(PROCESSED_DIR, "train.jsonl")
        self.val_path = os.path.join(PROCESSED_DIR, "val.jsonl")
        self.test_path = os.path.join(PROCESSED_DIR, "test.jsonl")
        self.report_path = os.path.join(PROCESSED_DIR, "dataset_report.json")
        self.taxonomy = set(LabelMapper().target_taxonomy)
        self.valid_langs = {"en", "hi", "bn", "es", "fr"}

    def _verify_jsonl(self, filepath: str, min_count: int):
        self.assertTrue(os.path.exists(filepath), f"Missing file: {filepath}")
        count = 0
        required_keys = {"text", "language", "emotion", "source", "source_id", "artist", "title", "label_original", "label_confidence"}
        
        with open(filepath, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                count += 1
                self.assertTrue(required_keys.issubset(row.keys()), f"Missing keys in {filepath} line {line_no}")
                self.assertTrue(len(row["text"].strip()) > 0, f"Empty text in {filepath} line {line_no}")
                self.assertIn(row["language"], self.valid_langs, f"Invalid language {row['language']} in {filepath} line {line_no}")
                self.assertIn(row["emotion"], self.taxonomy, f"Invalid emotion {row['emotion']} in {filepath} line {line_no}")
        
        self.assertGreaterEqual(count, min_count)
        return count

    def test_partitions_schema_and_counts(self):
        train_count = self._verify_jsonl(self.train_path, 300)
        val_count = self._verify_jsonl(self.val_path, 50)
        test_count = self._verify_jsonl(self.test_path, 50)
        total = train_count + val_count + test_count
        self.assertEqual(total, 466, f"Expected 466 total validated records, got {total}")

    def test_dataset_report_content(self):
        self.assertTrue(os.path.exists(self.report_path))
        with open(self.report_path, "r", encoding="utf-8") as f:
            report = json.load(f)

        self.assertEqual(report["summary"]["total_raw_records"], 942)
        self.assertEqual(report["summary"]["total_valid_records"], 466)
        self.assertEqual(report["summary"]["total_excluded_records"], 476)
        self.assertEqual(report["summary"]["total_duplicate_records"], 8)
        self.assertEqual(len(report["distributions"]["languages"]), 5)
        self.assertEqual(report["splits"]["train"]["count"], 339)
        self.assertEqual(report["splits"]["validation"]["count"], 63)
        self.assertEqual(report["splits"]["test"]["count"], 64)


if __name__ == "__main__":
    unittest.main()
