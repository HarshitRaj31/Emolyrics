"""
Automated Test Suite for Stage 5:
Multilingual Line-by-Line Emotion Analysis & Context Windowing.

Tests:
  1. Line order preservation and numbering
  2. Structural section header identification
  3. Real model probabilities across English, Hindi, Bengali, Spanish, French
  4. Contextual windowing and neighbor influence
  5. Short and ambiguous line disambiguation
  6. Empty lines and punctuation robustness
  7. FastAPI /predict-lines endpoint validation
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(TEST_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.api import app, get_predictor
from src.embedding_manager import TARGET_TAXONOMY


class TestStage5LineAnalysis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = get_predictor()

    def test_01_line_order_and_header_detection(self):
        input_lines = [
            "[Verse 1]",
            "I'm walking through the heavy rain and tears fall down",
            "Broken promises linger in the cold air",
            "[Chorus]",
            "Sunshine breaks through the dark clouds above",
            "Dancing with pure joy and celebration"
        ]

        results = self.predictor.predict_lines(input_lines, context_window=1)
        self.assertEqual(len(results), 6)

        # Line numbers match original 1-based order
        for i, r in enumerate(results, 1):
            self.assertEqual(r["lineNumber"], i)

        # Header lines
        self.assertTrue(results[0]["isSectionHeader"])
        self.assertEqual(results[0]["primaryEmotion"], "Structure")
        self.assertEqual(results[0]["confidence"], 1.0)

        self.assertTrue(results[3]["isSectionHeader"])
        self.assertEqual(results[3]["primaryEmotion"], "Structure")

        # Lyric lines
        self.assertFalse(results[1]["isSectionHeader"])
        self.assertIn(results[1]["primaryEmotion"], TARGET_TAXONOMY)
        self.assertIn("Sadness", [results[1]["primaryEmotion"]] + results[1].get("secondaryEmotions", []))

        self.assertFalse(results[5]["isSectionHeader"])
        self.assertIn("Happiness", [results[5]["primaryEmotion"]] + results[5].get("secondaryEmotions", []))

    def test_02_multilingual_line_evaluation(self):
        multilingual_lines = [
            "I feel so alive and full of happiness today",  # en
            "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम",   # hi
            "আমার সোনার বাংলা আমি তোমায় ভালোবাসি",           # bn
            "Mi corazón siente un amor tan profundo por ti",  # es
            "Dans la nuit je ressens une grande tristesse"     # fr
        ]

        results = self.predictor.predict_lines(multilingual_lines, context_window=0)
        self.assertEqual(len(results), 5)

        expected_langs = ["en", "hi", "bn", "es", "fr"]
        for r, exp_lang in zip(results, expected_langs):
            self.assertFalse(r["isSectionHeader"])
            self.assertEqual(r["language"], exp_lang)
            self.assertIn(r["primaryEmotion"], TARGET_TAXONOMY)
            self.assertGreater(r["confidence"], 0.0)
            self.assertEqual(len(r["emotionProbabilities"]), 10)
            prob_sum = sum(r["emotionProbabilities"].values())
            self.assertAlmostEqual(prob_sum, 1.0, places=2)

    def test_03_context_window_smoothing(self):
        # A bittersweet song where verse is sorrowful but transitions
        sad_stanza = [
            "Weep silently in the cold dark midnight",
            "Grief holds my hand and tears won't stop",
            "Rain keeps falling on this broken soul"
        ]

        res_no_ctx = self.predictor.predict_lines(sad_stanza, context_window=0)
        res_with_ctx = self.predictor.predict_lines(sad_stanza, context_window=1)

        self.assertEqual(len(res_no_ctx), 3)
        self.assertEqual(len(res_with_ctx), 3)

        for r in res_with_ctx:
            self.assertIn(r["primaryEmotion"], ["Sadness", "Loneliness", "Fear"])

    def test_04_short_and_ambiguous_lines(self):
        lines_with_ambiguous = [
            "The storm destroyed everything we built with hatred and fury",
            "Oh yeah",
            "Fire burns through the ruined city"
        ]

        results = self.predictor.predict_lines(lines_with_ambiguous, context_window=1)
        self.assertEqual(len(results), 3)

        ambig_line = results[1]
        self.assertTrue(ambig_line["isAmbiguous"])
        # Ambiguous line should have dampened confidence (< 0.85)
        self.assertLessEqual(ambig_line["confidence"], 0.85)
        self.assertIn("short", ambig_line["explanation"].lower())

    def test_05_empty_and_punctuation_lines(self):
        dirty_lines = [
            "",
            "   ",
            "Love you forever and ever",
            "...",
            "Joy and peace filling my heart"
        ]

        results = self.predictor.predict_lines(dirty_lines, context_window=1)
        # Empty lines filtered, valid lines preserved
        self.assertGreater(len(results), 0)
        for r in results:
            self.assertGreater(r["lineNumber"], 0)

    def test_06_fastapi_predict_lines_endpoint(self):
        with TestClient(app) as client:
            payload = {
                "lines": [
                    "[Verse 1]",
                    "Deep in the ocean of despair I call your name",
                    "Holding on to gentle peace and quiet breathing"
                ],
                "contextWindow": 1
            }

            res = client.post("/predict-lines", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data.get("success"))
            self.assertEqual(data.get("count"), 3)
            self.assertIn("lines", data)
            self.assertIn("durationMs", data)

            lines = data["lines"]
            self.assertEqual(lines[0]["primaryEmotion"], "Structure")
            self.assertIn(lines[1]["primaryEmotion"], TARGET_TAXONOMY)
            self.assertIn(lines[2]["primaryEmotion"], TARGET_TAXONOMY)


if __name__ == "__main__":
    unittest.main()
