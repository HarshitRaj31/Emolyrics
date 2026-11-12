"""
Deployment smoke tests for Render Python ML Service (Docker / Uvicorn / FastAPI).
Verifies:
  - FastAPI lifespan startup & model initialization
  - /health endpoint (200 healthy when ready, 503 degraded when model loading fails)
  - Predictions across all 5 supported languages: en, hi, bn, es, fr
  - /predict-lines endpoint compatibility
"""

import os
import sys
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(TEST_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.api import app
from src.embedding_manager import TARGET_TAXONOMY


class TestRenderDeploymentSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client_cm = TestClient(app)
        cls.client = cls.client_cm.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_cm.__exit__(None, None, None)

    def test_01_health_ready(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertTrue(data.get("modelReady"))
        self.assertTrue(data.get("checkpointExists"))
        self.assertEqual(data.get("device"), "cpu")
        self.assertEqual(set(data.get("supportedLanguages", [])), {"en", "hi", "bn", "es", "fr"})
        self.assertGreater(data.get("memoryRssMb", 0.0), 50.0)

    def test_02_health_reports_503_when_model_fails(self):
        with patch("src.api.get_predictor", side_effect=RuntimeError("Simulated missing checkpoint")):
            res = self.client.get("/health")
            self.assertEqual(res.status_code, 503)
            data = res.json()
            self.assertEqual(data.get("status"), "degraded")
            self.assertFalse(data.get("modelReady"))

    def test_03_predict_all_five_languages(self):
        samples = [
            ("en", "Walking on sunshine with pure joy and happiness in my heart"),
            ("hi", "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम, मन में शांति और सुख"),
            ("bn", "আমার সোনার বাংলা আমি তোমায় ভালোবাসি চিরদিন তোমার আকাশ"),
            ("es", "Qué alegría y felicidad bailar bajo el sol brillante contigo"),
            ("fr", "Je suis si heureux et plein d'amour sous le ciel étoilé de Paris"),
        ]
        for expected_lang, text in samples:
            with self.subTest(language=expected_lang):
                res = self.client.post("/predict", json={"text": text})
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertTrue(data.get("success"))
                self.assertEqual(data.get("language"), expected_lang)
                self.assertTrue(data.get("isSupported"))
                self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)
                self.assertGreater(data.get("confidence", 0.0), 0.0)

    def test_04_predict_lines_compatibility(self):
        res = self.client.post(
            "/predict-lines",
            json={
                "lines": [
                    "[Verse 1]",
                    "Dancing in the moonlight feeling so alive",
                    "Missing the quiet days of yesterday",
                ],
                "contextWindow": 1,
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("count"), 3)
        self.assertEqual(data["lines"][0]["primaryEmotion"], "Structure")
        self.assertIn(data["lines"][1]["primaryEmotion"], TARGET_TAXONOMY)
        self.assertIn(data["lines"][2]["primaryEmotion"], TARGET_TAXONOMY)


if __name__ == "__main__":
    unittest.main()

