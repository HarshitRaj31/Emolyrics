"""
EmoLyrics Multilingual Emotion Model Architecture
Defines:
  1. NeuralEmotionClassifier: PyTorch Multi-Layer Perceptron classification head with
     LayerNorm, Dropout, and residual capacity operating over frozen multilingual embeddings.
  2. BaselineEmotionClassifier: Regularized Logistic Regression baseline with balanced class weights.
"""

import os
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sklearn.linear_model import LogisticRegression

class NeuralEmotionClassifier(nn.Module):
    def __init__(
        self,
        input_dim: int = 384,
        hidden_dims: List[int] = [256, 128],
        num_classes: int = 10,
        dropout: float = 0.3
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dims = hidden_dims
        self.num_classes = num_classes

        self.input_norm = nn.LayerNorm(input_dim)

        layers = []
        prev_dim = input_dim
        for h_dim in hidden_dims:
            layers.append(nn.Linear(prev_dim, h_dim))
            layers.append(nn.LayerNorm(h_dim))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout))
            prev_dim = h_dim

        self.backbone = nn.Sequential(*layers)
        self.head = nn.Linear(prev_dim, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.input_norm(x)
        features = self.backbone(x)
        logits = self.head(features)
        return logits

    def predict_proba(self, x: torch.Tensor) -> torch.Tensor:
        self.eval()
        with torch.no_grad():
            logits = self.forward(x)
            probs = F.softmax(logits, dim=-1)
        return probs

    def predict(self, x: torch.Tensor) -> torch.Tensor:
        probs = self.predict_proba(x)
        return torch.argmax(probs, dim=-1)


class BaselineEmotionClassifier:
    """Logistic Regression baseline with balanced class weighting."""

    def __init__(
        self,
        max_iter: int = 1000,
        class_weight: str = "balanced",
        random_state: int = 42
    ):
        self.clf = LogisticRegression(
            max_iter=max_iter,
            class_weight=class_weight,
            random_state=random_state,
            solver="lbfgs"
        )
        self.classes_: Optional[np.ndarray] = None

    def fit(self, X: np.ndarray, y: np.ndarray):
        self.clf.fit(X, y)
        self.classes_ = self.clf.classes_
        return self

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.clf.predict(X)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.clf.predict_proba(X)


def save_checkpoint(
    model: nn.Module,
    filepath: str,
    config: Dict[str, Any],
    label_order: List[str],
    metrics: Dict[str, Any],
    epoch: Optional[int] = None
):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    state = {
        "model_state_dict": model.state_dict(),
        "config": config,
        "label_order": label_order,
        "metrics": metrics,
        "epoch": epoch
    }
    torch.save(state, filepath)
    print(f"Checkpoint saved successfully to {filepath}")


def load_checkpoint(filepath: str, device: str = "cpu") -> Tuple[NeuralEmotionClassifier, Dict[str, Any]]:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Checkpoint not found at: {filepath}")
    checkpoint = torch.load(filepath, map_location=device, weights_only=False)
    config = checkpoint["config"]
    model = NeuralEmotionClassifier(
        input_dim=config.get("embedding_dim", 384),
        hidden_dims=config.get("hidden_dims", [256, 128]),
        num_classes=config.get("num_classes", 10),
        dropout=config.get("dropout", 0.3)
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    return model, checkpoint

