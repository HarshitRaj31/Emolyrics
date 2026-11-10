/**
 * EmoLyrics Multilingual NLP Preprocessor
 * Unicode-safe normalization, script-aware tokenization, contraction expansion,
 * and language-specific stopword filtering.
 */

// Language-specific non-emotional stopword sets (removes purely syntactic glue while preserving emotional cues)
const STOPWORDS_BY_LANG = {
  en: new Set([
    "a", "about", "above", "after", "again", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "by", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
    "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
    "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to",
    "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where",
    "which", "while", "who", "whom", "why", "with", "would", "you", "your", "yours"
  ]),
  es: new Set([
    "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a",
    "en", "con", "por", "para", "sin", "sobre", "tras", "durante", "mediante",
    "que", "quien", "cual", "cuyo", "como", "donde", "cuando", "cuanto",
    "y", "e", "ni", "o", "u", "pero", "mas", "sino", "aunque", "porque",
    "yo", "tu", "el", "ella", "nosotros", "vosotros", "ellos", "ellas",
    "me", "te", "se", "nos", "os", "le", "les", "lo", "la", "mi", "tu", "su",
    "este", "esta", "estos", "estas", "ese", "esa", "aquel", "aquella"
  ]),
  fr: new Set([
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "au", "aux",
    "dans", "sur", "sous", "avec", "sans", "par", "pour", "vers", "chez",
    "et", "ou", "mais", "donc", "or", "ni", "car", "que", "qui", "quoi",
    "dont", "ou", "quand", "comment", "pourquoi",
    "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
    "me", "te", "se", "lui", "leur", "y", "en",
    "mon", "ton", "son", "ma", "ta", "sa", "mes", "tes", "ses",
    "ce", "cet", "cette", "ces", "ceci", "cela"
  ]),
  hi: new Set([
    "का", "के", "की", "को", "में", "से", "पर", "ने", "और", "या", "भी", "तो",
    "है", "हैं", "था", "थे", "थी", "हो", "हुए", "हुआ", "हुई", "रहा", "रहे", "रही",
    "यह", "वह", "ये", "वे", "इस", "उस", "इन", "उन", "कि", "जो", "तो", "जब", "तब"
  ]),
  bn: new Set([
    "এর", "কে", "তে", "এ", "থেকে", "চেয়ে", "দিয়ে", "দ্বারা", "এবং", "ও", "বা", "কিন্তু",
    "হয়", "হচ্ছে", "ছিল", "হবে", "আছে", "ছিল", "এই", "সেই", "তা", "যা", "যে", "কি",
    "না", "তো", "আর", "যেন", "তবে", "যদি", "তখন", "এখন"
  ])
};

/**
 * Normalize repeated characters (e.g. "sooooo" -> "soo", "haaaan" -> "haan")
 */
function normalizeRepeatedCharacters(text) {
  // Collapse 3 or more repeated letters down to 2
  return text.replace(/(\p{L})\1{2,}/gu, "$1$1");
}

/**
 * Handle language-specific contractions & punctuation
 */
function normalizeContractions(text, langCode = "en") {
  let normalized = text;

  if (langCode === "fr") {
    // French elisions: l'amour -> l' amour, d'un -> d' un, c'est -> c' est
    normalized = normalized.replace(/\b([cjdlnmstqcJDNLMSTQC]|qu)[''](\p{L})/gu, "$1' $2");
  } else if (langCode === "en") {
    // English contractions
    normalized = normalized
      .replace(/\bwon't\b/gi, "will not")
      .replace(/\bcan't\b/gi, "can not")
      .replace(/\bn't\b/gi, " not")
      .replace(/\b're\b/gi, " are")
      .replace(/\b's\b/gi, " is")
      .replace(/\b'd\b/gi, " would")
      .replace(/\b'll\b/gi, " will")
      .replace(/\b've\b/gi, " have")
      .replace(/\b'm\b/gi, " am");
  }

  // Strip Spanish inverted punctuation ¿ and ¡
  normalized = normalized.replace(/[¿¡]/g, " ");

  return normalized;
}

/**
 * Multilingual Lyrics Preprocessor
 * @param {string} text - Raw input text
 * @param {object} options - Options { langCode, removeStopwords, minLength }
 * @returns {Array<string>} - Clean array of normalized tokens
 */
function preprocessMultilingualLyrics(text, options = {}) {
  if (!text || typeof text !== "string") return [];

  const {
    langCode = "en",
    removeStopwords = false,
    minLength = 1
  } = options;

  // 1. Unicode NFKC normalization
  let clean = text.normalize("NFKC");

  // 2. Normalize repeated emotional vowel/consonant elongations
  clean = normalizeRepeatedCharacters(clean);

  // 3. Normalize language-specific contractions & elisions
  clean = normalizeContractions(clean, langCode);

  // 4. Lowercase
  clean = clean.toLowerCase();

  // 5. Script preservation:
  // Retain Latin (including accented characters \u00C0-\u024F), Devanagari (\u0900-\u097F), and Bengali (\u0980-\u09FF)
  // CRITICAL: Must retain \p{M} (Combining Marks/Matras) so Indic scripts (Hindi, Bengali) preserve vowels & conjuncts
  clean = clean.replace(/[^\p{L}\p{M}\p{N}\s'-]/gu, " ");

  // Collapse multiple whitespaces
  clean = clean.replace(/\s+/g, " ").trim();

  // 6. Tokenize
  const rawTokens = clean.split(" ").filter((t) => t.length >= minLength);

  // 7. Optional language-aware stopword filtering
  if (removeStopwords && STOPWORDS_BY_LANG[langCode]) {
    const sw = STOPWORDS_BY_LANG[langCode];
    return rawTokens.filter((t) => !sw.has(t));
  }

  return rawTokens;
}

/**
 * Backward-compatible preprocessing wrapper for existing legacy callers
 */
function preprocessLyrics(text) {
  return preprocessMultilingualLyrics(text, { minLength: 2 });
}

module.exports = {
  preprocessMultilingualLyrics,
  preprocessLyrics,
  STOPWORDS_BY_LANG,
  normalizeRepeatedCharacters,
  normalizeContractions
};
