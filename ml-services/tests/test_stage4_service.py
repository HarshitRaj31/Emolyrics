"""
Unit tests for Stage 4: Multilingual ML HTTP Service API (FastAPI)
Tests /health, /predict across 5 target languages (en, hi, bn, es, fr),
code-switched Hinglish/Banglish, input validation, and batch inference.
"""

import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure ml-services root is in Python path
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(TEST_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from src.api import app, predictor_instance, MultilingualEmotionPredictor
import src.api as api_module
from src.embedding_manager import TARGET_TAXONOMY


class TestStage4MultilingualService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_root_endpoint(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "online")
        self.assertIn("EmoLyrics", data.get("service", ""))

    def test_02_health_endpoint(self):
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("device"), "cpu")
        self.assertEqual(len(data.get("supportedLanguages", [])), 5)
        self.assertIn("en", data.get("supportedLanguages", []))
        self.assertIn("hi", data.get("supportedLanguages", []))
        self.assertIn("bn", data.get("supportedLanguages", []))
        self.assertIn("es", data.get("supportedLanguages", []))
        self.assertIn("fr", data.get("supportedLanguages", []))
        self.assertEqual(len(data.get("supportedEmotions", [])), 10)
        for emotion in TARGET_TAXONOMY:
            self.assertIn(emotion, data.get("supportedEmotions", []))

    def test_03_predict_english_lyrics(self):
        payload = {
            "text": "I feel so alive and full of joy, dancing in the warm golden sunshine with a smile"
        }
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("language"), "en")
        self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)
        self.assertGreater(data.get("confidence"), 0.0)
        self.assertEqual(len(data.get("emotionProbabilities", {})), 10)
        prob_sum = sum(data["emotionProbabilities"].values())
        self.assertAlmostEqual(prob_sum, 1.0, places=2)
        self.assertIn("modelVersion", data)

    def test_04_predict_hindi_devanagari_lyrics(self):
        payload = {
            "text": "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम, मन की शांति और सुख"
        }
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("language"), "hi")
        self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)
        self.assertIn("Hindi", data.get("languageName", ""))

    def test_05_predict_hinglish_code_switched(self):
        payload = {
            "text": "mera dil tere pyaar me deewana ho gaya hai sanam humsafar"
        }
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("language"), "hi")
        self.assertTrue(data.get("isCodeSwitched"))
        self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)

    def test_06_predict_bengali_lyrics(self):
        payload = {
            "text": "আমার সোনার বাংলা আমি তোমায় ভালোবাসি চিরদিন তোমার আকাশ তোমার বাতাস"
        }
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("language"), "bn")
        self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)

    def test_07_predict_spanish_lyrics(self):
        payload = {
            "text": "Mi corazón siente un amor tan profundo por ti, siempre juntos bajo las estrellas"
        }
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("language"), "es")
        self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)

    def test_08_predict_french_lyrics(self):
        payload = {
            "text": "Dans le silence de la nuit je ressens une grande tristesse et des larmes qui coulent"
        }
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("language"), "fr")
        self.assertIn(data.get("primaryEmotion"), TARGET_TAXONOMY)

    def test_09_predict_empty_text_error(self):
        payload = {"text": "   "}
        res = self.client.post("/predict", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("detail", data)

    def test_10_batch_prediction(self):
        payload = {
            "texts": [
                "Happy sunshine celebration and victory",
                "Te quiero con todo mi corazón",
                "Ghor andhakar ar dukkho chokhe jol"
            ]
        }
        res = self.client.post("/predict-batch", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("count"), 3)
        self.assertEqual(len(data.get("results")), 3)
        for r in data["results"]:
            self.assertIn(r["primaryEmotion"], TARGET_TAXONOMY)


if __name__ == "__main__":
    unittest.main()
