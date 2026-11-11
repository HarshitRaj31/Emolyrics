"""
EmoLyrics Label Mapping Module
Provides defensible, transparent mapping from source dataset categories
(MIREX 28 subcategories, Benchmark 9 labels, GoEmotions, XED, BEmoC, Hindi Corpus, BHAAV)
to the canonical 10-emotion taxonomy.
"""

import json
import os
from typing import Dict, Any, Optional, Tuple, List

DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "config",
    "emotion_mapping.json"
)

class LabelMapper:
    def __init__(self, config_path: str = DEFAULT_CONFIG_PATH):
        self.config_path = config_path
        self._load_config()

    def _load_config(self):
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Emotion mapping config not found at: {self.config_path}")
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.target_taxonomy: List[str] = data.get("target_taxonomy", [])
        self.mirex_mapping: Dict[str, Any] = data.get("mirex_mapping", {})
        self.benchmark_mapping: Dict[str, Any] = data.get("benchmark_mapping", {})
        self.goemotions_mapping: Dict[str, Any] = data.get("goemotions_mapping", {})
        self.xed_mapping: Dict[str, Any] = data.get("xed_mapping", {})
        self.bemoc_mapping: Dict[str, Any] = data.get("bemoc_mapping", {})
        self.hindi_corpus_mapping: Dict[str, Any] = data.get("hindi_corpus_mapping", {})
        self.bhaav_mapping: Dict[str, Any] = data.get("bhaav_mapping", {})

    def _lookup(self, mapping_dict: Dict[str, Any], key_str: str, dataset_label_name: str) -> Tuple[Optional[str], Optional[str], str]:
        if not key_str or not isinstance(key_str, (str, int)):
            return None, None, f"Invalid or empty {dataset_label_name} label."
        clean_key = str(key_str).strip()
        matched_key = next((k for k in mapping_dict if str(k).lower() == clean_key.lower()), None)
        if not matched_key:
            return None, None, f"Unknown {dataset_label_name} label: '{clean_key}'"
        entry = mapping_dict[matched_key]
        return entry.get("mapped_emotion"), entry.get("confidence"), entry.get("reason", "")

    def map_mirex_label(self, category: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.mirex_mapping, category, "MIREX")

    def map_benchmark_label(self, label: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.benchmark_mapping, label, "Benchmark")

    def map_goemotions_label(self, label: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.goemotions_mapping, label, "GoEmotions")

    def map_xed_label(self, label: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.xed_mapping, label, "XED")

    def map_bemoc_label(self, label: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.bemoc_mapping, label, "BEmoC")

    def map_hindi_corpus_label(self, label: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.hindi_corpus_mapping, label, "HindiCorpus")

    def map_bhaav_label(self, label: str) -> Tuple[Optional[str], Optional[str], str]:
        return self._lookup(self.bhaav_mapping, label, "BHAAV")

    def map_dataset_label(self, dataset_name: str, label: str) -> Tuple[Optional[str], Optional[str], str]:
        ds_map = {
            "mirex": self.map_mirex_label,
            "benchmark": self.map_benchmark_label,
            "goemotions": self.map_goemotions_label,
            "xed": self.map_xed_label,
            "bemoc": self.map_bemoc_label,
            "hindi_corpus": self.map_hindi_corpus_label,
            "bhaav": self.map_bhaav_label,
        }
        func = ds_map.get(dataset_name.lower())
        if not func:
            return None, None, f"Unsupported dataset name: {dataset_name}"
        return func(label)

    def is_defensible(self, mapped_emotion: Optional[str]) -> bool:
        """Returns True if the mapped emotion is a valid non-null target emotion."""
        return mapped_emotion is not None and mapped_emotion in self.target_taxonomy

    def get_summary(self) -> Dict[str, Any]:
        return {
            "target_taxonomy_count": len(self.target_taxonomy),
            "target_taxonomy": self.target_taxonomy,
            "supported_datasets": [
                "mirex", "benchmark", "goemotions", "xed", "bemoc", "hindi_corpus", "bhaav"
            ]
        }

if __name__ == "__main__":
    mapper = LabelMapper()
    print("LabelMapper initialized successfully.")
    print(json.dumps(mapper.get_summary(), indent=2))
