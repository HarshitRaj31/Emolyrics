"""
EmoLyrics Multilingual Emotion Model Training Pipeline
Trains and compares:
  1. Baseline Classifier: Multilingual Logistic Regression with balanced class weights
  2. Neural Classifier: PyTorch MLP head with LayerNorm, Dropout, and balanced cross-entropy
Tracks validation loss & Macro F1 with early stopping, saves best model checkpoint,
and generates training_report.json and evaluation_report.json.
"""

import os
import sys
import json
import time
import psutil
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.utils.class_weight import compute_class_weight

from .model import (
    NeuralEmotionClassifier,
    BaselineEmotionClassifier,
    save_checkpoint
)
from .embedding_manager import EmbeddingManager, TARGET_TAXONOMY, IDX_TO_LABEL
from .evaluate import evaluate_predictions

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(BASE_ML_DIR, "config", "training_config.json")
MODELS_DIR = os.path.join(BASE_ML_DIR, "models")
REPORTS_DIR = os.path.join(BASE_ML_DIR, "reports")


def get_memory_usage_mb() -> float:
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024


def train_multilingual_pipeline(config_path: str = CONFIG_PATH) -> Dict[str, Any]:
    print("=" * 70)
    print("EMOLYRICS STAGE 3: MULTILINGUAL MODEL TRAINING PIPELINE")
    print("=" * 70)

    start_time = time.time()
    initial_ram = get_memory_usage_mb()

    # 1. Load Training Configuration
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Configuration file missing: {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    seed = config["training"].get("random_seed", 42)
    torch.manual_seed(seed)
    np.random.seed(seed)
    device = config["hardware"].get("device", "cpu")
    torch.set_num_threads(config["hardware"].get("num_threads", 4))

    print(f"Hardware execution mode: {device.upper()} (Threads: {torch.get_num_threads()})")
    print(f"Initial process memory:  {initial_ram:.1f} MB")

    # 2. Extract / Load Embeddings
    print("\n[Step 1/5] Loading dataset features and multilingual embeddings...")
    emb_manager = EmbeddingManager(
        model_name=config.get("encoder_name", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"),
        device=device
    )
    features = emb_manager.get_features()

    X_train = features["X_train"]
    y_train = features["y_train"]
    meta_train = features["meta_train"]

    X_val = features["X_val"]
    y_val = features["y_val"]
    meta_val = features["meta_val"]

    X_test = features["X_test"]
    y_test = features["y_test"]
    meta_test = features["meta_test"]

    print(f"  Train samples: {len(X_train)} | Val samples: {len(X_val)} | Test samples: {len(X_test)}")
    print(f"  Feature dimensions: {X_train.shape[1]}")

    # 3. Compute Class Weights for Imbalance
    classes_present = np.unique(y_train)
    computed_weights = compute_class_weight("balanced", classes=classes_present, y=y_train)
    # Full 10-class weight vector
    class_weights_vector = np.ones(config["num_classes"], dtype=np.float32)
    for c, w in zip(classes_present, computed_weights):
        class_weights_vector[c] = float(w)

    print(f"  Class weights computed across {len(classes_present)} active training classes.")
    weights_tensor = torch.tensor(class_weights_vector, dtype=torch.float32).to(device)

    # -----------------------------------------------------------------------
    # Model 1: Logistic Regression Baseline
    # -----------------------------------------------------------------------
    print("\n[Step 2/5] Training Baseline Classifier (Multilingual Logistic Regression)...")
    baseline_clf = BaselineEmotionClassifier(
        max_iter=config["baseline"].get("max_iter", 1000),
        class_weight=config["baseline"].get("class_weight", "balanced"),
        random_state=seed
    )
    b_start = time.time()
    baseline_clf.fit(X_train, y_train)
    b_train_time = time.time() - b_start
    print(f"  Baseline training completed in {b_train_time:.2f} seconds.")

    # Evaluate Baseline on Test Set
    baseline_test_preds = baseline_clf.predict(X_test)
    baseline_report = evaluate_predictions(
        y_true=y_test,
        y_pred=baseline_test_preds,
        metadata=meta_test,
        model_name="BaselineLogisticRegression",
        label_order=TARGET_TAXONOMY,
        output_dir=REPORTS_DIR,
        save_plots=True
    )
    print(f"  Baseline Test Accuracy: {baseline_report['overall']['accuracy']*100:.2f}% | Macro F1: {baseline_report['overall']['macro_f1']:.4f}")

    # -----------------------------------------------------------------------
    # Model 2: Neural Emotion Classifier (PyTorch MLP Head)
    # -----------------------------------------------------------------------
    print("\n[Step 3/5] Training Neural Emotion Classifier (MLP Classification Head)...")
    neural_model = NeuralEmotionClassifier(
        input_dim=config.get("embedding_dim", 384),
        hidden_dims=config.get("hidden_dims", [256, 128]),
        num_classes=config.get("num_classes", 10),
        dropout=config.get("dropout", 0.3)
    ).to(device)

    batch_size = config["training"].get("batch_size", 32)
    train_dataset = TensorDataset(torch.tensor(X_train, dtype=torch.float32), torch.tensor(y_train, dtype=torch.long))
    val_dataset = TensorDataset(torch.tensor(X_val, dtype=torch.float32), torch.tensor(y_val, dtype=torch.long))

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    criterion = nn.CrossEntropyLoss(weight=weights_tensor)
    optimizer = torch.optim.AdamW(
        neural_model.parameters(),
        lr=config["training"].get("learning_rate", 0.001),
        weight_decay=config["training"].get("weight_decay", 0.01)
    )

    epochs = config["training"].get("epochs", 40)
    patience = config["training"].get("early_stopping_patience", 7)
    best_val_loss = float("inf")
    best_val_f1 = 0.0
    patience_counter = 0
    best_model_weights = None
    best_epoch = 0

    history = {
        "train_loss": [],
        "val_loss": [],
        "val_accuracy": [],
        "val_macro_f1": []
    }

    n_start = time.time()
    for ep in range(1, epochs + 1):
        neural_model.train()
        total_loss = 0.0
        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            logits = neural_model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * len(batch_y)

        train_loss = total_loss / len(train_dataset)

        # Validation phase
        neural_model.eval()
        val_loss = 0.0
        val_preds = []
        val_targets = []
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                logits = neural_model(batch_x)
                loss = criterion(logits, batch_y)
                val_loss += loss.item() * len(batch_y)
                preds = torch.argmax(logits, dim=-1)
                val_preds.extend(preds.cpu().numpy().tolist())
                val_targets.extend(batch_y.cpu().numpy().tolist())

        val_loss = val_loss / len(val_dataset)
        val_report = evaluate_predictions(
            y_true=np.array(val_targets),
            y_pred=np.array(val_preds),
            metadata=meta_val,
            model_name="Validation",
            label_order=TARGET_TAXONOMY,
            save_plots=False
        )
        val_acc = val_report["overall"]["accuracy"]
        val_f1 = val_report["overall"]["macro_f1"]

        history["train_loss"].append(round(train_loss, 4))
        history["val_loss"].append(round(val_loss, 4))
        history["val_accuracy"].append(round(val_acc, 4))
        history["val_macro_f1"].append(round(val_f1, 4))

        if ep % 5 == 0 or ep == 1:
            print(f"  Epoch [{ep:>2}/{epochs}] Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Acc: {val_acc*100:.1f}% | Val Macro F1: {val_f1:.4f}")

        # Check early stopping (monitor validation loss & macro F1)
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_val_f1 = val_f1
            best_epoch = ep
            best_model_weights = {k: v.cpu().clone() for k, v in neural_model.state_dict().items()}
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"  Early stopping triggered at epoch {ep}. Best epoch was {best_epoch} (Val Loss: {best_val_loss:.4f}, Val F1: {best_val_f1:.4f})")
                break

    n_train_time = time.time() - n_start
    print(f"  Neural training completed in {n_train_time:.2f} seconds.")

    # Load best weights
    if best_model_weights is not None:
        neural_model.load_state_dict(best_model_weights)

    # 4. Final Evaluation on Test Set
    print("\n[Step 4/5] Evaluating Neural Classifier on Untouched Test Set...")
    neural_model.eval()
    with torch.no_grad():
        test_tensor = torch.tensor(X_test, dtype=torch.float32).to(device)
        test_preds = neural_model.predict(test_tensor).cpu().numpy()

    neural_report = evaluate_predictions(
        y_true=y_test,
        y_pred=test_preds,
        metadata=meta_test,
        model_name="NeuralEmotionClassifier",
        label_order=TARGET_TAXONOMY,
        output_dir=REPORTS_DIR,
        save_plots=True
    )
    print(f"  Neural Test Accuracy: {neural_report['overall']['accuracy']*100:.2f}% | Macro F1: {neural_report['overall']['macro_f1']:.4f}")

    # 5. Model Saving & Deliverables
    print("\n[Step 5/5] Saving Best Model Checkpoint and Generating Reports...")
    checkpoint_path = os.path.join(MODELS_DIR, "multilingual_classifier.pt")
    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")

    # Select champion
    champion_name = "NeuralEmotionClassifier" if neural_report["overall"]["macro_f1"] >= baseline_report["overall"]["macro_f1"] else "BaselineLogisticRegression"
    print(f"  Selected Champion Model: {champion_name}")

    save_checkpoint(
        model=neural_model,
        filepath=checkpoint_path,
        config=config,
        label_order=TARGET_TAXONOMY,
        metrics=neural_report["overall"],
        epoch=best_epoch
    )

    peak_ram = get_memory_usage_mb()
    total_execution_time = time.time() - start_time

    model_metadata = {
        "model_version": config["model_version"],
        "champion_model": champion_name,
        "encoder_name": config["encoder_name"],
        "embedding_dim": config["embedding_dim"],
        "hidden_dims": config["hidden_dims"],
        "num_classes": config["num_classes"],
        "label_order": TARGET_TAXONOMY,
        "target_languages": config["target_languages"],
        "training_dataset_sources": ["mirex", "benchmark", "goemotions", "xed", "bemoc", "hindi_corpus"],
        "metrics_neural": neural_report["overall"],
        "metrics_baseline": baseline_report["overall"],
        "training_time_seconds": round(total_execution_time, 2),
        "peak_ram_mb": round(peak_ram, 1)
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(model_metadata, f, indent=2)
    print(f"  Saved metadata to {metadata_path}")

    # Save training report
    training_report = {
        "configuration": config,
        "history": history,
        "training_time_seconds": round(total_execution_time, 2),
        "baseline_training_seconds": round(b_train_time, 2),
        "neural_training_seconds": round(n_train_time, 2),
        "initial_ram_mb": round(initial_ram, 1),
        "peak_ram_mb": round(peak_ram, 1),
        "best_epoch": best_epoch,
        "best_val_loss": round(best_val_loss, 4),
        "best_val_f1": round(best_val_f1, 4)
    }
    training_report_path = os.path.join(REPORTS_DIR, "training_report.json")
    with open(training_report_path, "w", encoding="utf-8") as f:
        json.dump(training_report, f, indent=2)
    print(f"  Saved training report to {training_report_path}")

    # Save evaluation report comparing both
    comparison_report = {
        "baseline_model": baseline_report,
        "neural_model": neural_report,
        "comparison_summary": {
            "baseline_accuracy": baseline_report["overall"]["accuracy"],
            "baseline_macro_f1": baseline_report["overall"]["macro_f1"],
            "neural_accuracy": neural_report["overall"]["accuracy"],
            "neural_macro_f1": neural_report["overall"]["macro_f1"],
            "f1_improvement": round(neural_report["overall"]["macro_f1"] - baseline_report["overall"]["macro_f1"], 4)
        }
    }
    eval_report_path = os.path.join(REPORTS_DIR, "evaluation_report.json")
    with open(eval_report_path, "w", encoding="utf-8") as f:
        json.dump(comparison_report, f, indent=2)
    print(f"  Saved evaluation report to {eval_report_path}")

    return comparison_report


if __name__ == "__main__":
    train_multilingual_pipeline()

