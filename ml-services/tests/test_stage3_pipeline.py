"""
Automated Unit and Integration Test Suite for Stage 3:
Multilingual Emotion Model Training, Evaluation & CPU Inference.

Tests:
  1. Dataset Splits & Canonical Schema Readiness
  2. Model Architecture & Forward Pass Shape
  3. Training Checkpoint & Model Metadata
  4. Multi-metric Evaluation & Report Integrity
  5. Native Multilingual CPU Predictor across 5 Languages
"""

import os
import json
import torch
import unittest
import numpy as np

from src.model import (
    NeuralEmotionClassifier,
    BaselineEmotionClassifier,
    load_checkpoint
)
from src.embedding_manager import (
    EmbeddingManager,
    TARGET_TAXONOMY,
    LABEL_TO_IDX,
    IDX_TO_LABEL
)
from src.predict import MultilingualEmotionPredictor, DEFAULT_CHECKPOINT
from src.stage2_integrator import PROCESSED_DIR

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_ML_DIR, "models")
REPORTS_DIR = os.path.join(BASE_ML_DIR, "reports")


class TestDatasetReadiness(unittest.TestCase):
    """Verifies that all processed splits are ready and valid for training."""

    def test_splits_and_canonical_schema(self):
        splits = ["train_combined", "val_combined", "test_combined"]
        required_keys = {
            "text", "language", "emotion", "source", "source_id",
            "artist", "title", "label_original", "domain", "label_confidence"
        }
        valid_langs = {"en", "hi", "bn", "es", "fr"}
        valid_domains = {"lyrics", "social_media", "general_text"}
        valid_emotions = set(TARGET_TAXONOMY)

        total_samples = 0
        for split in splits:
            filepath = os.path.join(PROCESSED_DIR, f"{split}.jsonl")
            self.assertTrue(os.path.exists(filepath), f"Missing split: {filepath}")
            with open(filepath, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    row = json.loads(line)
                    total_samples += 1
                    self.assertTrue(required_keys.issubset(row.keys()))
                    self.assertIn(row["language"], valid_langs)
                    self.assertIn(row["domain"], valid_domains)
                    self.assertIn(row["emotion"], valid_emotions)
                    self.assertTrue(len(row["text"].strip()) > 0)

        self.assertEqual(total_samples, 3290)


class TestModelArchitecture(unittest.TestCase):
    """Tests model definitions, forward passes, and shapes."""

    def test_neural_classifier_shapes(self):
        batch_size = 8
        input_dim = 384
        num_classes = 10
        model = NeuralEmotionClassifier(
            input_dim=input_dim,
            hidden_dims=[128, 64],
            num_classes=num_classes,
            dropout=0.2
        )
        x = torch.randn(batch_size, input_dim)
        logits = model(x)
        self.assertEqual(logits.shape, (batch_size, num_classes))

        probs = model.predict_proba(x)
        self.assertEqual(probs.shape, (batch_size, num_classes))
        # Probabilities must sum to 1.0 along class dimension
        sums = torch.sum(probs, dim=-1).cpu().detach().numpy()
        np.testing.assert_allclose(sums, np.ones(batch_size), atol=1e-5)

        preds = model.predict(x)
        self.assertEqual(preds.shape, (batch_size,))

    def test_baseline_classifier_fit_predict(self):
        clf = BaselineEmotionClassifier(max_iter=100)
        X = np.random.randn(30, 384)
        y = np.random.randint(0, 10, size=30)
        clf.fit(X, y)
        preds = clf.predict(X[:5])
        self.assertEqual(len(preds), 5)
        probs = clf.predict_proba(X[:5])
        self.assertEqual(probs.shape[0], 5)


class TestTrainingArtifacts(unittest.TestCase):
    """Verifies checkpoints, metadata, and evaluation reports."""

    def test_checkpoint_loading(self):
        self.assertTrue(os.path.exists(DEFAULT_CHECKPOINT))
        model, meta = load_checkpoint(DEFAULT_CHECKPOINT, device="cpu")
        self.assertIsInstance(model, NeuralEmotionClassifier)
        self.assertIn("config", meta)
        self.assertIn("label_order", meta)
        self.assertEqual(len(meta["label_order"]), 10)

    def test_metadata_file(self):
        meta_path = os.path.join(MODELS_DIR, "model_metadata.json")
        self.assertTrue(os.path.exists(meta_path))
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        self.assertEqual(meta["champion_model"], "NeuralEmotionClassifier")
        self.assertEqual(len(meta["target_languages"]), 5)
        self.assertEqual(len(meta["label_order"]), 10)

    def test_evaluation_report(self):
        eval_path = os.path.join(REPORTS_DIR, "evaluation_report.json")
        self.assertTrue(os.path.exists(eval_path))
        with open(eval_path, "r", encoding="utf-8") as f:
            report = json.load(f)

        self.assertIn("baseline_model", report)
        self.assertIn("neural_model", report)
        self.assertIn("comparison_summary", report)

        neural = report["neural_model"]
        self.assertIn("per_emotion", neural)
        self.assertIn("per_language", neural)
        self.assertIn("per_domain", neural)
        self.assertIn("insufficient_samples_notice", neural)

        # Check all 5 languages evaluated
        for lang in ["en", "hi", "bn", "es", "fr"]:
            self.assertIn(lang, neural["per_language"])

        # Check all 3 domains evaluated
        for dom in ["lyrics", "social_media", "general_text"]:
            self.assertIn(dom, neural["per_domain"])


class TestMultilingualPredictor(unittest.TestCase):
    """Verifies CPU inference across all 5 target languages."""

    def setUp(self):
        self.predictor = MultilingualEmotionPredictor(checkpoint_path=DEFAULT_CHECKPOINT, device="cpu")

    def test_multilingual_inference(self):
        samples = [
            ("I feel so joyful and excited today", "en"),
            ("तू प्यार का सागर है तेरी एक बूंद के प्यासे हम", "hi"),
            ("আমার সোনার বাংলা আমি তোমায় ভালোবাসি", "bn"),
            ("Mi corazón siente una gran tristeza y dolor", "es"),
            ("Dans la nuit je ressens une peur immense et terrifiante", "fr")
        ]

        for text, exp_lang in samples:
            res = self.predictor.predict(text)
            self.assertIn(res["detected_language"], ["en", "hi", "bn", "es", "fr"])
            self.assertIn(res["primary_emotion"], TARGET_TAXONOMY)
            self.assertGreater(res["confidence"], 0.0)
            self.assertEqual(len(res["probabilities"]), 10)
            self.assertIsInstance(res["secondary_emotions"], list)

    def test_empty_input_handling(self):
        res = self.predictor.predict("")
        self.assertIn("error", res)
        self.assertEqual(res["confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()

