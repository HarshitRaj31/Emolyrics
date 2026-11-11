"""
Automated Test Suite for Stage 6:
Multilingual Model Accuracy & Code-Switching Improvements.

Tests:
  1. Code-Switching Detection (Hinglish, Banglish, Spanglish, Franglish, Mixed Scripts)
  2. Lyric Normalization (Character elongation, slang, whitespace, diacritics preservation)
  3. Confidence Calibration & Temperature Scaling (T=1.0295, ECE calculation, reliability bins)
  4. Uncertainty Estimation (Confidence margin, normalized Shannon entropy, isUncertain triggers)
  5. Multi-line Code-Switching & Line-Level Uncertainty Integration
  6. FastAPI /predict & /predict-lines Stage 6 Endpoints Validation
"""

import os
import sys
import unittest
import numpy as np
import torch
from fastapi.testclient import TestClient

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(TEST_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.api import (
    app,
    get_predictor,
    predict_emotion,
    predict_lines_endpoint,
    PredictRequest,
    PredictLinesRequest
)
from src.code_switch import (
    CodeSwitchAnalyzer,
    normalize_lyric_text,
    get_code_switch_analyzer
)
from src.calibration import (
    compute_ece,
    TemperatureScaler,
    assess_prediction_uncertainty
)
from src.embedding_manager import TARGET_TAXONOMY


class TestStage6CodeSwitchingAndCalibration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = get_predictor()
        cls.cs_analyzer = get_code_switch_analyzer()
        cls.client = TestClient(app)

    # =========================================================================
    # 1. CODE-SWITCHING DETECTION & SCRIPT BREAKDOWN
    # =========================================================================
    def test_01_monolingual_script_detection(self):
        """Pure native scripts should detect single language without code-switching."""
        # Devanagari Hindi
        hi_res = self.cs_analyzer.analyze("तू प्यार का सागर है तेरी एक बूंद के प्यासे हम")
        self.assertFalse(hi_res["isCodeSwitched"])
        self.assertEqual(hi_res["primaryLanguage"], "hi")
        self.assertIn("Devanagari", hi_res["scriptBreakdown"])

        # Bengali Script
        bn_res = self.cs_analyzer.analyze("যদি তোর ডাক শুনে কেউ না আসে তবে একলা চলো রে")
        self.assertFalse(bn_res["isCodeSwitched"])
        self.assertEqual(bn_res["primaryLanguage"], "bn")
        self.assertIn("Bengali", bn_res["scriptBreakdown"])

        # English
        en_res = self.cs_analyzer.analyze("I am dancing under the shining stars tonight with happiness")
        self.assertFalse(en_res["isCodeSwitched"])
        self.assertEqual(en_res["primaryLanguage"], "en")

    def test_02_hinglish_code_switching(self):
        """Hinglish mixing Romanized Hindi tokens with English."""
        hinglish_sample = "Tum mere saath chalo, baby I really love you and want you"
        res = self.cs_analyzer.analyze(hinglish_sample)
        self.assertTrue(res["isCodeSwitched"])
        self.assertIn("Hinglish", res["codeSwitchType"])
        self.assertIn("hi", res["languageDistribution"])
        self.assertIn("en", res["languageDistribution"])

    def test_03_banglish_code_switching(self):
        """Banglish mixing Romanized Bengali tokens with English."""
        banglish_sample = "Amar moner kotha shuno, you are my forever dream and my heart"
        res = self.cs_analyzer.analyze(banglish_sample)
        self.assertTrue(res["isCodeSwitched"])
        self.assertIn("Banglish", res["codeSwitchType"])
        self.assertIn("bn", res["languageDistribution"])
        self.assertIn("en", res["languageDistribution"])

    def test_04_spanglish_and_franglish_code_switching(self):
        """Spanglish and Franglish code-switching."""
        spanglish_sample = "Bailando en la fiesta all night long with my amigos"
        sp_res = self.cs_analyzer.analyze(spanglish_sample)
        self.assertTrue(sp_res["isCodeSwitched"])
        self.assertIn("Spanglish", sp_res["codeSwitchType"])

        franglish_sample = "C'est la vie forever, with love and joie in my heart"
        fr_res = self.cs_analyzer.analyze(franglish_sample)
        self.assertTrue(fr_res["isCodeSwitched"])
        self.assertIn("Franglish", fr_res["codeSwitchType"])

    def test_05_mixed_script_detection(self):
        """Mixed Latin and Devanagari script in the same lyric."""
        mixed_sample = "तू प्यार का सागर है, but I will love you anyway"
        res = self.cs_analyzer.analyze(mixed_sample)
        self.assertTrue(res["isCodeSwitched"])
        self.assertIn("Mixed Script", res["codeSwitchType"])
        self.assertIn("Latin", res["scriptBreakdown"])
        self.assertIn("Devanagari", res["scriptBreakdown"])

    # =========================================================================
    # 2. LYRIC NORMALIZATION
    # =========================================================================
    def test_06_elongation_and_slang_normalization(self):
        """Compress excessive elongation while preserving diacritics and native chars."""
        raw_text = "I am  soooooo   happppyyy   tonighttt  !!!"
        norm_text = normalize_lyric_text(raw_text)
        self.assertNotIn("soooooo", norm_text)
        self.assertNotIn("happppyyy", norm_text)
        self.assertEqual(norm_text, "I am soo happyy tonightt !!")

        # Preservation of Spanish and French diacritics
        fr_text = "C'est un été magnifique à côté de la mer"
        norm_fr = normalize_lyric_text(fr_text)
        self.assertIn("été", norm_fr)
        self.assertIn("côté", norm_fr)

    # =========================================================================
    # 3. CONFIDENCE CALIBRATION & TEMPERATURE SCALING
    # =========================================================================
    def test_07_temperature_scaling_mechanics(self):
        """Temperature scaling with T > 1 softens overconfident logit distributions."""
        scaler = TemperatureScaler(temperature=1.0295)
        raw_logits = torch.tensor([[4.0, 1.0, 0.5, -1.0, 0.0]])
        raw_probs = torch.softmax(raw_logits, dim=-1).squeeze().numpy()
        cal_probs = scaler.scale_probs(raw_probs)

        # Max probability should be slightly softened (less overconfident)
        self.assertLessEqual(np.max(cal_probs), np.max(raw_probs))
        # Total sum must remain 1.0
        self.assertAlmostEqual(float(np.sum(cal_probs)), 1.0, places=5)

    def test_08_ece_computation(self):
        """ECE function calculates positive error bounded in [0, 1]."""
        probs = np.array([
            [0.9, 0.1],
            [0.8, 0.2],
            [0.4, 0.6],
            [0.3, 0.7]
        ])
        targets = np.array([0, 0, 1, 1])
        ece, bins_dict = compute_ece(probs, targets, n_bins=5)
        self.assertGreaterEqual(ece, 0.0)
        self.assertLessEqual(ece, 1.0)
        self.assertIn("bins", bins_dict)

    # =========================================================================
    # 4. UNCERTAINTY ESTIMATION
    # =========================================================================
    def test_09_uncertainty_assessment_high_margin(self):
        """Dominant probability distribution should not trigger high uncertainty."""
        confident_dist = {
            "Happiness": 0.85,
            "Excitement": 0.05,
            "Sadness": 0.02,
            "Love": 0.02,
            "Anger": 0.01,
            "Fear": 0.01,
            "Nostalgia": 0.01,
            "Hope": 0.01,
            "Loneliness": 0.01,
            "Calmness": 0.01
        }
        unc = assess_prediction_uncertainty(confident_dist)
        self.assertFalse(unc["is_uncertain"])
        self.assertGreater(unc["margin"], 0.7)
        self.assertLess(unc["entropy"], 0.6)

    def test_10_uncertainty_assessment_narrow_margin(self):
        """Nearly tied probabilities should trigger is_uncertain."""
        tied_dist = {
            "Happiness": 0.36,
            "Excitement": 0.33,
            "Hope": 0.10,
            "Love": 0.08,
            "Sadness": 0.03,
            "Calmness": 0.03,
            "Nostalgia": 0.02,
            "Anger": 0.02,
            "Fear": 0.02,
            "Loneliness": 0.01
        }
        unc = assess_prediction_uncertainty(tied_dist)
        self.assertTrue(unc["is_uncertain"])
        self.assertLess(unc["margin"], 0.10)
        self.assertIn("margin", unc["warning_reason"].lower())

    # =========================================================================
    # 5. PREDICTOR INTEGRATION WITH STAGE 6 FIELDS
    # =========================================================================
    def test_11_predictor_single_sample_stage6_fields(self):
        """Single sample prediction returns all calibrated Stage 6 fields."""
        text = "Tum mere bina kya karoge baby you are my shining light"
        res = self.predictor.predict(text)

        # Basic fields
        self.assertIn(res["primary_emotion"], TARGET_TAXONOMY)
        self.assertIsInstance(res["confidence"], float)

        # Stage 6 Code-Switching Fields
        self.assertIn("is_code_switched", res)
        self.assertTrue(res["is_code_switched"])
        self.assertIn("Hinglish", res["code_switch_type"])
        self.assertIn("script_breakdown", res)
        self.assertIn("language_distribution", res)

        # Stage 6 Calibration & Uncertainty Fields
        self.assertIn("is_uncertain", res)
        self.assertIn("uncertainty_details", res)
        self.assertIn("temperature", res)
        self.assertAlmostEqual(res["temperature"], 1.0295, places=3)

    def test_12_predictor_line_by_line_stage6_fields(self):
        """Line-by-line prediction propagates code-switching and uncertainty per line."""
        lines = [
            "[Verse 1]",
            "Dil chahta hai ki hum hamesha saath rahe baby",  # Hinglish
            "Tears fall like rain in the cold dark night",     # English Sadness
            "Amar moner kotha bolte chaina baby you are my world", # Banglish
        ]
        results = self.predictor.predict_lines(lines, context_window=1)
        self.assertEqual(len(results), 4)

        # Verse header
        self.assertTrue(results[0]["isSectionHeader"])

        # Line 2 (Hinglish)
        self.assertTrue(results[1]["isCodeSwitched"])
        self.assertIn("Hinglish", results[1]["codeSwitchType"])
        self.assertIn("isUncertain", results[1])
        self.assertIn("uncertaintyDetails", results[1])

        # Line 3 (English)
        self.assertFalse(results[2]["isCodeSwitched"])
        self.assertEqual(results[2]["language"], "en")

        # Line 4 (Banglish)
        self.assertTrue(results[3]["isCodeSwitched"])
        self.assertIn("Banglish", results[3]["codeSwitchType"])

    # =========================================================================
    # 6. FASTAPI ENDPOINTS STAGE 6 SCHEMA VALIDATION
    # =========================================================================
    def test_13_fastapi_predict_stage6_schema(self):
        """FastAPI /predict endpoint outputs calibrated schema with camelCase fields."""
        req = PredictRequest(text="Bailando en la playa with you every night and day")
        data = predict_emotion(req)

        self.assertIn("primaryEmotion", data)
        self.assertIn("confidence", data)
        self.assertIn("probabilities", data)
        self.assertIn("isCodeSwitched", data)
        self.assertTrue(data["isCodeSwitched"])
        self.assertIn("Spanglish", data["codeSwitchType"])
        self.assertIn("scriptBreakdown", data)
        self.assertIn("languageDistribution", data)
        self.assertIn("isUncertain", data)
        self.assertIn("uncertaintyDetails", data)
        self.assertIn("temperature", data)

    def test_14_fastapi_predict_lines_stage6_schema(self):
        """FastAPI /predict-lines endpoint outputs code-switching and uncertainty per line."""
        req = PredictLinesRequest(
            lines=[
                "C'est la vie forever, with love and joie in my heart",
                "Darkness surrounds my broken heart and I weep"
            ],
            contextWindow=1
        )
        data = predict_lines_endpoint(req)

        self.assertIn("lines", data)
        self.assertEqual(len(data["lines"]), 2)
        line0 = data["lines"][0]
        self.assertTrue(line0["isCodeSwitched"])
        self.assertIn("Franglish", line0["codeSwitchType"])
        self.assertIn("isUncertain", line0)
        self.assertIn("uncertaintyDetails", line0)


if __name__ == "__main__":
    unittest.main(verbosity=2)

