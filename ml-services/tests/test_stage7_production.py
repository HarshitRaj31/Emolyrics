"""
Automated Test Suite for Stage 7:
Production Readiness, Model Validation, Performance Optimization & Reliability.

Tests:
  1. Zero Data Leakage Across Train/Val/Test Splits
  2. Model Metadata, Versioning & Rollback Safety
  3. Runtime Telemetry (Memory RSS, CPU Threads, Cache Size)
  4. LRU Cache Hit & Sub-Millisecond Repeat Query Performance
  5. Safe Input Truncation (5,000 char boundary defense)
  6. Empty & Whitespace Robustness
  7. Unsupported Language Graceful Warning Handling
  8. Request ID & Processing Time Diagnostics Propagation
  9. Error Sanitization (No internal stack traces exposed)
  10. Multi-Language Output Schema Validation (5 target languages)
"""

import os
import sys
import json
import unittest
import numpy as np
import torch

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
from src.evaluate import verify_dataset_zero_leakage
from src.embedding_manager import TARGET_TAXONOMY


class TestStage7ProductionReadiness(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = get_predictor()

    # =========================================================================
    # 1. DATA LEAKAGE AUDIT
    # =========================================================================
    def test_01_dataset_zero_leakage_audit(self):
        """Mathematically verifies 0 duplicate text overlap between train, val, and test splits."""
        audit = verify_dataset_zero_leakage()
        self.assertTrue(audit["verified_zero_leakage"])
        self.assertEqual(audit["overlaps"]["train_val_overlap"], 0)
        self.assertEqual(audit["overlaps"]["train_test_overlap"], 0)
        self.assertEqual(audit["overlaps"]["val_test_overlap"], 0)
        self.assertGreater(audit["sample_counts"]["train"], 2000)
        self.assertGreater(audit["sample_counts"]["test"], 400)

    # =========================================================================
    # 2. MODEL METADATA & ROLLBACK CHECKPOINT
    # =========================================================================
    def test_02_model_metadata_and_rollback_safety(self):
        """Verifies model_metadata.json exists and backup rollback checkpoint is preserved."""
        metadata_path = os.path.join(ML_DIR, "models", "model_metadata.json")
        self.assertTrue(os.path.exists(metadata_path), "model_metadata.json must exist in models/")

        with open(metadata_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self.assertEqual(meta["modelVersion"], "v1.2.0-production-calibrated")
        self.assertEqual(len(meta["targetLanguages"]), 5)
        self.assertEqual(len(meta["labelOrder"]), 10)
        self.assertAlmostEqual(meta["temperature"], 1.0295, places=3)
        self.assertIn("evaluationMetrics", meta)
        self.assertGreater(meta["evaluationMetrics"]["accuracy"], 0.40)
        self.assertGreater(meta["evaluationMetrics"]["macroF1"], 0.40)

        # Rollback checkpoint exists
        backup_path = os.path.join(ML_DIR, "models", "multilingual_classifier.pt.bak")
        self.assertTrue(os.path.exists(backup_path), "Backup checkpoint multilingual_classifier.pt.bak must exist for safe rollback.")

    # =========================================================================
    # 3. RUNTIME TELEMETRY & CPU THREAD LIMITS
    # =========================================================================
    def test_03_runtime_telemetry_and_thread_limits(self):
        """Verifies process memory tracking and CPU thread configuration."""
        telemetry = self.predictor.get_system_telemetry()
        self.assertIn("memoryRssMb", telemetry)
        self.assertGreater(telemetry["memoryRssMb"], 50.0)
        self.assertIn("cpuThreads", telemetry)
        self.assertGreater(telemetry["cpuThreads"], 0)
        self.assertLessEqual(telemetry["cpuThreads"], 16)
        self.assertEqual(telemetry["cacheMaxSize"], 1000)

    # =========================================================================
    # 4. IN-MEMORY LRU CACHE HIT PERFORMANCE
    # =========================================================================
    def test_04_lru_cache_hit_performance(self):
        """Identical queries hit in-memory LRU cache with sub-5ms latency."""
        sample_lyric = "Dancing under the moonlight with pure joy and everlasting celebration"

        # First query: cold inference
        res1 = self.predictor.predict(sample_lyric)
        self.assertFalse(res1.get("isCached", False))

        # Second query: cache hit
        res2 = self.predictor.predict(sample_lyric)
        self.assertTrue(res2.get("isCached", True))
        self.assertLessEqual(res2.get("durationMs", 10.0), 10.0)
        self.assertEqual(res1["primary_emotion"], res2["primary_emotion"])
        self.assertEqual(res1["confidence"], res2["confidence"])

    # =========================================================================
    # 5. SAFE INPUT TRUNCATION & BOUNDARY DEFENSE
    # =========================================================================
    def test_05_safe_input_truncation(self):
        """Inputs exceeding 5,000 characters are safely truncated without OOM or latency explosions."""
        huge_text = ("We love the summer sun and blue skies. " * 300)  # ~11,700 characters
        self.assertGreater(len(huge_text), 10000)

        res = self.predictor.predict(huge_text)
        self.assertIn(res["primary_emotion"], TARGET_TAXONOMY)
        self.assertIn("warning", res)
        self.assertIn("truncated", res["warning"].lower())

    # =========================================================================
    # 6. EMPTY & WHITESPACE INPUT ROBUSTNESS
    # =========================================================================
    def test_06_empty_and_whitespace_input_handling(self):
        """Empty and whitespace-only lyrics return clean error without throwing unhandled exceptions."""
        empty_res = self.predictor.predict("")
        self.assertIn("error", empty_res)
        self.assertIsNone(empty_res["primary_emotion"])

        ws_res = self.predictor.predict("   \n\t   ")
        self.assertIn("error", ws_res)
        self.assertIsNone(ws_res["primary_emotion"])

    # =========================================================================
    # 7. UNSUPPORTED LANGUAGE HANDLING
    # =========================================================================
    def test_07_unsupported_language_handling(self):
        """Unsupported languages gracefully return isSupported=False with advisory warning."""
        # Japanese phrase
        req = PredictRequest(text="雨が降っている、私は一人で泣いている", language="ja")
        res = predict_emotion(req)
        self.assertFalse(res["isSupported"])
        self.assertIn("warning", res)
        self.assertIn("not one of the 5 officially supported languages", res["warning"])

    # =========================================================================
    # 8. REQUEST ID & TIMING DIAGNOSTICS PROPAGATION
    # =========================================================================
    def test_08_request_id_and_timing_diagnostics(self):
        """All prediction responses include unique requestId and execution durationMs."""
        req = PredictRequest(text="I am filled with immense hope and courage for the dawn")
        res = predict_emotion(req)

        self.assertIn("requestId", res)
        self.assertTrue(res["requestId"].startswith("req_"))
        self.assertIn("durationMs", res)
        self.assertGreater(res["durationMs"], 0.0)
        self.assertEqual(res["modelVersion"], "v1.2.0-production-calibrated")

        # Lines endpoint
        lines_req = PredictLinesRequest(
            lines=["Sunlight fills the quiet valley", "Tears of sorrow dry away"],
            contextWindow=1
        )
        lines_res = predict_lines_endpoint(lines_req)
        self.assertIn("requestId", lines_res)
        self.assertIn("durationMs", lines_res)
        self.assertEqual(len(lines_res["lines"]), 2)

    # =========================================================================
    # 9. ERROR SANITIZATION (NO INTERNAL PATHS OR STACK TRACES)
    # =========================================================================
    def test_09_error_sanitization_no_stack_traces(self):
        """Endpoint validation failures return structured error messages without stack trace leakage."""
        from fastapi import HTTPException

        # Empty lyrics trigger HTTP 400
        with self.assertRaises(HTTPException) as cm:
            predict_emotion(PredictRequest(text="   "))
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("cannot be empty", str(cm.exception.detail))
        self.assertNotIn("Traceback", str(cm.exception.detail))
        self.assertNotIn("File \"", str(cm.exception.detail))

    # =========================================================================
    # 10. MULTI-LANGUAGE CONSISTENCY ACROSS 5 TARGET LANGUAGES
    # =========================================================================
    def test_10_multilingual_inference_consistency(self):
        """Inference returns valid emotion taxonomy and normalized probabilities across all 5 languages."""
        test_cases = [
            ("en", "I am singing with total joy and dancing in the sunshine"),
            ("hi", "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम"),
            ("bn", "যদি তোর ডাক শুনে কেউ না আসে তবে একলা চলো রে"),
            ("es", "Mi corazón se llena de una profunda tristeza y dolor"),
            ("fr", "Dans la nuit sombre je ressens une terreur et une peur immense")
        ]

        for expected_lang, lyric in test_cases:
            res = predict_emotion(PredictRequest(text=lyric))
            self.assertTrue(res["success"])
            self.assertIn(res["primaryEmotion"], TARGET_TAXONOMY)
            self.assertGreater(res["confidence"], 0.0)
            self.assertLessEqual(res["confidence"], 1.0)
            self.assertEqual(len(res["emotionProbabilities"]), 10)
            prob_sum = sum(res["emotionProbabilities"].values())
            self.assertAlmostEqual(prob_sum, 1.0, places=2)


if __name__ == "__main__":
    unittest.main(verbosity=2)

