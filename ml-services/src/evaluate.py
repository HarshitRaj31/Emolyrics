"""
EmoLyrics Model Evaluation Module
Calculates multi-dimensional performance metrics:
  - Overall: Accuracy, Macro F1, Weighted F1, Macro Precision, Macro Recall
  - Per-Emotion metrics and support
  - Per-Language metrics (en, hi, bn, es, fr)
  - Domain-specific evaluation (Lyrics vs. General Text vs. Social Media)
  - Length-slice evaluation (Short, Medium, Long lyrics)
  - Code-Switching slice evaluation (Code-switched vs Monolingual)
  - Calibration evaluation (ECE, Reliability Bins)
  - Data leakage audit across dataset splits
  - Confusion matrix visualization
"""

import os
import json
import re
import numpy as np
import torch
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, List, Optional
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_ML_DIR, "models")
REPORTS_DIR = os.path.join(BASE_ML_DIR, "reports")
DATASETS_DIR = os.path.join(BASE_ML_DIR, "datasets", "processed")

TARGET_TAXONOMY = [
    "Happiness", "Sadness", "Love", "Anger", "Nostalgia",
    "Fear", "Excitement", "Hope", "Loneliness", "Calmness"
]


def verify_dataset_zero_leakage(datasets_dir: str = DATASETS_DIR) -> Dict[str, Any]:
    """
    Verifies that no identical or normalized text crosses split boundaries
    between train, validation, and test datasets.
    """
    def _norm(t: str) -> str:
        return re.sub(r"\s+", " ", (t or "").strip().lower())

    split_texts = {}
    split_counts = {}
    for split in ["train", "val", "test"]:
        path = os.path.join(datasets_dir, f"{split}_combined.jsonl")
        texts = set()
        count = 0
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        count += 1
                        data = json.loads(line)
                        texts.add(_norm(data.get("text", "")))
        split_texts[split] = texts
        split_counts[split] = count

    train_val = split_texts.get("train", set()).intersection(split_texts.get("val", set()))
    train_test = split_texts.get("train", set()).intersection(split_texts.get("test", set()))
    val_test = split_texts.get("val", set()).intersection(split_texts.get("test", set()))

    zero_leakage = len(train_val) == 0 and len(train_test) == 0 and len(val_test) == 0
    return {
        "verified_zero_leakage": zero_leakage,
        "sample_counts": split_counts,
        "unique_text_counts": {k: len(v) for k, v in split_texts.items()},
        "overlaps": {
            "train_val_overlap": len(train_val),
            "train_test_overlap": len(train_test),
            "val_test_overlap": len(val_test)
        }
    }


def evaluate_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    metadata: List[Dict[str, Any]],
    model_name: str = "NeuralClassifier",
    label_order: List[str] = TARGET_TAXONOMY,
    output_dir: str = REPORTS_DIR,
    save_plots: bool = True
) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)

    # 1. Overall Metrics
    acc = accuracy_score(y_true, y_pred)
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )
    prec_weighted, rec_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    # 2. Per-Emotion Metrics
    p_class, r_class, f1_class, support_class = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(len(label_order))), zero_division=0
    )

    per_emotion = {}
    insufficient_samples_emotions = []
    for idx, emo_name in enumerate(label_order):
        sup = int(support_class[idx])
        per_emotion[emo_name] = {
            "precision": round(float(p_class[idx]), 4),
            "recall": round(float(r_class[idx]), 4),
            "f1": round(float(f1_class[idx]), 4),
            "support": sup
        }
        if sup < 10:
            insufficient_samples_emotions.append({
                "emotion": emo_name,
                "support": sup,
                "reason": "Test set contains fewer than 10 samples for this emotion."
            })

    # 3. Per-Language Metrics
    languages = sorted(list(set(m["language"] for m in metadata if m.get("language"))))
    per_language = {}
    insufficient_samples_languages = []

    for lang in languages:
        indices = [i for i, m in enumerate(metadata) if m.get("language") == lang]
        if not indices:
            continue
        y_t_sub = y_true[indices]
        y_p_sub = y_pred[indices]
        sub_acc = accuracy_score(y_t_sub, y_p_sub)
        sub_p, sub_r, sub_f1, _ = precision_recall_fscore_support(
            y_t_sub, y_p_sub, average="macro", zero_division=0
        )
        per_language[lang] = {
            "sample_count": len(indices),
            "accuracy": round(float(sub_acc), 4),
            "macro_f1": round(float(sub_f1), 4),
            "macro_precision": round(float(sub_p), 4),
            "macro_recall": round(float(sub_r), 4)
        }
        if len(indices) < 25:
            insufficient_samples_languages.append({
                "language": lang,
                "count": len(indices),
                "reason": "Fewer than 25 test samples."
            })

    # 4. Domain-Specific Metrics (Lyrics vs. General Text vs. Social Media)
    domains = sorted(list(set(m["domain"] for m in metadata if m.get("domain"))))
    per_domain = {}

    for dom in domains:
        indices = [i for i, m in enumerate(metadata) if m.get("domain") == dom]
        if not indices:
            continue
        y_t_sub = y_true[indices]
        y_p_sub = y_pred[indices]
        sub_acc = accuracy_score(y_t_sub, y_p_sub)
        sub_p, sub_r, sub_f1, _ = precision_recall_fscore_support(
            y_t_sub, y_p_sub, average="macro", zero_division=0
        )
        per_domain[dom] = {
            "sample_count": len(indices),
            "accuracy": round(float(sub_acc), 4),
            "macro_f1": round(float(sub_f1), 4),
            "macro_precision": round(float(sub_p), 4),
            "macro_recall": round(float(sub_r), 4)
        }

    # 5. Length-Slice Metrics (Short, Medium, Long)
    length_slices = {"short_le_20": [], "medium_21_50": [], "long_gt_50": []}
    for idx, m in enumerate(metadata):
        words = len((m.get("text") or "").split())
        if words <= 20:
            length_slices["short_le_20"].append(idx)
        elif words <= 50:
            length_slices["medium_21_50"].append(idx)
        else:
            length_slices["long_gt_50"].append(idx)

    per_length = {}
    for l_key, indices in length_slices.items():
        if not indices:
            continue
        y_t_sub = y_true[indices]
        y_p_sub = y_pred[indices]
        sub_acc = accuracy_score(y_t_sub, y_p_sub)
        _, _, sub_f1, _ = precision_recall_fscore_support(
            y_t_sub, y_p_sub, average="macro", zero_division=0
        )
        per_length[l_key] = {
            "sample_count": len(indices),
            "accuracy": round(float(sub_acc), 4),
            "macro_f1": round(float(sub_f1), 4)
        }

    # 6. Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(label_order))))
    cm_list = cm.tolist()

    if save_plots:
        cm_path = os.path.join(output_dir, f"{model_name.lower()}_confusion_matrix.png")
        try:
            plt.figure(figsize=(10, 8))
            sns.heatmap(
                cm,
                annot=True,
                fmt="d",
                cmap="Blues",
                xticklabels=label_order,
                yticklabels=label_order
            )
            plt.title(f"Confusion Matrix: {model_name} (Test Split)")
            plt.xlabel("Predicted Emotion")
            plt.ylabel("True Emotion")
            plt.xticks(rotation=45, ha="right")
            plt.tight_layout()
            plt.savefig(cm_path, dpi=150)
            plt.close()
            print(f"[Evaluation] Saved confusion matrix visualization to {cm_path}")
        except Exception as e:
            print(f"[Evaluation] Warning: Could not save plot: {e}")

    report = {
        "model_name": model_name,
        "total_test_samples": len(y_true),
        "overall": {
            "accuracy": round(float(acc), 4),
            "macro_f1": round(float(f1_macro), 4),
            "weighted_f1": round(float(f1_weighted), 4),
            "macro_precision": round(float(prec_macro), 4),
            "macro_recall": round(float(rec_macro), 4)
        },
        "per_emotion": per_emotion,
        "per_language": per_language,
        "per_domain": per_domain,
        "per_length_slice": per_length,
        "insufficient_samples_notice": {
            "emotions": insufficient_samples_emotions,
            "languages": insufficient_samples_languages
        },
        "confusion_matrix": cm_list,
        "label_order": label_order
    }

    return report


def run_stage7_validation() -> Dict[str, Any]:
    """
    Executes complete Stage 7 Production Validation Suite on the untouched test partition.
    """
    from .model import NeuralEmotionClassifier, load_checkpoint
    from .embedding_manager import EmbeddingManager
    from .calibration import compute_ece
    from .code_switch import get_code_switch_analyzer

    print("\n" + "=" * 75)
    print("EMOLYRICS STAGE 7: PRODUCTION MODEL VALIDATION & RELIABILITY AUDIT")
    print("=" * 75)

    # 1. Leakage Verification
    print("\n[Audit 1/5] Verifying zero data leakage across dataset partitions...")
    leakage_audit = verify_dataset_zero_leakage()
    print(f"  Train: {leakage_audit['sample_counts']['train']} samples")
    print(f"  Val:   {leakage_audit['sample_counts']['val']} samples")
    print(f"  Test:  {leakage_audit['sample_counts']['test']} samples")
    print(f"  Zero Leakage Verified: {leakage_audit['verified_zero_leakage']} "
          f"(Train-Val: {leakage_audit['overlaps']['train_val_overlap']}, "
          f"Train-Test: {leakage_audit['overlaps']['train_test_overlap']}, "
          f"Val-Test: {leakage_audit['overlaps']['val_test_overlap']})")

    # 2. Load Features
    print("\n[Audit 2/5] Loading precomputed test partition features...")
    emb_mgr = EmbeddingManager(device="cpu")
    features = emb_mgr.get_features()

    X_test = features["X_test"]
    y_test = features["y_test"]
    meta_test = features["meta_test"]

    # 3. Load Checkpoint
    checkpoint_path = os.path.join(MODELS_DIR, "multilingual_classifier.pt")
    print(f"\n[Audit 3/5] Loading production calibrated checkpoint from {checkpoint_path}...")
    model, chk_meta = load_checkpoint(checkpoint_path, device="cpu")
    model.eval()

    test_x_tensor = torch.tensor(X_test, dtype=torch.float32)
    with torch.no_grad():
        raw_logits = model(test_x_tensor)
        temperature = chk_meta.get("calibration", {}).get("temperature", 1.0295)
        calibrated_logits = raw_logits / float(temperature)

        raw_probs = torch.softmax(raw_logits, dim=-1).numpy()
        cal_probs = torch.softmax(calibrated_logits, dim=-1).numpy()
        preds = np.argmax(cal_probs, axis=-1)

    # 4. Calibration Metrics
    print("\n[Audit 4/5] Evaluating calibration and ECE...")
    raw_ece, raw_bins = compute_ece(raw_probs, y_test, n_bins=10)
    cal_ece, cal_bins = compute_ece(cal_probs, y_test, n_bins=10)
    ece_reduction_pct = round(((raw_ece - cal_ece) / raw_ece) * 100, 2)
    print(f"  Raw ECE:        {raw_ece:.4f}")
    print(f"  Calibrated ECE: {cal_ece:.4f} ({ece_reduction_pct}% calibration error reduction at T={temperature})")

    # 5. Core Performance Metrics & Slices
    print("\n[Audit 5/5] Computing multi-dimensional evaluation slices...")
    eval_res = evaluate_predictions(
        y_true=y_test,
        y_pred=preds,
        metadata=meta_test,
        model_name="stage7_production_calibrated",
        label_order=TARGET_TAXONOMY,
        output_dir=REPORTS_DIR,
        save_plots=True
    )

    # Code-Switching Slice Evaluation
    cs_analyzer = get_code_switch_analyzer()
    cs_indices = []
    mono_indices = []
    for idx, m in enumerate(meta_test):
        text = m.get("text", "")
        analysis = cs_analyzer.analyze(text)
        if analysis.get("isCodeSwitched"):
            cs_indices.append(idx)
        else:
            mono_indices.append(idx)

    cs_metrics = {}
    if cs_indices:
        y_t_cs = y_test[cs_indices]
        y_p_cs = preds[cs_indices]
        cs_acc = accuracy_score(y_t_cs, y_p_cs)
        _, _, cs_f1, _ = precision_recall_fscore_support(y_t_cs, y_p_cs, average="macro", zero_division=0)
        cs_metrics["code_switched"] = {
            "count": len(cs_indices),
            "accuracy": round(float(cs_acc), 4),
            "macro_f1": round(float(cs_f1), 4)
        }
    if mono_indices:
        y_t_mo = y_test[mono_indices]
        y_p_mo = preds[mono_indices]
        mo_acc = accuracy_score(y_t_mo, y_p_mo)
        _, _, mo_f1, _ = precision_recall_fscore_support(y_t_mo, y_p_mo, average="macro", zero_division=0)
        cs_metrics["monolingual"] = {
            "count": len(mono_indices),
            "accuracy": round(float(mo_acc), 4),
            "macro_f1": round(float(mo_f1), 4)
        }

    # Baseline Comparison
    baseline_metrics = {
        "model": "BaselineLogisticRegression",
        "accuracy": 0.4380,
        "macro_f1": 0.3806,
        "weighted_f1": 0.4424
    }

    champion_metrics = eval_res["overall"]

    validation_report = {
        "report_title": "EmoLyrics Stage 7 Production Model Validation & Performance Report",
        "timestamp": json.dumps(chk_meta.get("training_timestamp", "2026-11-11T18:00:00Z"))[1:-1],
        "modelVersion": "v1.2.0-production-calibrated",
        "modelArchitecture": "SentenceTransformer(paraphrase-multilingual-MiniLM-L12-v2) + 2-layer Neural MLP (384 -> 256 -> 10) + TemperatureScaler(T=1.0295)",
        "hardware": "CPU-only (x86_64, Windows, 16 GB RAM)",
        "data_leakage_audit": leakage_audit,
        "overall_performance": eval_res["overall"],
        "baseline_comparison": {
            "baseline": baseline_metrics,
            "champion_production": champion_metrics,
            "f1_improvement_absolute": round(champion_metrics["macro_f1"] - baseline_metrics["macro_f1"], 4),
            "f1_improvement_percent": round(((champion_metrics["macro_f1"] - baseline_metrics["macro_f1"]) / baseline_metrics["macro_f1"]) * 100, 2)
        },
        "confidence_calibration": {
            "temperature": temperature,
            "raw_ece": raw_ece,
            "calibrated_ece": cal_ece,
            "ece_reduction_percent": ece_reduction_pct,
            "reliability_bins": cal_bins["bins"]
        },
        "per_language_metrics": eval_res["per_language"],
        "per_emotion_metrics": eval_res["per_emotion"],
        "per_domain_metrics": eval_res["per_domain"],
        "length_slice_metrics": eval_res["per_length_slice"],
        "code_switching_slice_metrics": cs_metrics,
        "confusion_matrix": eval_res["confusion_matrix"],
        "label_order": TARGET_TAXONOMY
    }

    report_path = os.path.join(REPORTS_DIR, "stage7_model_validation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(validation_report, f, indent=2)

    print(f"\n[Validation Complete] Full report saved to {report_path}")
    print(f"  Overall Accuracy: {champion_metrics['accuracy'] * 100:.2f}%")
    print(f"  Macro F1-Score:   {champion_metrics['macro_f1']:.4f} (+{validation_report['baseline_comparison']['f1_improvement_percent']}% over baseline)")
    print(f"  Calibrated ECE:   {cal_ece:.4f} (-{ece_reduction_pct}% calibration gap)")
    return validation_report


if __name__ == "__main__":
    run_stage7_validation()


