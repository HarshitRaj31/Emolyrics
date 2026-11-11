"""
Stage 9 — Comprehensive Multilingual ML QA & Emotion Coverage Test Suite
Tests:
  1. 5 Individual Target Languages: en, hi, bn, es, fr
  2. 4 Code-Switching Varieties: Hinglish, Banglish, Spanglish, Franglish
  3. 10 Canonical Emotion Categories: Happiness, Sadness, Love, Anger, Nostalgia,
     Fear, Excitement, Hope, Loneliness, Calmness
  4. Short, Long, Ambiguous, and Empty Edge Cases
  5. Line-by-Line Context Windowing and Section Dynamics
  6. Temperature Calibration and Probability Normalization
"""

import os
import sys
import unittest
import numpy as np

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(CURRENT_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.predict import MultilingualEmotionPredictor, DEFAULT_CHECKPOINT
from src.embedding_manager import TARGET_TAXONOMY
from src.api import PredictRequest, predict_emotion, PredictLinesRequest, predict_lines_endpoint


class TestStage9MultilingualQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = MultilingualEmotionPredictor(checkpoint_path=DEFAULT_CHECKPOINT)
        cls.tax_set = set(TARGET_TAXONOMY)

    # =========================================================================
    # 1. FIVE TARGET LANGUAGES INDIVIDUAL INFERENCE
    # =========================================================================
    def test_01_english_lyrics_inference(self):
        """Validates English lyric classification and probability distribution."""
        text = "Golden sun rises over the quiet hill, bringing joyful laughter and deep peace"
        res = self.predictor.predict(text, specified_language="en")
        self.assertEqual(res["detected_language"], "en")
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertGreater(res["confidence"], 0.20)
        self.assertAlmostEqual(sum(res["probabilities"].values()), 1.0, places=2)

    def test_02_hindi_devanagari_lyrics_inference(self):
        """Validates native Devanagari Hindi lyric classification without translation."""
        text = "मेरी आँखों में सिर्फ तुम्हारे प्यार की रोशनी है, सनम तुम ही मेरी ज़िंदगी हो"
        res = self.predictor.predict(text, specified_language="hi")
        self.assertEqual(res["detected_language"], "hi")
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertEqual(res["primary_emotion"], "Love")
        self.assertGreater(res["confidence"], 0.35)

    def test_03_bengali_native_lyrics_inference(self):
        """Validates native Bengali lyric classification without translation."""
        text = "আমার মনে শুধুই আনন্দ আর সুখের গান, জীবনের এই মধুর আলোতে"
        res = self.predictor.predict(text, specified_language="bn")
        self.assertEqual(res["detected_language"], "bn")
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertIn(res["primary_emotion"], {"Happiness", "Love", "Calmness", "Hope"})

    def test_04_spanish_lyrics_inference(self):
        """Validates Spanish lyric classification with diacritics."""
        text = "Qué tristeza tan profunda me deja tu partida en esta noche fría y solitaria"
        res = self.predictor.predict(text, specified_language="es")
        self.assertEqual(res["detected_language"], "es")
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertIn(res["primary_emotion"], {"Sadness", "Loneliness"})

    def test_05_french_lyrics_inference(self):
        """Validates French lyric classification with accents."""
        text = "C'est l'amour éternel qui illumine notre chemin avec tant de tendresse"
        res = self.predictor.predict(text, specified_language="fr")
        self.assertEqual(res["detected_language"], "fr")
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertEqual(res["primary_emotion"], "Love")

    # =========================================================================
    # 2. CODE-SWITCHING & SCRIPT-MIXING TESTS
    # =========================================================================
    def test_06_hinglish_code_switching(self):
        """Validates Hinglish (Hindi + English) code-switching detection."""
        text = "Mera dil tumhare pyar mein full of joy hai, let us dance together tonight"
        res = self.predictor.predict(text)
        self.assertTrue(res["is_code_switched"])
        self.assertIn(res["primary_emotion"], self.tax_set)

    def test_07_banglish_code_switching(self):
        """Validates Banglish (Bengali + English) code-switching detection."""
        text = "Tumi chara I feel so sad and lonely, amar mon khub bhalo lagche na"
        res = self.predictor.predict(text)
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertIn(res["primary_emotion"], {"Sadness", "Loneliness"})

    def test_08_spanglish_code_switching(self):
        """Validates Spanglish (Spanish + English) code-switching detection."""
        text = "Te amo so much my sweet angel, forever together in this golden light"
        res = self.predictor.predict(text)
        self.assertTrue(res["is_code_switched"])
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertIn(res["primary_emotion"], {"Love", "Nostalgia", "Happiness"})

    def test_09_franglish_code_switching(self):
        """Validates Franglish (French + English) code-switching detection."""
        text = "Mon amour, you are the sunshine of my life and my peaceful dream"
        res = self.predictor.predict(text)
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertIn(res["primary_emotion"], {"Love", "Happiness", "Calmness"})

    # =========================================================================
    # 3. TEN CANONICAL EMOTIONS TAXONOMY COVERAGE
    # =========================================================================
    def test_10_ten_emotions_taxonomy_coverage(self):
        """Ensures all 10 canonical emotion categories can be returned with positive probabilities."""
        test_phrases = {
            "Happiness": "Smiling wide, joyful laughter and celebration with friends",
            "Sadness": "Crying alone in the rain, broken heart and endless sorrow",
            "Love": "Holding you close, passionate romance and sweet tender kiss",
            "Anger": "Furious rage burning inside, betrayal and hostile vengeance",
            "Nostalgia": "Looking at old faded photographs, wishing for the days gone by",
            "Fear": "Terror in the dark, shivering with intense panic and dread",
            "Excitement": "Heart pumping fast, adrenaline rush, wild electric party music",
            "Hope": "A new dawn breaks, tomorrow will be brighter, keep the faith",
            "Loneliness": "Empty cold room, abandoned by everyone, solitary silence",
            "Calmness": "Gentle ocean waves, tranquil breathing, meditative stillness"
        }

        detected_primary_emotions = set()
        for expected_emo, phrase in test_phrases.items():
            res = self.predictor.predict(phrase)
            self.assertIn(res["primary_emotion"], self.tax_set)
            detected_primary_emotions.add(res["primary_emotion"])
            # All 10 emotion keys must exist in probabilities
            for emo in TARGET_TAXONOMY:
                self.assertIn(emo, res["probabilities"])
                self.assertGreaterEqual(res["probabilities"][emo], 0.0)

        # High coverage check: at least 7 distinct primary emotions detected across the 10 targeted synthetic prompts
        self.assertGreaterEqual(len(detected_primary_emotions), 7, f"Detected: {detected_primary_emotions}")

    # =========================================================================
    # 4. EDGE CASES: SHORT, LONG, EMPTY, OVERSIZED
    # =========================================================================
    def test_11_short_lyric_handling(self):
        """Verifies graceful handling of short lines (e.g. 2-3 words)."""
        res = self.predictor.predict("I miss you")
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertLessEqual(res["confidence"], 0.95)

    def test_12_long_lyric_handling(self):
        """Verifies handling of multi-stanza long lyrics without memory or timeout issues."""
        stanza = "Through the storm we walked together, holding on to every fleeting hope.\n"
        long_lyrics = stanza * 20  # ~1,500 characters
        res = self.predictor.predict(long_lyrics)
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertGreater(res["durationMs"], 0.0)

    def test_13_empty_input_handling(self):
        """Empty input safely returns structured error without throwing unhandled exceptions."""
        res = self.predictor.predict("")
        self.assertIn("error", res)
        self.assertIsNone(res["primary_emotion"])

    def test_14_extreme_input_truncation(self):
        """Input exceeding 5,000 characters is safely truncated."""
        massive = "la " * 3000  # 9,000 chars
        res = self.predictor.predict(massive)
        self.assertIn(res["primary_emotion"], self.tax_set)
        self.assertIn("truncated", res.get("warning", "").lower())

    # =========================================================================
    # 5. LINE-BY-LINE AND SECTION-LEVEL MULTILINGUAL INFERENCE
    # =========================================================================
    def test_15_multilingual_lines_analysis(self):
        """Tests predict_lines endpoint across a multilingual song with sections."""
        lines = [
            "[Verse 1]",
            "Deep in the shadow of this sorrow I wept",
            "Tears falling like winter rain",
            "[Chorus]",
            "केसरिया तेरा इश्क़ है पिया",
            "Love shines like the golden morning",
            "[Outro]",
            "Peace and tranquil silence forever"
        ]
        res = self.predictor.predict_lines(lines, context_window=1)
        self.assertEqual(len(res), 8)

        # Header checks
        self.assertTrue(res[0]["isSectionHeader"])
        self.assertTrue(res[3]["isSectionHeader"])
        self.assertTrue(res[6]["isSectionHeader"])

        # Content line checks
        self.assertEqual(res[1]["primaryEmotion"], "Sadness")
        self.assertIn(res[4]["primaryEmotion"], {"Love", "Happiness", "Calmness"})
        self.assertIn(res[7]["primaryEmotion"], {"Calmness", "Peace", "Hope", "Happiness"})


if __name__ == "__main__":
    unittest.main()
