"""
EmoLyrics Confidence Calibration & Reliability Module
Implements:
  1. Temperature Scaling (Guo et al., 2017) optimized on validation data
  2. Expected Calibration Error (ECE) metric computation
  3. Reliability diagram data generation
  4. Margin-based and confidence-threshold uncertainty detection
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import Dict, Any, List, Tuple, Optional


def compute_ece(
    probs: np.ndarray,
    targets: np.ndarray,
    n_bins: int = 10
) -> Tuple[float, Dict[str, Any]]:
    """
    Computes Expected Calibration Error (ECE) and reliability bin statistics.
    probs: (N, C) softmax probabilities
    targets: (N,) ground-truth class indices
    """
    confidences = np.max(probs, axis=1)
    predictions = np.argmax(probs, axis=1)
    accuracies = (predictions == targets).astype(float)

    bin_boundaries = np.linspace(0.0, 1.0, n_bins + 1)
    bin_lowers = bin_boundaries[:-1]
    bin_uppers = bin_boundaries[1:]

    ece = 0.0
    bin_stats = []

    for bin_lower, bin_upper in zip(bin_lowers, bin_uppers):
        in_bin = (confidences > bin_lower) & (confidences <= bin_upper)
        prop_in_bin = float(np.mean(in_bin))

        if prop_in_bin > 0:
            acc_in_bin = float(np.mean(accuracies[in_bin]))
            conf_in_bin = float(np.mean(confidences[in_bin]))
            bin_error = abs(conf_in_bin - acc_in_bin)
            ece += bin_error * prop_in_bin

            bin_stats.append({
                "range": [round(float(bin_lower), 2), round(float(bin_upper), 2)],
                "count": int(np.sum(in_bin)),
                "accuracy": round(acc_in_bin, 4),
                "confidence": round(conf_in_bin, 4),
                "calibration_gap": round(bin_error, 4)
            })

    return round(float(ece), 4), {
        "ece": round(float(ece), 4),
        "n_bins": n_bins,
        "bins": bin_stats
    }


class TemperatureScaler(nn.Module):
    """
    Post-hoc probability calibration via Temperature Scaling.
    Learns a single scalar temperature T > 0 on the validation set
    by minimizing CrossEntropyLoss (Negative Log-Likelihood) via L-BFGS.
    """

    def __init__(self, temperature: float = 1.0):
        super().__init__()
        # Initialized to T (default 1.0: identity scaling)
        self.temperature = nn.Parameter(torch.ones(1) * float(temperature))

    def scale_probs(self, probs: np.ndarray) -> np.ndarray:
        """Scales probability array by temperature without needing torch tensor on caller side."""
        probs_clamped = np.clip(probs, 1e-12, 1.0)
        logits = np.log(probs_clamped)
        scaled_logits = logits / float(self.temperature.item())
        exp_logits = np.exp(scaled_logits - np.max(scaled_logits))
        return exp_logits / np.sum(exp_logits)

    def forward(self, logits: torch.Tensor) -> torch.Tensor:
        """Scales logits by 1/T."""
        temp = self.temperature.clamp(min=0.01)
        return logits / temp

    def calibrate(
        self,
        val_logits: torch.Tensor,
        val_targets: torch.Tensor,
        max_iter: int = 50,
        lr: float = 0.01
    ) -> float:
        """
        Optimizes temperature parameter T on validation set logits.
        Returns the optimized temperature value.
        """
        device = val_logits.device
        self.to(device)

        detached_logits = val_logits.detach()
        detached_targets = val_targets.detach()

        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.LBFGS([self.temperature], lr=lr, max_iter=max_iter)

        def eval_loss():
            optimizer.zero_grad()
            scaled_logits = self.forward(detached_logits)
            loss = criterion(scaled_logits, detached_targets)
            loss.backward()
            return loss

        optimizer.step(eval_loss)
        opt_temp = float(self.temperature.item())
        return round(opt_temp, 4)


def assess_prediction_uncertainty(
    probs: Any,
    threshold_low_confidence: float = 0.40,
    threshold_low_margin: float = 0.10
) -> Dict[str, Any]:
    """
    Flags whether a prediction has high uncertainty due to:
      1. Low top confidence (< threshold_low_confidence)
      2. High entropy / low margin between top-1 and top-2 candidate emotions
    """
    if isinstance(probs, dict):
        prob_arr = np.array(list(probs.values()), dtype=float)
    elif isinstance(probs, (list, tuple)):
        prob_arr = np.array(probs, dtype=float)
    else:
        prob_arr = np.asarray(probs, dtype=float)

    sorted_probs = np.sort(prob_arr)[::-1]
    top1 = float(sorted_probs[0])
    top2 = float(sorted_probs[1]) if len(sorted_probs) > 1 else 0.0
    margin = top1 - top2

    # Shannon Entropy normalized to [0, 1] across N classes
    p_nonzero = prob_arr[prob_arr > 0]
    num_classes = max(len(prob_arr), 2)
    entropy = -float(np.sum(p_nonzero * np.log2(p_nonzero))) / np.log2(num_classes)

    is_low_conf = bool(top1 < threshold_low_confidence)
    is_narrow_margin = bool(margin < threshold_low_margin)
    is_uncertain = bool(is_low_conf or is_narrow_margin or (entropy > 0.85))

    reasons = []
    if is_low_conf:
        reasons.append(f"Top emotion confidence ({top1*100:.1f}%) is below {threshold_low_confidence*100:.0f}% threshold")
    if is_narrow_margin:
        reasons.append(f"Narrow margin ({margin*100:.1f}%) between top two emotional candidates")
    if entropy > 0.85:
        reasons.append(f"High emotional ambiguity across multiple categories (Entropy: {entropy:.2f})")

    warning_text = "; ".join(reasons) if reasons else None
    return {
        "isUncertain": is_uncertain,
        "is_uncertain": is_uncertain,
        "confidence": float(round(top1, 4)),
        "margin": float(round(margin, 4)),
        "entropy": float(round(entropy, 4)),
        "warningReason": warning_text,
        "warning_reason": warning_text
    }
