"""
EmoLyrics Stage 2 Integrator & Multilingual Balancer
Integrates Group A (Song Lyrics: MIREX & Benchmark) with Group B (General Emotion Text:
GoEmotions, XED French/Spanish, BEmoC Bengali, Hindi Corpus).

Guarantees:
  1. Explicit domain preservation (domain: 'lyrics', 'social_media', 'general_text')
  2. Balanced representation across all 5 languages (prevents large datasets from swamping smaller languages)
  3. Zero data leakage (artist-grouped on lyrics, deduplication across all domains)
  4. 70% Train, 15% Val, 15% Test partitioning (deterministic Seed 42)
  5. Canonical JSONL output schema and detailed combined_dataset_report.json
"""

import os
import json
import random
import hashlib
import re
from collections import Counter, defaultdict
from typing import Dict, Any, List, Tuple

from .label_mapping import LabelMapper
from .data_loader import (
    LanguageDetector,
    MirexLoader,
    BenchmarkLoader,
    GoEmotionsLoader,
    XEDLoader,
    BEmoCLoader,
    HindiCorpusLoader
)

BASE_ML_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_ML_DIR, "datasets", "raw")
PROCESSED_DIR = os.path.join(BASE_ML_DIR, "datasets", "processed")
BENCHMARK_PATH = os.path.abspath(os.path.join(BASE_ML_DIR, "..", "backend", "nlp", "benchmark", "dataset.json"))


class Stage2Integrator:
    def __init__(
        self,
        raw_dir: str = RAW_DIR,
        benchmark_path: str = BENCHMARK_PATH,
        output_dir: str = PROCESSED_DIR,
        random_seed: int = 42,
        quota_per_emo_lang: int = 120
    ):
        self.raw_dir = raw_dir
        self.benchmark_path = benchmark_path
        self.output_dir = output_dir
        self.random_seed = random_seed
        self.quota_per_emo_lang = quota_per_emo_lang
        self.label_mapper = LabelMapper()
        self.lang_detector = LanguageDetector()
        os.makedirs(self.output_dir, exist_ok=True)

    def run_integration(self) -> Dict[str, Any]:
        print("=" * 70)
        print("EMOLYRICS STAGE 2: MULTILINGUAL DATASET INTEGRATION PIPELINE")
        print("=" * 70)

        rng = random.Random(self.random_seed)

        # -------------------------------------------------------------------
        # 1. Ingest All Source Records
        # -------------------------------------------------------------------
        print("\n[Step 1/5] Ingesting all approved multilingual datasets...")

        # Group A: Lyrics
        mirex_loader = MirexLoader(os.path.join(self.raw_dir, "mirex"), self.label_mapper)
        mirex_raw = mirex_loader.load_records()
        print(f"  [Group A - Lyrics] MIREX:               {len(mirex_raw)} raw records")

        bench_raw = []
        if os.path.exists(self.benchmark_path):
            bench_loader = BenchmarkLoader(self.benchmark_path, self.label_mapper)
            bench_raw = bench_loader.load_records()
        print(f"  [Group A - Lyrics] Benchmark:           {len(bench_raw)} raw records")

        # Group B: General Emotion Text
        goemo_loader = GoEmotionsLoader(os.path.join(self.raw_dir, "goemotions"), self.label_mapper)
        goemo_raw = goemo_loader.load_records()
        print(f"  [Group B - Social Media] GoEmotions:    {len(goemo_raw)} raw records")

        xed_loader = XEDLoader(os.path.join(self.raw_dir, "xed"), self.label_mapper)
        xed_raw = xed_loader.load_records()
        print(f"  [Group B - General Text] XED (fr & es): {len(xed_raw)} raw records")

        bemoc_loader = BEmoCLoader(os.path.join(self.raw_dir, "bemoc"), self.label_mapper)
        bemoc_raw = bemoc_loader.load_records()
        print(f"  [Group B - General Text] BEmoC (bn):    {len(bemoc_raw)} raw records")

        hindi_loader = HindiCorpusLoader(os.path.join(self.raw_dir, "hindi_corpus"), self.label_mapper)
        hindi_raw = hindi_loader.load_records()
        print(f"  [Group B - General Text] Hindi Corpus:  {len(hindi_raw)} raw records")

        all_raw = {
            "mirex": mirex_raw,
            "benchmark": bench_raw,
            "goemotions": goemo_raw,
            "xed": xed_raw,
            "bemoc": bemoc_raw,
            "hindi_corpus": hindi_raw
        }
        total_raw_count = sum(len(v) for v in all_raw.values())
        print(f"  Total raw candidate entries audited:   {total_raw_count}")

        # -------------------------------------------------------------------
        # 2. Quality Filtering, Deduplication & Validation
        # -------------------------------------------------------------------
        print("\n[Step 2/5] Filtering valid records and eliminating duplicates...")

        seen_text_hashes: Dict[str, str] = {}
        valid_by_source: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        excluded_records: List[Dict[str, Any]] = []
        exclusion_reasons: Counter = Counter()

        for source_name, records in all_raw.items():
            for r in records:
                text = (r.get("text") or "").strip()
                if not text:
                    exclusion_reasons["Empty text"] += 1
                    excluded_records.append(r)
                    continue

                if not r.get("is_mapped") or not r.get("emotion"):
                    reason = r.get("exclusion_reason") or f"Unmapped emotion: {r.get('label_original')}"
                    exclusion_reasons[reason] += 1
                    excluded_records.append(r)
                    continue

                # Cross-dataset text deduplication
                norm_text = re.sub(r"\s+", " ", text.lower()).strip()
                thash = hashlib.md5(norm_text.encode("utf-8")).hexdigest()
                if thash in seen_text_hashes:
                    exclusion_reasons["Duplicate text across datasets"] += 1
                    r["is_duplicate"] = True
                    excluded_records.append(r)
                    continue

                seen_text_hashes[thash] = f"{source_name}_{r.get('source_id')}"
                valid_by_source[source_name].append(r)

        valid_pool_count = sum(len(v) for v in valid_by_source.values())
        print(f"  Total valid, non-duplicate mapped records: {valid_pool_count}")

        # -------------------------------------------------------------------
        # 3. Multilingual Balancing & Supplementary Stratification
        # -------------------------------------------------------------------
        print("\n[Step 3/5] Applying multilingual balanced sampling quota...")

        balanced_records: List[Dict[str, Any]] = []

        # Retain 100% of Group A (Lyrics)
        for r in valid_by_source["mirex"]:
            balanced_records.append(r)
        for r in valid_by_source["benchmark"]:
            balanced_records.append(r)

        lyrics_count = len(balanced_records)
        print(f"  Preserved 100% of Group A (Song Lyrics): {lyrics_count} samples")

        # For Group B (General Emotion Text): Balance across languages and emotions
        group_b_pool = (
            valid_by_source["goemotions"] +
            valid_by_source["xed"] +
            valid_by_source["bemoc"] +
            valid_by_source["hindi_corpus"]
        )

        b_by_lang_emo = defaultdict(list)
        for r in group_b_pool:
            key = (r["language"], r["emotion"])
            b_by_lang_emo[key].append(r)

        group_b_selected: List[Dict[str, Any]] = []
        for key, recs in b_by_lang_emo.items():
            rng.shuffle(recs)
            # Take up to quota
            selected = recs[:self.quota_per_emo_lang]
            group_b_selected.extend(selected)

        balanced_records.extend(group_b_selected)
        total_integrated = len(balanced_records)
        print(f"  Balanced Group B (Supplementary Text):    {len(group_b_selected)} samples")
        print(f"  Total Integrated Balanced Dataset:        {total_integrated} samples")

        # -------------------------------------------------------------------
        # 4. Partitioning: Train (70%), Val (15%), Test (15%) with Leakage Protection
        # -------------------------------------------------------------------
        print("\n[Step 4/5] Partitioning integrated dataset (70/15/15, Seed 42)...")
        train_set, val_set, test_set = self._partition_dataset(balanced_records)

        # Check artist leakage in lyrics domain
        train_artists = set(r["artist"] for r in train_set if r.get("domain") == "lyrics" and r.get("artist"))
        test_artists = set(r["artist"] for r in test_set if r.get("domain") == "lyrics" and r.get("artist"))
        artist_overlap = train_artists.intersection(test_artists)
        assert len(artist_overlap) == 0, f"Artist leakage detected in lyrics: {artist_overlap}"
        print(f"  Artist overlap between Train and Test in lyrics: 0 (ZERO LEAKAGE PASSED)")

        # Write canonical JSONL files
        train_path = os.path.join(self.output_dir, "train_combined.jsonl")
        val_path = os.path.join(self.output_dir, "val_combined.jsonl")
        test_path = os.path.join(self.output_dir, "test_combined.jsonl")

        self._write_jsonl(train_set, train_path)
        self._write_jsonl(val_set, val_path)
        self._write_jsonl(test_set, test_path)
        print(f"  Wrote: {train_path} ({len(train_set)} rows, {len(train_set)/total_integrated*100:.1f}%)")
        print(f"  Wrote: {val_path} ({len(val_set)} rows, {len(val_set)/total_integrated*100:.1f}%)")
        print(f"  Wrote: {test_path} ({len(test_set)} rows, {len(test_set)/total_integrated*100:.1f}%)")

        # -------------------------------------------------------------------
        # 5. Generate Comprehensive Combined Report
        # -------------------------------------------------------------------
        print("\n[Step 5/5] Generating combined_dataset_report.json...")
        report = self._generate_report(
            total_raw_count=total_raw_count,
            all_raw=all_raw,
            valid_pool_count=valid_pool_count,
            balanced_records=balanced_records,
            train_set=train_set,
            val_set=val_set,
            test_set=test_set,
            exclusion_reasons=exclusion_reasons
        )

        report_path = os.path.join(self.output_dir, "combined_dataset_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"  Wrote report: {report_path}")

        self._print_console_summary(report)
        return report

    def _partition_dataset(self, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        rng = random.Random(self.random_seed)

        lyrics_with_artist = [r for r in records if r.get("domain") == "lyrics" and r.get("artist")]
        other_records = [r for r in records if not (r.get("domain") == "lyrics" and r.get("artist"))]

        # 1. Group lyrics by artist
        artist_groups = defaultdict(list)
        for r in lyrics_with_artist:
            artist_groups[r["artist"]].append(r)

        artists = list(artist_groups.keys())
        rng.shuffle(artists)

        train_set: List[Dict[str, Any]] = []
        val_set: List[Dict[str, Any]] = []
        test_set: List[Dict[str, Any]] = []

        target_lwa_train = int(len(lyrics_with_artist) * 0.70)
        target_lwa_val = int(len(lyrics_with_artist) * 0.15)

        for art in artists:
            group = artist_groups[art]
            if len(train_set) + len(group) <= target_lwa_train:
                train_set.extend(group)
            elif len(val_set) + len(group) <= target_lwa_val:
                val_set.extend(group)
            else:
                test_set.extend(group)

        # 2. Stratify non-artist records by (domain, language, emotion)
        strat_bins = defaultdict(list)
        for r in other_records:
            key = (r.get("domain"), r.get("language"), r.get("emotion"))
            strat_bins[key].append(r)

        for key, bin_recs in strat_bins.items():
            rng.shuffle(bin_recs)
            for idx, r in enumerate(bin_recs):
                mod = idx % 20
                if mod < 14:  # 70%
                    train_set.append(r)
                elif mod < 17:  # 15%
                    val_set.append(r)
                else:  # 15%
                    test_set.append(r)

        rng.shuffle(train_set)
        rng.shuffle(val_set)
        rng.shuffle(test_set)

        return train_set, val_set, test_set

    def _write_jsonl(self, records: List[Dict[str, Any]], filepath: str):
        with open(filepath, "w", encoding="utf-8") as f:
            for r in records:
                row = {
                    "text": r["text"],
                    "language": r.get("language", "en"),
                    "emotion": r.get("emotion"),
                    "source": r.get("source"),
                    "source_id": r.get("source_id"),
                    "artist": r.get("artist"),
                    "title": r.get("title"),
                    "label_original": r.get("label_original"),
                    "domain": r.get("domain", "general_text"),
                    "label_confidence": r.get("label_confidence", "high")
                }
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

    def _generate_report(
        self,
        total_raw_count: int,
        all_raw: Dict[str, List[Dict[str, Any]]],
        valid_pool_count: int,
        balanced_records: List[Dict[str, Any]],
        train_set: List[Dict[str, Any]],
        val_set: List[Dict[str, Any]],
        test_set: List[Dict[str, Any]],
        exclusion_reasons: Counter
    ) -> Dict[str, Any]:
        total_integrated = len(balanced_records)

        lang_counts = dict(Counter(r["language"] for r in balanced_records))
        emo_counts = dict(Counter(r["emotion"] for r in balanced_records))
        domain_counts = dict(Counter(r["domain"] for r in balanced_records))
        source_counts = dict(Counter(r["source"] for r in balanced_records))

        # Matrices
        lang_emo_matrix = defaultdict(lambda: Counter())
        domain_emo_matrix = defaultdict(lambda: Counter())

        for r in balanced_records:
            lang_emo_matrix[r["language"]][r["emotion"]] += 1
            domain_emo_matrix[r["domain"]][r["emotion"]] += 1

        source_stats = {}
        for src, recs in all_raw.items():
            valid_src = [r for r in balanced_records if r.get("source") == src]
            source_stats[src] = {
                "total_raw": len(recs),
                "integrated_in_balanced_dataset": len(valid_src)
            }

        return {
            "summary": {
                "total_raw_audited": total_raw_count,
                "total_valid_pool": valid_pool_count,
                "total_integrated_samples": total_integrated,
                "target_languages_covered": len(lang_counts),
                "target_emotions_covered": len(emo_counts),
                "domains_represented": list(domain_counts.keys())
            },
            "distributions": {
                "languages": lang_counts,
                "emotions": emo_counts,
                "domains": domain_counts,
                "sources": source_counts
            },
            "source_breakdown": source_stats,
            "cross_matrices": {
                "language_by_emotion": {k: dict(v) for k, v in lang_emo_matrix.items()},
                "domain_by_emotion": {k: dict(v) for k, v in domain_emo_matrix.items()}
            },
            "splits": {
                "train": {
                    "count": len(train_set),
                    "percentage": round(len(train_set) / total_integrated * 100, 2),
                    "emotions": dict(Counter(r["emotion"] for r in train_set)),
                    "languages": dict(Counter(r["language"] for r in train_set)),
                    "domains": dict(Counter(r["domain"] for r in train_set))
                },
                "validation": {
                    "count": len(val_set),
                    "percentage": round(len(val_set) / total_integrated * 100, 2),
                    "emotions": dict(Counter(r["emotion"] for r in val_set)),
                    "languages": dict(Counter(r["language"] for r in val_set)),
                    "domains": dict(Counter(r["domain"] for r in val_set))
                },
                "test": {
                    "count": len(test_set),
                    "percentage": round(len(test_set) / total_integrated * 100, 2),
                    "emotions": dict(Counter(r["emotion"] for r in test_set)),
                    "languages": dict(Counter(r["language"] for r in test_set)),
                    "domains": dict(Counter(r["domain"] for r in test_set))
                }
            },
            "leakage_verification": {
                "artist_leakage_in_lyrics": 0,
                "duplicate_leakage_status": "PASSED"
            },
            "top_exclusion_reasons": dict(exclusion_reasons.most_common(10))
        }

    def _print_console_summary(self, report: Dict[str, Any]):
        print("\n" + "=" * 70)
        print("STAGE 2 COMBINED MULTILINGUAL DATASET SUMMARY REPORT")
        print("=" * 70)
        s = report["summary"]
        print(f"Total Raw Entries Audited:        {s['total_raw_audited']}")
        print(f"Total Valid Pool:                 {s['total_valid_pool']}")
        print(f"Total Integrated Samples:         {s['total_integrated_samples']}")

        print("\n--- Language Distribution ---")
        for lang, count in sorted(report["distributions"]["languages"].items(), key=lambda x: x[1], reverse=True):
            pct = count / s["total_integrated_samples"] * 100
            print(f"  {lang:<8}: {count:>5} samples ({pct:>5.1f}%)")

        print("\n--- Domain Separation Distribution ---")
        for dom, count in sorted(report["distributions"]["domains"].items(), key=lambda x: x[1], reverse=True):
            pct = count / s["total_integrated_samples"] * 100
            print(f"  {dom:<14}: {count:>5} samples ({pct:>5.1f}%)")

        print("\n--- Emotion Distribution ---")
        for emo, count in sorted(report["distributions"]["emotions"].items(), key=lambda x: x[1], reverse=True):
            pct = count / s["total_integrated_samples"] * 100
            print(f"  {emo:<14}: {count:>5} samples ({pct:>5.1f}%)")

        print("\n--- Partition Splits ---")
        for sp, data in report["splits"].items():
            print(f"  {sp.capitalize():<12}: {data['count']:>5} samples ({data['percentage']:>5.1f}%)")


if __name__ == "__main__":
    integrator = Stage2Integrator()
    integrator.run_integration()

