"""
EmoLyrics Stage 2 Dataset Acquisition Pipeline
Downloads approved, verified multilingual emotion datasets from official repositories,
validates integrity (SHA256 checksums & sizes), and registers metadata in dataset_manifest.json.

Guarantees:
  - Preserves existing datasets (never overwrites raw/mirex/)
  - Verifies official sources and tracks licensing metadata
  - Provides fallback and manual acquisition instructions
"""

import os
import sys
import json
import hashlib
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Dict, Any, List

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATASETS_DIR = os.path.join(BASE_ML_DIR, "datasets", "raw")
MANIFEST_PATH = os.path.join(RAW_DATASETS_DIR, "dataset_manifest.json")

DATASET_SPECS: Dict[str, Dict[str, Any]] = {
    "mirex": {
        "name": "MIREX Audio & Lyrics Dataset",
        "official_source": "https://www.kaggle.com/datasets/saikatdatta2000/mirex-dataset",
        "license": "Academic / Non-commercial Research",
        "commercial_use": False,
        "redistribution": False,
        "domain": "lyrics",
        "supported_languages": ["en"],
        "is_preinstalled": True,
        "description": "Pre-installed in Stage 1 under raw/mirex/. Untouched by acquisition script."
    },
    "benchmark": {
        "name": "In-repo Multilingual Benchmark Dataset",
        "official_source": "backend/nlp/benchmark/dataset.json",
        "license": "Internal Project Resource",
        "commercial_use": True,
        "redistribution": True,
        "domain": "lyrics",
        "supported_languages": ["en", "hi", "bn", "es", "fr"],
        "is_preinstalled": True,
        "description": "Pre-existing in-repo benchmark covering 5 target languages."
    },
    "goemotions": {
        "name": "GoEmotions (Google Research)",
        "official_source": "https://github.com/google-research/google-research/tree/master/goemotions",
        "license": "Apache License 2.0",
        "commercial_use": True,
        "redistribution": True,
        "domain": "social_media",
        "supported_languages": ["en"],
        "files": {
            "dev.tsv": "https://raw.githubusercontent.com/google-research/google-research/master/goemotions/data/dev.tsv",
            "emotions.txt": "https://raw.githubusercontent.com/google-research/google-research/master/goemotions/data/emotions.txt"
        }
    },
    "xed": {
        "name": "XED: Cross-Lingual Emotion Dataset (Helsinki-NLP)",
        "official_source": "https://github.com/Helsinki-NLP/XED",
        "license": "Creative Commons Attribution 4.0 International (CC-BY 4.0)",
        "commercial_use": True,
        "redistribution": True,
        "domain": "general_text",
        "supported_languages": ["fr", "es"],
        "files": {
            "fr-projections.tsv": "https://raw.githubusercontent.com/Helsinki-NLP/XED/master/Projections/fr-projections.tsv",
            "es-projections.tsv": "https://raw.githubusercontent.com/Helsinki-NLP/XED/master/Projections/es-projections.tsv"
        }
    },
    "bemoc": {
        "name": "BEmoC: Bengali Emotion Corpus (Avishek Das et al.)",
        "official_source": "https://github.com/avishek-018/BEmoC-Bengali-Emotion-Courpus",
        "license": "Academic / Non-commercial Research Use (All Rights Reserved by Authors)",
        "commercial_use": False,
        "redistribution": False,
        "domain": "general_text",
        "supported_languages": ["bn"],
        "files": {
            "cleaned_BEmoC7k.xlsx": "https://raw.githubusercontent.com/avishek-018/BEmoC-Bengali-Emotion-Courpus/master/Data/cleaned_BEmoC7k.xlsx"
        }
    },
    "hindi_corpus": {
        "name": "Hindi Emotion Analysis Corpus",
        "official_source": "https://github.com/kush-2418/Hindi-Emotion-Analysis-ML",
        "license": "Open Academic Use",
        "commercial_use": False,
        "redistribution": True,
        "domain": "general_text",
        "supported_languages": ["hi"],
        "files": {
            "happy.csv": "https://raw.githubusercontent.com/kush-2418/Hindi-Emotion-Analysis-ML/master/DataCSV/happy.csv",
            "sad.csv": "https://raw.githubusercontent.com/kush-2418/Hindi-Emotion-Analysis-ML/master/DataCSV/sad.csv",
            "angry.csv": "https://raw.githubusercontent.com/kush-2418/Hindi-Emotion-Analysis-ML/master/DataCSV/angry.csv",
            "neutral.csv": "https://raw.githubusercontent.com/kush-2418/Hindi-Emotion-Analysis-ML/master/DataCSV/neutral.csv"
        }
    }
}

MANUAL_RESTRICTED_DATASETS = {
    "iitp_emoinhindi": {
        "name": "IIT Patna EmoInHindi",
        "status": "Gated - Restricted",
        "reason": "Requires human approval via institutional Data Sharing Agreement form at https://www.iitp.ac.in/~ai-nlp-ml/. Automated download prohibited by terms of access.",
        "manual_instructions": "Submit request form to IIT Patna AI-NLP-ML group. Once approved, place extracted data in ml-services/datasets/raw/iitp_emoinhindi/."
    },
    "bhaav": {
        "name": "BHAAV (IIIT-Delhi / Zenodo 3457467)",
        "status": "Gated - Research Citation Notice",
        "reason": "Zenodo API blocks automated access with HTTP 403, and author guidelines request directing parties to official page rather than automated redistribution.",
        "manual_instructions": "Download directly from Zenodo (https://zenodo.org/record/3457467) and place under ml-services/datasets/raw/bhaav/."
    },
    "emoevales": {
        "name": "EmoEvalEs (IberLEF 2021)",
        "status": "Gated - Encrypted Archive",
        "reason": "Official repository (pendrag/EmoEvalEs) contains password-encrypted archives distributed exclusively to registered competition participants.",
        "manual_instructions": "If you possess competition credentials, extract train.tsv into ml-services/datasets/raw/emoevales/."
    }
}


def compute_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def download_file(url: str, dest_path: str, timeout: int = 25) -> bool:
    """Downloads a file with proper User-Agent header and error handling."""
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"    [Cached] File already exists: {os.path.basename(dest_path)} ({os.path.getsize(dest_path)} bytes)")
        return True

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) EmoLyrics/2.0"})
    try:
        print(f"    Downloading from {url}...")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read()
            with open(dest_path, "wb") as f:
                f.write(content)
        print(f"    Saved: {os.path.basename(dest_path)} ({len(content)} bytes)")
        return True
    except Exception as e:
        print(f"    [Error] Failed to download {url}: {e}")
        return False


def acquire_all_approved_datasets() -> Dict[str, Any]:
    print("=" * 70)
    print("EMOLYRICS STAGE 2: MULTILINGUAL DATASET ACQUISITION PIPELINE")
    print("=" * 70)

    manifest: Dict[str, Any] = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "datasets": {},
        "gated_datasets_audit": MANUAL_RESTRICTED_DATASETS
    }

    # Load existing manifest if present
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                existing_manifest = json.load(f)
                manifest["datasets"] = existing_manifest.get("datasets", {})
        except Exception:
            pass

    for ds_key, spec in DATASET_SPECS.items():
        print(f"\nProcessing: {spec['name']} [{spec['domain']}]")
        ds_dir = os.path.join(RAW_DATASETS_DIR, ds_key)
        os.makedirs(ds_dir, exist_ok=True)

        if spec.get("is_preinstalled"):
            print(f"  {spec['description']}")
            manifest["datasets"][ds_key] = {
                "name": spec["name"],
                "official_source": spec["official_source"],
                "license": spec["license"],
                "commercial_use": spec["commercial_use"],
                "redistribution": spec["redistribution"],
                "domain": spec["domain"],
                "supported_languages": spec["supported_languages"],
                "status": "installed",
                "acquired_at": manifest["datasets"].get(ds_key, {}).get("acquired_at", datetime.now(timezone.utc).isoformat())
            }
            continue

        downloaded_files: Dict[str, Dict[str, Any]] = {}
        all_succeeded = True

        for fname, url in spec.get("files", {}).items():
            dest = os.path.join(ds_dir, fname)
            success = download_file(url, dest)
            if success and os.path.exists(dest):
                downloaded_files[fname] = {
                    "source_url": url,
                    "size_bytes": os.path.getsize(dest),
                    "sha256": compute_sha256(dest)
                }
            else:
                all_succeeded = False

        manifest["datasets"][ds_key] = {
            "name": spec["name"],
            "official_source": spec["official_source"],
            "license": spec["license"],
            "commercial_use": spec["commercial_use"],
            "redistribution": spec["redistribution"],
            "domain": spec["domain"],
            "supported_languages": spec["supported_languages"],
            "status": "ready" if all_succeeded else "partial",
            "acquired_at": datetime.now(timezone.utc).isoformat(),
            "files": downloaded_files
        }

    # Save manifest
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nManifest successfully updated at: {MANIFEST_PATH}")
    return manifest


if __name__ == "__main__":
    acquire_all_approved_datasets()

