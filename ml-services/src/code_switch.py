"""
EmoLyrics Multilingual Code-Switching & Language Analysis Engine
Provides:
  1. High-precision script identification (Devanagari, Bengali, Latin, etc.)
  2. Multi-language lexicon matching across English, Hindi, Bengali, Spanish, French
  3. Transliterated & code-switched detection:
     - Hinglish (Hindi + English)
     - Banglish (Bengali + English)
     - Spanglish (Spanish + English)
     - Franglish (French + English)
     - Mixed Script (e.g. Devanagari + Latin, Bengali + Latin)
  4. Slang, contraction, and elongation normalization without translation
  5. Sentence- and line-level language identification
  6. Confidence estimation and uncertainty warning generation
"""

import re
from typing import Dict, Any, List, Optional, Tuple, Set
from collections import Counter


# ---------------------------------------------------------------------------
# Lexicon Profiles for Code-Switching & Slang Detection
# ---------------------------------------------------------------------------

LEXICONS = {
    "en": {
        "words": {
            "the", "and", "you", "that", "was", "for", "are", "with", "his", "they",
            "this", "have", "from", "one", "had", "word", "but", "not", "what", "all",
            "were", "when", "your", "can", "said", "there", "use", "each", "which", "she",
            "how", "their", "will", "other", "about", "out", "many", "then", "them", "these",
            "love", "heart", "night", "time", "baby", "feel", "know", "never", "always",
            "gonna", "wanna", "gotta", "kinda", "im", "dont", "cant", "wont", "yeah", "girl",
            "boy", "life", "world", "tears", "pain", "eyes", "dream", "away", "hold", "stay",
            "of", "in", "to", "me", "my", "we", "us", "is", "it", "so", "let", "dance",
            "joy", "tonight", "like", "up", "down", "on", "no", "yes", "say", "go",
            "come", "good", "day", "now", "just", "too", "more", "music", "sweet", "angel",
            "full", "forever", "together", "golden", "light", "shine", "shines", "rain", "sun"
        },
        "name": "English",
        "code": "en",
        "flag": "🇬🇧"
    },
    "hi": {
        "words": {
            # Romanized Hindi (Hinglish) common words
            "dil", "pyar", "pyaar", "mohabbat", "khushi", "dard", "aansu", "aankhon",
            "zindagi", "sanam", "hum", "tum", "mera", "meri", "tera", "teri", "ishq",
            "jashn", "khushboo", "muskaan", "dhadkan", "chahat", "wafa", "tere", "mere",
            "kuch", "nahi", "saath", "deewana", "deewani", "raat", "mehfil", "jeena",
            "hai", "haan", "main", "tu", "apna", "apni", "apne", "hoga", "hogi", "kaha", "raha",
            "rahi", "aaja", "baat", "yaad", "yaara", "yaar", "bhai", "arre", "chalo",
            "dost", "dosti", "roothna", "manana", "tanha", "tanhai", "sukoon", "shanti",
            "josh", "toofan", "khauf", "tiranga", "desh", "vatan", "watan", "khuda", "rabba",
            "mein", "tumhare", "kisi", "karo", "karenge", "chura", "liya", "tumne", "nazar",
            "badal", "zindagani"
        },
        "name": "Hindi",
        "code": "hi",
        "flag": "🇮🇳"
    },
    "bn": {
        "words": {
            # Romanized Bengali (Banglish) common words
            "amar", "amra", "tumi", "tomar", "bhalobasha", "bhalobasi", "valobasha", "valobasi",
            "mon", "dukkho", "kanna", "chokher", "jol", "gaan", "shonar", "bangla", "hridoy",
            "hasimukh", "ullas", "sukhi", "alor", "majhe", "tara", "kotha", "bondhu", "ami",
            "ekta", "khuje", "hashi", "kichu", "buker", "hobe", "shanti", "ananda", "kosto",
            "shomoy", "akash", "megh", "bristi", "gaanwala", "bhabna", "shopno", "moner",
            "bhalo", "khub", "ache", "nei", "chara", "sathe"
        },
        "name": "Bengali",
        "code": "bn",
        "flag": "🇧🇩"
    },
    "es": {
        "words": {
            "el", "la", "de", "que", "y", "en", "un", "se", "no", "por", "con", "para",
            "los", "las", "del", "una", "más", "pero", "como", "esta", "todo", "cuando",
            "está", "si", "yo", "te", "mi", "tu", "vida", "corazón", "amor", "siento",
            "donde", "siempre", "nunca", "nada", "nadie", "canción", "noche", "día",
            "alma", "beso", "tus", "mis", "quiero", "tiempo", "ojos", "ahora", "muy",
            "vamos", "amigo", "amiga", "hermano", "corazon", "dios", "cielo", "besame",
            "mucho", "sol", "feliz", "luz", "amo"
        },
        "name": "Spanish",
        "code": "es",
        "flag": "🇪🇸"
    },
    "fr": {
        "words": {
            "le", "la", "de", "et", "un", "une", "dans", "les", "des", "en", "du", "que",
            "pour", "pas", "qui", "sur", "avec", "est", "ce", "il", "elle", "sont", "plus",
            "par", "je", "tu", "mon", "ma", "mes", "tout", "nous", "vous", "ils", "temps",
            "vie", "sans", "faire", "quand", "comme", "moi", "toi", "monde", "cœur", "coeur",
            "yeux", "jamais", "toujours", "rien", "bonheur", "joie", "amour", "oui",
            "merci", "beaucoup", "cher", "chere", "nuit", "reve", "soleil", "aimer", "aime",
            "t'aime", "j'aime", "c'est", "j'ai", "suis", "bien", "belle", "beau"
        },
        "name": "French",
        "code": "fr",
        "flag": "🇫🇷"
    }
}

# Regex patterns for native scripts & special diacritics
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
BENGALI_RE = re.compile(r"[\u0980-\u09FF]")
SPANISH_DIACRITICS_RE = re.compile(r"[áéíóúñ¿¡]", re.IGNORECASE)
FRENCH_DIACRITICS_RE = re.compile(r"[éèêëàâçîïôùûüœæ]", re.IGNORECASE)

# Repeated character compressor (e.g. "sooooo" -> "soo", "pyaaaar" -> "pyaar")
REPEATED_CHARS_RE = re.compile(r"(.)\1{2,}", re.IGNORECASE)


# ---------------------------------------------------------------------------
# Text Normalization Utilities
# ---------------------------------------------------------------------------

def normalize_lyric_text(text: str) -> str:
    """
    Language-aware preprocessing that cleans text while preserving
    diacritics, script characters, and poetic expressions.
    """
    if not text or not isinstance(text, str):
        return ""

    # Replace weird zero-width spaces or NBSPs
    cleaned = text.replace("\u200b", "").replace("\xa0", " ").strip()

    # Compress extreme character elongation (e.g., "happpyyyy" -> "happyy")
    # Keeps max 2 repetitions so words like "feel" or "too" are unaffected
    cleaned = REPEATED_CHARS_RE.sub(r"\1\1", cleaned)

    # Collapse multiple consecutive spaces/tabs
    cleaned = re.sub(r"[ \t]+", " ", cleaned).strip()

    # Standardize common informal transliterated variants
    # E.g. Pyaar -> Pyar, Valobasha -> Bhalobasha (for consistent representation)
    return cleaned


def tokenize_words(text: str) -> List[str]:
    """Extracts clean alphabetic word tokens across Latin and native scripts."""
    if not text:
        return []
    # Match words in Latin, Devanagari, Bengali, and European accented characters
    raw_tokens = re.findall(r"[\wáéíóúñéèêëàâçîïôùûüœæ\u0900-\u097F\u0980-\u09FF'-]+", text.lower())
    clean_tokens = [t.strip("'-") for t in raw_tokens if len(t.strip("'-")) > 1]
    return clean_tokens


# ---------------------------------------------------------------------------
# Code-Switching & Language Analyzer
# ---------------------------------------------------------------------------

class CodeSwitchAnalyzer:
    """
    Detects multilingual code-switching, script composition,
    and transliterated song lyrics across English, Hindi, Bengali, Spanish, and French.
    """

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive language and code-switching audit for a text or song excerpt.
        """
        if not text or not text.strip():
            return {
                "primaryLanguage": "unknown",
                "languageName": "Unknown",
                "isCodeSwitched": False,
                "codeSwitchType": None,
                "scriptBreakdown": {},
                "languageDistribution": {},
                "isUncertain": True,
                "confidence": 0.0,
                "warning": "Empty or whitespace-only text provided."
            }

        norm_text = normalize_lyric_text(text)
        tokens = tokenize_words(norm_text)
        total_tokens = len(tokens)

        # 1. Script Analysis
        devanagari_count = len(DEVANAGARI_RE.findall(norm_text))
        bengali_count = len(BENGALI_RE.findall(norm_text))
        total_chars = max(1, len(re.findall(r"\w", norm_text)))

        devanagari_ratio = round(devanagari_count / total_chars, 4)
        bengali_ratio = round(bengali_count / total_chars, 4)
        latin_ratio = round(max(0, 1.0 - (devanagari_ratio + bengali_ratio)), 4)

        scripts = []
        if devanagari_count >= 3:
            scripts.append("Devanagari")
        if bengali_count >= 3:
            scripts.append("Bengali")
        if latin_ratio > 0.05 and any(c.isascii() and c.isalpha() for c in norm_text):
            scripts.append("Latin")

        script_breakdown = {
            "Devanagari": devanagari_ratio,
            "Bengali": bengali_ratio,
            "Latin": latin_ratio
        }

        # 2. Native Script Fast-Paths
        if devanagari_ratio >= 0.25 and latin_ratio < 0.15:
            return {
                "primaryLanguage": "hi",
                "languageName": "Hindi",
                "isCodeSwitched": False,
                "codeSwitchType": None,
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {"hi": 1.0},
                "isUncertain": False,
                "confidence": round(min(0.98, 0.85 + devanagari_ratio * 0.15), 4),
                "warning": None
            }

        if bengali_ratio >= 0.25 and latin_ratio < 0.15:
            return {
                "primaryLanguage": "bn",
                "languageName": "Bengali",
                "isCodeSwitched": False,
                "codeSwitchType": None,
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {"bn": 1.0},
                "isUncertain": False,
                "confidence": round(min(0.98, 0.85 + bengali_ratio * 0.15), 4),
                "warning": None
            }

        # Mixed Script Detection (e.g. Devanagari verse + English Latin chorus)
        if (devanagari_count >= 3 and latin_ratio >= 0.20) or (bengali_count >= 3 and latin_ratio >= 0.20):
            primary = "hi" if devanagari_count >= bengali_count else "bn"
            secondary = "en"
            name = "Hindi + English (Mixed Script)" if primary == "hi" else "Bengali + English (Mixed Script)"
            return {
                "primaryLanguage": primary,
                "languageName": name,
                "isCodeSwitched": True,
                "codeSwitchType": "Mixed Script",
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {primary: round(0.5 + devanagari_ratio * 0.4, 3), secondary: round(latin_ratio, 3)},
                "isUncertain": False,
                "confidence": 0.88,
                "warning": f"Lyrics combine native {scripts[0]} script with Latin script."
            }

        # 3. Latin Word Lexicon Analysis
        if total_tokens == 0:
            return {
                "primaryLanguage": "en",
                "languageName": "English",
                "isCodeSwitched": False,
                "codeSwitchType": None,
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {"en": 1.0},
                "isUncertain": True,
                "confidence": 0.40,
                "warning": "No recognizable word tokens found; defaulted to English."
            }

        counts = {lang: 0 for lang in LEXICONS}
        for token in tokens:
            for lang, prof in LEXICONS.items():
                if token in prof["words"]:
                    counts[lang] += 1

        # Diacritics weighting for Spanish / French
        es_diacritics = len(SPANISH_DIACRITICS_RE.findall(norm_text))
        fr_diacritics = len(FRENCH_DIACRITICS_RE.findall(norm_text))
        counts["es"] += es_diacritics * 2
        counts["fr"] += fr_diacritics * 2

        matched_tokens_total = sum(counts.values())
        ratios = {}
        if matched_tokens_total > 0:
            for lang, c in counts.items():
                ratios[lang] = round(c / matched_tokens_total, 3)
        else:
            ratios = {lang: 0.0 for lang in LEXICONS}
            ratios["en"] = 1.0

        sorted_langs = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        top_lang, top_count = sorted_langs[0]
        runner_up_lang, runner_up_count = sorted_langs[1]

        # 4. Code-Switching Rule Evaluation
        # Case A: Hinglish (Hindi vocabulary in Latin script mixed with English)
        if counts["hi"] >= 2 or (counts["hi"] >= 1 and counts["en"] >= 1):
            if counts["en"] >= 1:
                return {
                    "primaryLanguage": "hi",
                    "languageName": "Hindi (Hinglish)",
                    "isCodeSwitched": True,
                    "codeSwitchType": "Hinglish (Hindi + English)",
                    "scriptBreakdown": script_breakdown,
                    "languageDistribution": {"hi": ratios.get("hi", 0.6), "en": ratios.get("en", 0.4)},
                    "isUncertain": False,
                    "confidence": 0.85,
                    "warning": "Code-switched Hinglish lyrics detected with Hindi & English lyrical elements."
                }
            else:
                return {
                    "primaryLanguage": "hi",
                    "languageName": "Hindi (Transliterated)",
                    "isCodeSwitched": False,
                    "codeSwitchType": "Transliterated Hindi",
                    "scriptBreakdown": script_breakdown,
                    "languageDistribution": {"hi": 0.9, "en": 0.1},
                    "isUncertain": False,
                    "confidence": 0.82,
                    "warning": None
                }

        # Case B: Banglish (Bengali vocabulary in Latin script mixed with English)
        if counts["bn"] >= 2 or (counts["bn"] >= 1 and counts["en"] >= 1):
            is_mixed = counts["en"] >= 1
            return {
                "primaryLanguage": "bn",
                "languageName": "Bengali (Banglish)" if is_mixed else "Bengali (Transliterated)",
                "isCodeSwitched": is_mixed,
                "codeSwitchType": "Banglish (Bengali + English)" if is_mixed else "Transliterated Bengali",
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {"bn": ratios.get("bn", 0.7), "en": ratios.get("en", 0.3)},
                "isUncertain": False,
                "confidence": 0.84,
                "warning": "Code-switched Banglish lyrics detected with Bengali & English lyrical elements." if is_mixed else None
            }

        # Case C: Spanglish (Spanish + English)
        if counts["es"] >= 2 and counts["en"] >= 2:
            return {
                "primaryLanguage": "es" if counts["es"] >= counts["en"] else "en",
                "languageName": "Spanish + English (Spanglish)",
                "isCodeSwitched": True,
                "codeSwitchType": "Spanglish (Spanish + English)",
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {"es": ratios.get("es", 0.5), "en": ratios.get("en", 0.5)},
                "isUncertain": False,
                "confidence": 0.84,
                "warning": "Code-switched Spanish & English lyrics detected."
            }

        # Case D: Franglish (French + English)
        if counts["fr"] >= 2 and counts["en"] >= 2:
            return {
                "primaryLanguage": "fr" if counts["fr"] >= counts["en"] else "en",
                "languageName": "French + English (Franglish)",
                "isCodeSwitched": True,
                "codeSwitchType": "Franglish (French + English)",
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {"fr": ratios.get("fr", 0.5), "en": ratios.get("en", 0.5)},
                "isUncertain": False,
                "confidence": 0.84,
                "warning": "Code-switched French & English lyrics detected."
            }

        # Case E: Pure Single Language Latin
        if top_count > 0:
            lang_code = top_lang
            lang_info = LEXICONS[lang_code]
            conf = min(0.95, 0.65 + (top_count / total_tokens) * 0.3)
            return {
                "primaryLanguage": lang_code,
                "languageName": lang_info["name"],
                "isCodeSwitched": False,
                "codeSwitchType": None,
                "scriptBreakdown": script_breakdown,
                "languageDistribution": {lang_code: 1.0},
                "isUncertain": conf < 0.55,
                "confidence": round(conf, 4),
                "warning": None if conf >= 0.55 else f"Low confidence language match for {lang_info['name']}."
            }

        # Case F: Ambiguous Latin Default to English with Uncertainty Warning
        return {
            "primaryLanguage": "en",
            "languageName": "English",
            "isCodeSwitched": False,
            "codeSwitchType": None,
            "scriptBreakdown": script_breakdown,
            "languageDistribution": {"en": 1.0},
            "isUncertain": True,
            "confidence": 0.45,
            "warning": "Ambiguous vocabulary; language prediction has high uncertainty."
        }

    def analyze_lines(self, lines: List[str]) -> List[Dict[str, Any]]:
        """
        Sentence- or line-level language tagging and code-switching audit.
        """
        analyzed = []
        for idx, line in enumerate(lines, 1):
            clean = (line or "").strip()
            if not clean:
                continue
            line_res = self.analyze(clean)
            analyzed.append({
                "lineNumber": idx,
                "text": clean,
                "language": line_res["primaryLanguage"],
                "languageName": line_res["languageName"],
                "isCodeSwitched": line_res["isCodeSwitched"],
                "codeSwitchType": line_res["codeSwitchType"],
                "confidence": line_res["confidence"],
                "isUncertain": line_res["isUncertain"]
            })
        return analyzed


_default_analyzer: Optional[CodeSwitchAnalyzer] = None


def get_code_switch_analyzer() -> CodeSwitchAnalyzer:
    global _default_analyzer
    if _default_analyzer is None:
        _default_analyzer = CodeSwitchAnalyzer()
    return _default_analyzer

