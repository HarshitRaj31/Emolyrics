/**
 * EmoLyrics Language Detection Engine
 * High-precision script and statistical n-gram classifier.
 * Supported target languages:
 *  - English (en)
 *  - Hindi (hi) [Devanagari + Hinglish]
 *  - Bengali (bn) [Bengali script + Banglish]
 *  - Spanish (es)
 *  - French (fr)
 */

// LRU Memory Cache to optimize repeated queries
const detectionCache = new Map();
const MAX_CACHE_SIZE = 500;

// Language Profiles with high-frequency function words and diagnostic n-grams
const LANGUAGE_PROFILES = {
  Spanish: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flag: "🇪🇸",
    script: "Latin",
    supported: true,
    words: [
      "el", "la", "de", "que", "y", "en", "un", "se", "no", "por", "con", "para",
      "los", "las", "del", "una", "más", "pero", "como", "esta", "todo", "cuando",
      "está", "si", "yo", "te", "mi", "tu", "vida", "corazón", "amor", "siento",
      "donde", "siempre", "nunca", "nada", "nadie", "canción", "noche", "día",
      "alma", "beso", "tus", "mis", "quiero", "tiempo", "ojos", "ahora", "muy"
    ],
    charTrigrams: ["ció", "ión", "dad", "que", "mie", "ien", "ent", "con", "est", "par", "ado", "ada"],
    specialChars: /[áéíóúñ¿¡]/i
  },
  French: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    script: "Latin",
    supported: true,
    words: [
      "le", "la", "de", "et", "un", "une", "dans", "les", "des", "en", "du", "que",
      "pour", "pas", "qui", "sur", "avec", "est", "ce", "il", "elle", "sont", "plus",
      "par", "je", "tu", "mon", "ma", "mes", "c'est", "d'un", "l'amour", "tout",
      "nous", "vous", "ils", "temps", "vie", "sans", "faire", "quand", "comme",
      "moi", "toi", "monde", "cœur", "coeur", "yeux", "jamais", "toujours", "rien"
    ],
    charTrigrams: ["tion", "ment", "ique", "pour", "dans", "avec", "ette", "eur", "ant", "ent", "ous"],
    specialChars: /[éèêëàâçîïôùûüœæ]/i
  },
  English: {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
    script: "Latin",
    supported: true,
    words: [
      "the", "and", "you", "that", "was", "for", "are", "with", "his", "they",
      "this", "have", "from", "one", "had", "word", "but", "not", "what", "all",
      "were", "when", "your", "can", "said", "there", "use", "each", "which", "she",
      "how", "their", "will", "other", "about", "out", "many", "then", "them", "these",
      "love", "heart", "night", "time", "baby", "feel", "know", "never", "always"
    ],
    charTrigrams: ["ing", "the", "and", "tha", "ent", "ion", "tion", "nde", "has", "ver", "all"]
  },
  Hinglish: {
    code: "hi",
    name: "Hindi (Hinglish)",
    nativeName: "हिंग्लिश / Romanized Hindi",
    flag: "🇮🇳",
    script: "Latin",
    supported: true,
    words: [
      "pyaar", "ishq", "mohabbat", "dil", "chaahat", "sanam", "jaan", "humsafar",
      "khushi", "dukh", "dard", "aansu", "tanha", "tanhai", "vatan", "watan", "desh",
      "gussa", "sukoon", "shanti", "josh", "toofan", "khauf", "tiranga", "tere",
      "meri", "kuch", "hai", "nahi", "tum", "main", "zindagi", "deewana", "mera",
      "hum", "kaha", "raha", "rahi", "hoga", "aaja", "baat", "yaad", "saath"
    ],
    charTrigrams: ["aar", "iya", "aha", "aan", "ish", "aat", "hab", "abb"]
  },
  Banglish: {
    code: "bn",
    name: "Bengali (Banglish)",
    nativeName: "বাংলিশ / Romanized Bengali",
    flag: "🇧🇩",
    script: "Latin",
    supported: true,
    words: [
      "bhalobasha", "prem", "mon", "shanti", "ananda", "dukkho", "kosto", "chokher",
      "jol", "bondhu", "amar", "tumi", "tomake", "hobe", "shonar", "bangla", "gaan",
      "buker", "majhe", "ekta", "kotha", "khuje", "kanna", "hashi", "aami", "kichu"
    ],
    charTrigrams: ["sha", "ash", "okh", "sho", "ond", "oma", "aar", "bha"]
  },
  German: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    script: "Latin",
    supported: false,
    words: [
      "und", "der", "die", "das", "nicht", "ich", "sie", "ist", "mit", "sich", "ein",
      "dem", "auf", "eine", "den", "nach", "auch", "noch", "wie", "aus", "aber", "nur",
      "gefragt", "gesagt", "haben", "wir", "schon", "kann", "zeit", "liebe", "herz"
    ],
    charTrigrams: ["ich", "sch", "und", "cht", "ein", "der", "die", "nic"]
  },
  Italian: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    script: "Latin",
    supported: false,
    words: [
      "non", "che", "di", "la", "il", "un", "una", "per", "sono", "mi", "ti", "si",
      "ma", "con", "nel", "nella", "come", "amore", "vita", "cuore", "tempo", "notte"
    ],
    charTrigrams: ["ion", "con", "que", "zio", "ell", "ett"]
  }
};

/**
 * Clean & Tokenize text for script and word distribution analysis
 */
function getTokensAndStats(text) {
  if (!text || typeof text !== "string") {
    return { tokens: [], totalChars: 0, textLower: "" };
  }

  const textLower = text.toLowerCase();
  // Match contiguous Unicode letter words across Latin, Devanagari, Bengali, and accented chars
  const tokenMatches = textLower.match(/[\p{L}'-]+/gu) || [];
  const tokens = tokenMatches.filter((t) => t.length > 1);

  return {
    tokens,
    totalChars: text.length,
    textLower
  };
}

/**
 * Detect Language of submitted text
 * @param {string} text - Raw song lyrics text
 * @returns {object} - Detection result with confidence and language metadata
 */
function detectLanguage(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return {
      language: "Unknown",
      code: "unknown",
      nativeName: "Unknown",
      flag: "🌐",
      script: "Unknown",
      confidence: 0,
      supported: false,
      message: "No lyrics provided to detect language."
    };
  }

  const cacheKey = text.trim().slice(0, 160);
  if (detectionCache.has(cacheKey)) {
    return detectionCache.get(cacheKey);
  }

  // 1. Script-Level Detection (Highest Precision)
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const bengaliCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const cyrillicCount = (text.match(/[\u0400-\u04FF]/g) || []).length;
  const cjkCount = (text.match(/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g) || []).length;
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;

  const totalAlphabetChars = (text.match(/[\p{L}]/gu) || []).length || 1;

  // Devanagari Script -> Hindi
  if (devanagariCount / totalAlphabetChars > 0.15 || devanagariCount >= 5) {
    const confidence = Math.min(Math.round(85 + (devanagariCount / totalAlphabetChars) * 14), 99);
    const result = {
      language: "Hindi",
      variant: "Devanagari",
      code: "hi",
      nativeName: "हिन्दी (Devanagari)",
      flag: "🇮🇳",
      script: "Devanagari",
      confidence,
      supported: true,
      message: "Detected Hindi lyrics in native Devanagari script."
    };
    saveToCache(cacheKey, result);
    return result;
  }

  // Bengali Script -> Bengali
  if (bengaliCount / totalAlphabetChars > 0.15 || bengaliCount >= 5) {
    const confidence = Math.min(Math.round(85 + (bengaliCount / totalAlphabetChars) * 14), 99);
    const result = {
      language: "Bengali",
      variant: "Bengali Script",
      code: "bn",
      nativeName: "বাংলা (Bengali)",
      flag: "🇧🇩",
      script: "Bengali",
      confidence,
      supported: true,
      message: "Detected Bengali lyrics in native Bengali script."
    };
    saveToCache(cacheKey, result);
    return result;
  }

  // Unsupported Scripts: Cyrillic (Russian/Ukrainian/etc.)
  if (cyrillicCount / totalAlphabetChars > 0.2 || cyrillicCount >= 8) {
    const result = {
      language: "Cyrillic (Russian/Slavic)",
      code: "ru",
      nativeName: "Русский / Slavic",
      flag: "🌐",
      script: "Cyrillic",
      confidence: 90,
      supported: false,
      message: "Detected Slavic/Cyrillic lyrics. EmoLyrics currently supports English, Hindi, Bengali, Spanish, and French."
    };
    saveToCache(cacheKey, result);
    return result;
  }

  // Unsupported Scripts: CJK (Chinese / Japanese / Korean)
  if (cjkCount / totalAlphabetChars > 0.2 || cjkCount >= 8) {
    const result = {
      language: "East Asian (CJK)",
      code: "cjk",
      nativeName: "中文 / 日本語 / 한국어",
      flag: "🌐",
      script: "East Asian",
      confidence: 90,
      supported: false,
      message: "Detected East Asian lyrics. EmoLyrics currently supports English, Hindi, Bengali, Spanish, and French."
    };
    saveToCache(cacheKey, result);
    return result;
  }

  // Unsupported Scripts: Arabic / Persian / Urdu
  if (arabicCount / totalAlphabetChars > 0.2 || arabicCount >= 8) {
    const result = {
      language: "Arabic / Urdu Script",
      code: "ar",
      nativeName: "العربية / اردو",
      flag: "🌐",
      script: "Arabic",
      confidence: 90,
      supported: false,
      message: "Detected Arabic/Urdu script lyrics. EmoLyrics currently supports English, Hindi, Bengali, Spanish, and French."
    };
    saveToCache(cacheKey, result);
    return result;
  }

  // 2. Latin Script Analysis (English, Spanish, French, Hinglish, Banglish)
  const { tokens, textLower } = getTokensAndStats(text);
  if (tokens.length === 0) {
    return {
      language: "English",
      code: "en",
      nativeName: "English",
      flag: "🇬🇧",
      script: "Latin",
      confidence: 50,
      supported: true,
      message: "Short or numerical text; defaulted to English."
    };
  }

  const scores = {};
  for (const [langName, profile] of Object.entries(LANGUAGE_PROFILES)) {
    let score = 0;

    // Word match score
    for (const token of tokens) {
      if (profile.words.includes(token)) {
        score += 3.5;
      }
    }

    // Diagnostic trigram match score
    if (profile.charTrigrams) {
      for (const tri of profile.charTrigrams) {
        if (textLower.includes(tri)) {
          score += 1.2;
        }
      }
    }

    // Special accent characters bonus
    if (profile.specialChars && profile.specialChars.test(text)) {
      const matchCount = (text.match(profile.specialChars) || []).length;
      score += matchCount * 2.5;
    }

    scores[langName] = score;
  }

  // Sort profiles by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topLang, topScore] = sorted[0];
  const [secondLang, secondScore] = sorted[1];

  let detectedResult = null;

  // Significant winning margin check
  if (topScore > 3) {
    const profile = LANGUAGE_PROFILES[topLang];
    const totalScore = topScore + secondScore + 1;
    const marginRatio = topScore / totalScore;
    const confidence = Math.min(Math.round(70 + marginRatio * 28), 98);

    // Map Hinglish to Hindi and Banglish to Bengali
    let finalName = profile.name;
    let finalCode = profile.code;
    let finalNative = profile.nativeName;
    let finalFlag = profile.flag;

    if (topLang === "Hinglish") {
      finalName = "Hindi";
      finalCode = "hi";
      finalNative = "हिन्दी (Hinglish / Romanized)";
      finalFlag = "🇮🇳";
    } else if (topLang === "Banglish") {
      finalName = "Bengali";
      finalCode = "bn";
      finalNative = "বাংলা (Banglish / Romanized)";
      finalFlag = "🇧🇩";
    }

    detectedResult = {
      language: finalName,
      code: finalCode,
      nativeName: finalNative,
      flag: finalFlag,
      script: "Latin",
      confidence,
      supported: profile.supported,
      message: profile.supported
        ? `Detected ${finalName} lyrics with ${confidence}% linguistic certainty.`
        : `Detected ${finalName} lyrics. EmoLyrics currently supports English, Hindi, Bengali, Spanish, and French.`
    };
  } else {
    // Check if it's German, Portuguese, Italian, or other European language
    const germanWords = ["und", "der", "die", "das", "nicht", "ich", "sie", "ist", "mit", "sich", "ein"];
    const germanMatches = tokens.filter((t) => germanWords.includes(t)).length;
    if (germanMatches >= 3) {
      detectedResult = {
        language: "German",
        code: "de",
        nativeName: "Deutsch",
        flag: "🇩🇪",
        script: "Latin",
        confidence: 82,
        supported: false,
        message: "Detected German lyrics. EmoLyrics currently supports English, Hindi, Bengali, Spanish, and French."
      };
    } else {
      // Default to English with moderate confidence
      detectedResult = {
        language: "English",
        code: "en",
        nativeName: "English",
        flag: "🇬🇧",
        script: "Latin",
        confidence: 65,
        supported: true,
        message: "Identified Latin text consistent with standard English phrasing."
      };
    }
  }

  saveToCache(cacheKey, detectedResult);
  return detectedResult;
}

function saveToCache(key, value) {
  if (detectionCache.size >= MAX_CACHE_SIZE) {
    const firstKey = detectionCache.keys().next().value;
    detectionCache.delete(firstKey);
  }
  detectionCache.set(key, value);
}

module.exports = {
  detectLanguage,
  LANGUAGE_PROFILES
};
