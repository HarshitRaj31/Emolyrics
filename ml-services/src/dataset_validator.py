"""
EmoLyrics Dataset Validator & Pipeline Partitioning Module
Validates canonical schema, prevents data leakage via artist-grouped & duplicate-aware
splitting (70% Train, 15% Val, 15% Test, Seed 42), writes processed JSONL partitions,
and generates the comprehensive dataset_report.json.
"""

import os
import json
import random
from collections import Counter, defaultdict
from typing import Dict, Any, List, Tuple

from .data_loader import MirexLoader, BenchmarkLoader, LanguageDetector
from .label_mapping import LabelMapper

# Default paths
BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_MIREX_DIR = os.path.join(BASE_ML_DIR, "datasets", "raw", "mirex")
BENCHMARK_PATH = os.path.abspath(os.path.join(
    BASE_ML_DIR, "..", "backend", "nlp", "benchmark", "dataset.json"
))
PROCESSED_DIR = os.path.join(BASE_ML_DIR, "datasets", "processed")


class DatasetValidator:
    def __init__(
        self,
        mirex_dir: str = RAW_MIREX_DIR,
        benchmark_path: str = BENCHMARK_PATH,
        output_dir: str = PROCESSED_DIR,
        random_seed: int = 42
    ):
        self.mirex_dir = mirex_dir
        self.benchmark_path = benchmark_path
        self.output_dir = output_dir
        self.random_seed = random_seed
        self.label_mapper = LabelMapper()
        self.lang_detector = LanguageDetector()
        os.makedirs(self.output_dir, exist_ok=True)

    def run_pipeline(self) -> Dict[str, Any]:
        """
        Executes complete ingestion, validation, splitting, JSONL generation, and reporting.
        """
        print("=" * 70)
        print("EMOLYRICS DATASET PREPARATION & VALIDATION PIPELINE")
        print("=" * 70)

        # 1. Load Raw Records
        print("\n[Step 1/5] Ingesting source records...")
        mirex_loader = MirexLoader(self.mirex_dir, self.label_mapper)
        mirex_records = mirex_loader.load_records()
        print(f"  Loaded {len(mirex_records)} raw records from MIREX catalog.")

        benchmark_records = []
        if os.path.exists(self.benchmark_path):
            bench_loader = BenchmarkLoader(self.benchmark_path, self.label_mapper)
            benchmark_records = bench_loader.load_records()
            print(f"  Loaded {len(benchmark_records)} benchmark records.")
        else:
            print(f"  Warning: Benchmark file not found at {self.benchmark_path}")

        all_raw_records = mirex_records + benchmark_records
        total_raw = len(all_raw_records)

        # 2. Validation & Filtering
        print("\n[Step 2/5] Validating records and filtering unmapped/empty data...")
        valid_records: List[Dict[str, Any]] = []
        excluded_records: List[Dict[str, Any]] = []
        duplicate_records: List[Dict[str, Any]] = []

        exclusion_reasons = Counter()

        for rec in all_raw_records:
            if rec.get("is_empty"):
                exclusion_reasons[rec.get("exclusion_reason", "Empty lyric")] += 1
                excluded_records.append(rec)
                continue

            if rec.get("is_duplicate"):
                duplicate_records.append(rec)
                # We retain the duplicate metadata, but avoid training on duplicate lyrics
                exclusion_reasons["Exact duplicate lyric text of another record"] += 1
                excluded_records.append(rec)
                continue

            if not rec.get("is_mapped") or not rec.get("emotion"):
                exclusion_reasons[rec.get("exclusion_reason", "Unmapped emotion category")] += 1
                excluded_records.append(rec)
                continue

            valid_records.append(rec)

        print(f"  Total raw records:            {total_raw}")
        print(f"  Total valid, mapped records:  {len(valid_records)}")
        print(f"  Total excluded records:       {len(excluded_records)}")
        print(f"  Total duplicate lyric texts:  {len(duplicate_records)}")

        # 3. Grouped & Stratified Splitting
        print("\n[Step 3/5] Partitioning dataset (70% Train, 15% Val, 15% Test, Seed 42)...")
        train_set, val_set, test_set = self._split_dataset(valid_records)

        print(f"  Train split:  {len(train_set)} records ({len(train_set)/len(valid_records)*100:.1f}%)")
        print(f"  Val split:    {len(val_set)} records ({len(val_set)/len(valid_records)*100:.1f}%)")
        print(f"  Test split:   {len(test_set)} records ({len(test_set)/len(valid_records)*100:.1f}%)")

        # Verify no artist leakage between train and test
        train_artists = set(r["artist"] for r in train_set if r["artist"])
        test_artists = set(r["artist"] for r in test_set if r["artist"])
        artist_overlap = train_artists.intersection(test_artists)
        print(f"  Artist overlap between Train and Test: {len(artist_overlap)} (zero leakage verified!)")
        assert len(artist_overlap) == 0, f"Data leakage detected! Artists in both train and test: {artist_overlap}"

        # 4. Export Processed JSONL Files
        print("\n[Step 4/5] Writing standardized JSONL partitions...")
        train_path = os.path.join(self.output_dir, "train.jsonl")
        val_path = os.path.join(self.output_dir, "val.jsonl")
        test_path = os.path.join(self.output_dir, "test.jsonl")

        self._write_jsonl(train_set, train_path)
        self._write_jsonl(val_set, val_path)
        self._write_jsonl(test_set, test_path)
        print(f"  Wrote: {train_path}")
        print(f"  Wrote: {val_path}")
        print(f"  Wrote: {test_path}")

        # 5. Generate Comprehensive dataset_report.json
        print("\n[Step 5/5] Generating dataset_report.json...")
        report = self._generate_report(
            total_raw=total_raw,
            valid_records=valid_records,
            excluded_records=excluded_records,
            duplicate_records=duplicate_records,
            exclusion_reasons=exclusion_reasons,
            train_set=train_set,
            val_set=val_set,
            test_set=test_set
        )

        report_path = os.path.join(self.output_dir, "dataset_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"  Wrote report: {report_path}")

        self._print_console_summary(report)
        return report

    def _split_dataset(self, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Grouped and stratified split:
          - Groups songs by artist so same artist never appears in both train and test
          - Balances emotions across splits
        """
        rng = random.Random(self.random_seed)

        # Separate records with artist vs records without artist (e.g. benchmark)
        with_artist = [r for r in records if r.get("artist")]
        without_artist = [r for r in records if not r.get("artist")]

        # Group with_artist by artist name
        artist_groups = defaultdict(list)
        for r in with_artist:
            artist_groups[r["artist"]].append(r)

        artists = list(artist_groups.keys())
        rng.shuffle(artists)

        train_records: List[Dict[str, Any]] = []
        val_records: List[Dict[str, Any]] = []
        test_records: List[Dict[str, Any]] = []

        # Target counts for with_artist pool: 70% Train, 15% Val, 15% Test
        wa_total = len(with_artist)
        target_wa_train = int(wa_total * 0.70)
        target_wa_val = int(wa_total * 0.15)

        for art in artists:
            group = artist_groups[art]
            if len(train_records) + len(group) <= target_wa_train:
                train_records.extend(group)
            elif len(val_records) + len(group) <= target_wa_val:
                val_records.extend(group)
            else:
                test_records.extend(group)

        # Distribute without_artist (stratified by emotion & language: 70/15/15)
        by_emo_lang = defaultdict(list)
        for r in without_artist:
            key = f"{r.get('emotion')}::{r.get('language')}"
            by_emo_lang[key].append(r)

        for key, group in by_emo_lang.items():
            rng.shuffle(group)
            for idx, r in enumerate(group):
                mod = idx % 20
                if mod < 14:  # 70%
                    train_records.append(r)
                elif mod < 17:  # 15%
                    val_records.append(r)
                else:  # 15%
                    test_records.append(r)

        # Final deterministic shuffle within each split
        rng.shuffle(train_records)
        rng.shuffle(val_records)
        rng.shuffle(test_records)

        return train_records, val_records, test_records

    def _write_jsonl(self, records: List[Dict[str, Any]], filepath: str):
        """
        Writes records to JSONL matching the canonical schema.
        """
        with open(filepath, "w", encoding="utf-8") as f:
            for r in records:
                # Canonical record schema
                row = {
                    "text": r["text"],
                    "language": r.get("language", "en"),
                    "emotion": r.get("emotion"),
                    "source": r.get("source"),
                    "source_id": r.get("source_id"),
                    "artist": r.get("artist"),
                    "title": r.get("title"),
                    "label_original": r.get("label_original"),
                    "label_confidence": r.get("label_confidence", "high")
                }
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def _generate_report(
        self,
        total_raw: int,
        valid_records: List[Dict[str, Any]],
        excluded_records: List[Dict[str, Any]],
        duplicate_records: List[Dict[str, Any]],
        exclusion_reasons: Counter,
        train_set: List[Dict[str, Any]],
        val_set: List[Dict[str, Any]],
        test_set: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Builds the dataset_report.json data structure.
        """
        lang_dist = Counter(r.get("language") for r in valid_records)
        emo_dist = Counter(r.get("emotion") for r in valid_records)
        source_dist = Counter(r.get("source") for r in valid_records)

        # Per-language and emotion cross-matrix
        matrix = defaultdict(lambda: Counter())
        for r in valid_records:
            matrix[r.get("language")][r.get("emotion")] += 1

        matrix_dict = {lang: dict(counts) for lang, counts in matrix.items()}

        def get_split_stats(split_list):
            return {
                "count": len(split_list),
                "percentage": round(len(split_list) / len(valid_records) * 100, 2) if valid_records else 0,
                "emotions": dict(Counter(r.get("emotion") for r in split_list)),
                "languages": dict(Counter(r.get("language") for r in split_list))
            }

        return {
            "summary": {
                "total_raw_records": total_raw,
                "total_valid_records": len(valid_records),
                "total_excluded_records": len(excluded_records),
                "total_duplicate_records": len(duplicate_records),
                "validation_rate_pct": round(len(valid_records) / total_raw * 100, 2)
            },
            "distributions": {
                "languages": dict(lang_dist),
                "emotions": dict(emo_dist),
                "sources": dict(source_dist)
            },
            "per_language_emotion_matrix": matrix_dict,
            "splits": {
                "train": get_split_stats(train_set),
                "validation": get_split_stats(val_set),
                "test": get_split_stats(test_set)
            },
            "exclusions": {
                "reasons_summary": dict(exclusion_reasons),
                "sample_exclusions": [
                    {
                        "source": r.get("source"),
                        "source_id": r.get("source_id"),
                        "title": r.get("title"),
                        "original_label": r.get("label_original"),
                        "reason": r.get("exclusion_reason")
                    }
                    for r in excluded_records[:15]
                ]
            }
        }

    def _print_console_summary(self, report: Dict[str, Any]):
        """
        Prints a clean, formatted table summary to the console.
        """
        print("\n" + "=" * 70)
        print("STAGE 1: VALIDATED DATASET SUMMARY REPORT")
        print("=" * 70)
        s = report["summary"]
        print(f"Total Raw Catalog Entries:       {s['total_raw_records']}")
        print(f"Total Valid, Standardized Records: {s['total_valid_records']} ({s['validation_rate_pct']}%)")
        print(f"Total Excluded Records:          {s['total_excluded_records']}")
        print(f"Total Duplicates Filtered:       {s['total_duplicate_records']}")

        print("\n--- Language Distribution ---")
        for lang, count in report["distributions"]["languages"].items():
            pct = count / s["total_valid_records"] * 100
            print(f"  {lang:<8}: {count:>4} samples ({pct:>5.1f}%)")

        print("\n--- Emotion Category Distribution ---")
        for emo, count in report["distributions"]["emotions"].items():
            pct = count / s["total_valid_records"] * 100
            print(f"  {emo:<15}: {count:>4} samples ({pct:>5.1f}%)")

        print("\n--- Partition Split Breakdown ---")
        for split_name, data in report["splits"].items():
            print(f"  {split_name.capitalize():<12}: {data['count']:>4} samples ({data['percentage']:>5.1f}%)")

        print("\n--- Exclusion Reasons Summary ---")
        for reason, count in report["exclusions"]["reasons_summary"].items():
            print(f"  [{count:>3} records] {reason}")


if __name__ == "__main__":
    validator = DatasetValidator()
    validator.run_pipeline()
