"""
Automated Unit and Integration Test Suite for Stage 2:
Multilingual Dataset Acquisition, License Audit & Integration.

Tests:
  1. Manifest & License Metadata Integrity
  2. Dataset Loaders & Domain Tagging (GoEmotions, XED, BEmoC, Hindi Corpus)
  3. Defensible Emotion Mapping (Positive & Negative Constraints)
  4. Language & Script Validation
  5. Domain Separation (Lyrics vs. Social Media vs. General Text)
  6. Partitioning, Artist Leakage & Deduplication
  7. Combined JSONL Canonical Schema Compliance
  8. Combined Dataset Report Statistics
"""

import os
import json
import unittest

from src.label_mapping import LabelMapper
from src.data_loader import (
    LanguageDetector,
    MirexLoader,
    BenchmarkLoader,
    GoEmotionsLoader,
    XEDLoader,
    BEmoCLoader,
    HindiCorpusLoader
)
from src.stage2_integrator import Stage2Integrator, RAW_DIR, PROCESSED_DIR
from src.acquire_datasets import MANIFEST_PATH


class TestDatasetManifest(unittest.TestCase):
    """Validates dataset manifest, license tracking, and manual download instructions."""

    def test_manifest_existence_and_keys(self):
        self.assertTrue(os.path.exists(MANIFEST_PATH), f"Manifest missing at {MANIFEST_PATH}")
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        self.assertIn("datasets", manifest)
        self.assertIn("gated_datasets_audit", manifest)

        required_datasets = ["mirex", "benchmark", "goemotions", "xed", "bemoc", "hindi_corpus"]
        for ds in required_datasets:
            self.assertIn(ds, manifest["datasets"], f"Missing dataset in manifest: {ds}")
            meta = manifest["datasets"][ds]
            self.assertIn("license", meta)
            self.assertIn("commercial_use", meta)
            self.assertIn("redistribution", meta)
            self.assertIn("domain", meta)
            self.assertIn("supported_languages", meta)
            self.assertTrue(len(meta["supported_languages"]) > 0)

    def test_gated_datasets_audit(self):
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        gated = manifest.get("gated_datasets_audit", {})
        self.assertIn("iitp_emoinhindi", gated)
        self.assertIn("bhaav", gated)
        self.assertIn("emoevales", gated)
        for ds_key, data in gated.items():
            self.assertIn("manual_instructions", data)
            self.assertTrue(len(data["manual_instructions"]) > 10)


class TestDatasetLoadersAndDomains(unittest.TestCase):
    """Verifies each approved dataset loader and its domain tagging."""

    def setUp(self):
        self.mapper = LabelMapper()

    def test_goemotions_loader(self):
        loader = GoEmotionsLoader(os.path.join(RAW_DIR, "goemotions"), self.mapper)
        records = loader.load_records()
        self.assertGreater(len(records), 1000)
        sample = records[0]
        self.assertEqual(sample["source"], "goemotions")
        self.assertEqual(sample["domain"], "social_media")
        self.assertEqual(sample["language"], "en")
        self.assertIn("text", sample)

    def test_xed_loader(self):
        loader = XEDLoader(os.path.join(RAW_DIR, "xed"), self.mapper)
        records = loader.load_records()
        self.assertGreater(len(records), 5000)
        langs = set(r["language"] for r in records)
        self.assertIn("fr", langs)
        self.assertIn("es", langs)
        for r in records[:50]:
            self.assertEqual(r["source"], "xed")
            self.assertEqual(r["domain"], "general_text")

    def test_bemoc_loader(self):
        loader = BEmoCLoader(os.path.join(RAW_DIR, "bemoc"), self.mapper)
        records = loader.load_records()
        self.assertGreater(len(records), 5000)
        sample = records[0]
        self.assertEqual(sample["source"], "bemoc")
        self.assertEqual(sample["domain"], "general_text")
        self.assertEqual(sample["language"], "bn")

    def test_hindi_corpus_loader(self):
        loader = HindiCorpusLoader(os.path.join(RAW_DIR, "hindi_corpus"), self.mapper)
        records = loader.load_records()
        self.assertGreater(len(records), 300)
        for r in records[:50]:
            self.assertEqual(r["source"], "hindi_corpus")
            self.assertEqual(r["domain"], "general_text")
            self.assertEqual(r["language"], "hi")


class TestLabelMappingDefensibility(unittest.TestCase):
    """Verifies defensible mappings and strict negative mapping rules."""

    def setUp(self):
        self.mapper = LabelMapper()

    def test_positive_mappings(self):
        # Joy -> Happiness
        self.assertEqual(self.mapper.map_goemotions_label("joy")[0], "Happiness")
        self.assertEqual(self.mapper.map_bemoc_label("joy")[0], "Happiness")
        self.assertEqual(self.mapper.map_hindi_corpus_label("happy")[0], "Happiness")
        self.assertEqual(self.mapper.map_xed_label("5")[0], "Happiness")

        # Sadness -> Sadness
        self.assertEqual(self.mapper.map_goemotions_label("sadness")[0], "Sadness")
        self.assertEqual(self.mapper.map_bemoc_label("sadness")[0], "Sadness")
        self.assertEqual(self.mapper.map_hindi_corpus_label("sad")[0], "Sadness")
        self.assertEqual(self.mapper.map_xed_label("6")[0], "Sadness")

        # Anger -> Anger
        self.assertEqual(self.mapper.map_goemotions_label("anger")[0], "Anger")
        self.assertEqual(self.mapper.map_bemoc_label("anger")[0], "Anger")
        self.assertEqual(self.mapper.map_hindi_corpus_label("angry")[0], "Anger")
        self.assertEqual(self.mapper.map_xed_label("1")[0], "Anger")

        # Fear -> Fear
        self.assertEqual(self.mapper.map_goemotions_label("fear")[0], "Fear")
        self.assertEqual(self.mapper.map_bemoc_label("fear")[0], "Fear")
        self.assertEqual(self.mapper.map_xed_label("4")[0], "Fear")

    def test_strict_negative_constraints(self):
        # 1. Do NOT map neutral to calmness!
        self.assertIsNone(self.mapper.map_goemotions_label("neutral")[0])
        self.assertIsNone(self.mapper.map_hindi_corpus_label("neutral")[0])
        self.assertIsNone(self.mapper.map_bhaav_label("neutral")[0])
        self.assertIsNone(self.mapper.map_xed_label("0")[0])

        # 2. Do NOT map surprise automatically to excitement!
        self.assertIsNone(self.mapper.map_goemotions_label("surprise")[0])
        self.assertIsNone(self.mapper.map_bemoc_label("surprise")[0])
        self.assertIsNone(self.mapper.map_xed_label("7")[0])

        # 3. Disgust is not in the 10 target emotions
        self.assertIsNone(self.mapper.map_goemotions_label("disgust")[0])
        self.assertIsNone(self.mapper.map_bemoc_label("disgust")[0])
        self.assertIsNone(self.mapper.map_xed_label("3")[0])


class TestDomainSeparation(unittest.TestCase):
    """Ensures domain distinction is preserved across records."""

    def test_domain_fields(self):
        train_path = os.path.join(PROCESSED_DIR, "train_combined.jsonl")
        domains_found = set()
        with open(train_path, "r", encoding="utf-8") as f:
            for line in f:
                row = json.loads(line)
                domains_found.add(row.get("domain"))

        self.assertIn("lyrics", domains_found)
        self.assertIn("social_media", domains_found)
        self.assertIn("general_text", domains_found)


class TestCombinedPartitionsAndSchema(unittest.TestCase):
    """Tests generated combined JSONL partitions and canonical schema."""

    def setUp(self):
        self.train_path = os.path.join(PROCESSED_DIR, "train_combined.jsonl")
        self.val_path = os.path.join(PROCESSED_DIR, "val_combined.jsonl")
        self.test_path = os.path.join(PROCESSED_DIR, "test_combined.jsonl")
        self.report_path = os.path.join(PROCESSED_DIR, "combined_dataset_report.json")
        self.valid_langs = {"en", "hi", "bn", "es", "fr"}
        self.valid_domains = {"lyrics", "social_media", "general_text"}
        self.taxonomy = set(LabelMapper().target_taxonomy)
        self.required_keys = {
            "text", "language", "emotion", "source", "source_id",
            "artist", "title", "label_original", "domain", "label_confidence"
        }

    def _verify_partition(self, filepath: str) -> int:
        self.assertTrue(os.path.exists(filepath), f"File missing: {filepath}")
        count = 0
        with open(filepath, "r", encoding="utf-8") as f:
            for line_no, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                row = json.loads(line)
                count += 1
                self.assertTrue(self.required_keys.issubset(row.keys()), f"Missing keys in {filepath} line {line_no}")
                self.assertTrue(len(row["text"].strip()) > 0, f"Empty text in {filepath} line {line_no}")
                self.assertIn(row["language"], self.valid_langs)
                self.assertIn(row["emotion"], self.taxonomy)
                self.assertIn(row["domain"], self.valid_domains)
        return count

    def test_partition_counts_and_leakage(self):
        train_count = self._verify_partition(self.train_path)
        val_count = self._verify_partition(self.val_path)
        test_count = self._verify_partition(self.test_path)
        total = train_count + val_count + test_count

        self.assertEqual(total, 3290)
        self.assertGreaterEqual(train_count, 2200)
        self.assertGreaterEqual(val_count, 400)
        self.assertGreaterEqual(test_count, 400)

        # Verify zero artist leakage in lyrics
        train_artists = set()
        test_artists = set()
        with open(self.train_path, "r", encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                if r.get("domain") == "lyrics" and r.get("artist"):
                    train_artists.add(r["artist"])

        with open(self.test_path, "r", encoding="utf-8") as f:
            for line in f:
                r = json.loads(line)
                if r.get("domain") == "lyrics" and r.get("artist"):
                    test_artists.add(r["artist"])

        overlap = train_artists.intersection(test_artists)
        self.assertEqual(len(overlap), 0, f"Artist leakage in lyrics: {overlap}")

    def test_combined_report_content(self):
        self.assertTrue(os.path.exists(self.report_path))
        with open(self.report_path, "r", encoding="utf-8") as f:
            report = json.load(f)

        self.assertEqual(report["summary"]["total_raw_audited"], 32742)
        self.assertEqual(report["summary"]["total_integrated_samples"], 3290)
        self.assertEqual(report["summary"]["target_languages_covered"], 5)
        self.assertEqual(len(report["distributions"]["languages"]), 5)
        self.assertEqual(len(report["distributions"]["domains"]), 3)
        self.assertEqual(report["leakage_verification"]["artist_leakage_in_lyrics"], 0)


if __name__ == "__main__":
    unittest.main()
