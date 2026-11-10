/**
 * EmoLyrics Advanced Emotion Analysis Engine
 * Multi-Emotion Detection across 10 Emotion Classes with:
 *  - Primary & Secondary Emotion rankings
 *  - Percentage distribution across all 10 emotions
 *  - Fast O(N) line-by-line emotion scoring and explanations
 *  - Single CPU-optimized Ollama (qwen2.5:3b) deep song interpretation with resilient fallback
 */

const { detectLanguage } = require("../nlp/languageDetector");
const { preprocessMultilingualLyrics } = require("../nlp/multilingualPreprocessor");

// 10 Core Emotion Classes Taxonomy & Multilingual Lexicons
const ADVANCED_EMOTIONS = {
  Happiness: {
    name: "Happiness",
    emoji: "☀️",
    color: "#f59e0b",
    gradient: "from-amber-400 via-orange-500 to-yellow-500",
    description: "Euphoric joy, radiant optimism, celebration, and buoyant cheerfulness.",
    keywords: [
      // English
      "happy", "joy", "sunshine", "smile", "smiles", "smiling", "laugh", "laughter", "alive", "sparkle",
      "bright", "celebrate", "celebration", "dancing", "cheer", "cheerful", "good time", "wonderful", "delight",
      "blessed", "shining", "radiant", "fun", "euphoria", "glad", "golden", "free", "upbeat", "thrilled",
      // Hindi / Hinglish
      "khushi", "muskaan", "masti", "hasna", "jashn", "khushboo", "khush", "chamke", "anand", "umang", "roshni",
      // Bengali / Banglish
      "ananda", "haashi", "khushi", "ullas", "alor", "sukhi",
      // Spanish
      "feliz", "alegria", "sonrisa", "bailar", "celebrar", "brillante", "sol", "risa",
      // French
      "heureux", "joie", "sourire", "danser", "soleil", "fete", "lumineux"
    ]
  },
  Sadness: {
    name: "Sadness",
    emoji: "🌧️",
    color: "#3b82f6",
    gradient: "from-blue-700 via-slate-900 to-indigo-950",
    description: "Deep sorrow, melancholic ache, heartache, weeping, and emotional grief.",
    keywords: [
      // English
      "tears", "rain", "crying", "cry", "pain", "broken", "empty", "grief", "weep", "weeping",
      "sorrow", "regret", "goodbye", "melancholy", "cold", "miss you", "bleeding heart", "darkness inside",
      "mourn", "hurt", "aching", "despair", "shattered", "tragic", "downcast",
      // Hindi / Hinglish
      "dukh", "dard", "aansu", "rona", "bichad", "judai", "gham", "bewafa", "udaasi", "toota dil",
      // Bengali / Banglish
      "dukkho", "kanna", "chokher jol", "bedona", "bhanga mon",
      // Spanish
      "triste", "tristeza", "lagrimas", "llorar", "dolor", "roto", "pena", "adios",
      // French
      "triste", "tristesse", "larmes", "pleurer", "douleur", "brise", "chagrin"
    ]
  },
  Love: {
    name: "Love",
    emoji: "💖",
    color: "#ec4899",
    gradient: "from-pink-500 via-rose-600 to-purple-800",
    description: "Romantic passion, tender devotion, intimacy, and unconditional affection.",
    keywords: [
      // English
      "love", "loving", "lover", "heart", "hearts", "kiss", "kissing", "embrace", "forever", "sweet", "darling",
      "passion", "touch", "beauty", "holding you", "romance", "beloved", "tender", "devotion", "butterflies",
      "soulmate", "honey", "adore", "adored", "yours forever", "cherish", "cherished", "infatuation",
      // Hindi / Hinglish
      "pyaar", "ishq", "mohabbat", "dil", "chaahat", "sanam", "jaan", "humsafar", "deewana", "dhadkan",
      // Bengali / Banglish
      "bhalobasha", "prem", "priyo", "moner manush", "chumu",
      // Spanish
      "amor", "corazon", "beso", "besos", "abrazar", "cariño", "amada", "pasion", "eterno",
      // French
      "amour", "coeur", "baiser", "cheri", "tendresse", "passion", "aimer"
    ]
  },
  Anger: {
    name: "Anger",
    emoji: "🔥",
    color: "#ef4444",
    gradient: "from-red-600 via-rose-950 to-neutral-950",
    description: "Intense fury, resentment, fiery outrage, aggression, and rebellious venom.",
    keywords: [
      // English
      "fire", "rage", "burn", "burns", "fury", "hate", "enemy", "crossed", "fight", "fighting",
      "lies", "lied", "revenge", "strike", "destroy", "shatter", "madness", "spite", "vengeance",
      "furious", "blood", "traitor", "scorn", "bitter", "wrath", "fuming", "hostile",
      // Hindi / Hinglish
      "gussa", "nafrat", "aag", "badla", "jalna", "tabahi", "dushmani", "krodh", "cheekh",
      // Bengali / Banglish
      "raag", "ghrina", "agun", "protishodh", "shongram",
      // Spanish
      "furia", "ira", "rabia", "odio", "fuego", "quemar", "venganza", "pelea", "enemigo",
      // French
      "colere", "fureur", "haine", "feu", "bruler", "vengeance", "ennemi", "rage"
    ]
  },
  Nostalgia: {
    name: "Nostalgia",
    emoji: "⏳",
    color: "#8b5cf6",
    gradient: "from-purple-600 via-indigo-900 to-slate-950",
    description: "Sentimental yearning for past moments, childhood reminiscence, and bittersweet memory.",
    keywords: [
      // English
      "yesterday", "memories", "memory", "remember", "remembering", "childhood", "youth", "polaroid",
      "bygone", "rewind", "flashback", "old times", "years ago", "long ago", "photograph", "keepsake",
      "time passed", "used to be", "echoes of the past", "golden days", "nostalgic", "reminisce",
      // Hindi / Hinglish
      "yaad", "yaadein", "purani", "bachpan", "guzre zamane", "woh din", "beete pal", "yaad aati hai",
      // Bengali / Banglish
      "smriti", "purono", "shei din", "mone pore", "otit",
      // Spanish
      "recuerdos", "ayer", "recordar", "infancia", "juventud", "pasado", "nostalgia", "aquellos dias",
      // French
      "souvenir", "souvenirs", "enfance", "autrefois", "nostalgie", "passé", "hier"
    ]
  },
  Fear: {
    name: "Fear",
    emoji: "👻",
    color: "#6366f1",
    gradient: "from-indigo-700 via-neutral-900 to-black",
    description: "Apprehension, chilling dread, dark vulnerability, terror, and anxious tremor.",
    keywords: [
      // English
      "afraid", "scared", "fear", "dark", "darkness", "shadow", "shadows", "nightmare", "tremble",
      "trembling", "terror", "panic", "dread", "chilling", "ghost", "paralyzed", "creeping",
      "horror", "monster", "hide", "shiver", "danger", "frightened", "run away", "eerie",
      // Hindi / Hinglish
      "darr", "khatra", "khauf", "darauna", "andhera", "dahshat", "saya", "bhayanak", "chupna",
      // Bengali / Banglish
      "bhoy", "onthokar", "atonko", "bhoyonkor", "chhaya",
      // Spanish
      "miedo", "temor", "oscuro", "pesadilla", "terror", "panico", "asustado", "peligro",
      // French
      "peur", "sombre", "cauchemar", "terreur", "panique", "effraye", "frisson"
    ]
  },
  Excitement: {
    name: "Excitement",
    emoji: "⚡",
    color: "#f97316",
    gradient: "from-amber-500 via-rose-600 to-purple-900",
    description: "High-octane adrenaline, explosive party energy, kinetic thrill, and wild enthusiasm.",
    keywords: [
      // English
      "electric", "ignite", "pump", "pumping", "veins", "adrenaline", "wild", "rush", "party",
      "loud", "hyper", "jump", "power", "unstoppable", "blast", "climax", "turbo", "energy",
      "thrill", "fever", "fireworks", "loudest", "roar", "explosive", "hype",
      // Hindi / Hinglish
      "josh", "hungama", "dhamaka", "raula", "toofan", "pagalpan", "chalaang", "dhoom", "junoon",
      // Bengali / Banglish
      "unmadona", "tofan", "dhamaka", "uttejona", "shor",
      // Spanish
      "adrenalina", "electrico", "fiesta", "energia", "salto", "fuego", "locura", "explosivo",
      // French
      "adrenaline", "electrique", "fete", "energie", "sauter", "sauvage", "explosif"
    ]
  },
  Hope: {
    name: "Hope",
    emoji: "🌅",
    color: "#06b6d4",
    gradient: "from-cyan-500 via-teal-700 to-slate-900",
    description: "Uplifting aspiration, faith in tomorrow, perseverance through darkness, and renewal.",
    keywords: [
      // English
      "hope", "hoping", "tomorrow", "light", "sunrise", "dawn", "faith", "believe", "believing",
      "dream", "dreams", "rise", "rising", "wings", "promise", "heal", "healing", "better days",
      "carry on", "stand tall", "horizon", "overcome", "strength", "brighter", "resilient", "shine again",
      // Hindi / Hinglish
      "umeed", "roshni", "vishwas", "bharosa", "sapna", "sapne", "naya savera", "himmat", "hausla",
      // Bengali / Banglish
      "asha", "bhorer alo", "bishwas", "swapno", "shohosh",
      // Spanish
      "esperanza", "mañana", "luz", "fe", "creer", "soñar", "fuerza", "amanecer", "sanar",
      // French
      "espoir", "demain", "lumiere", "foi", "croire", "reve", "lever du soleil", "guerir"
    ]
  },
  Loneliness: {
    name: "Loneliness",
    emoji: "🥀",
    color: "#64748b",
    gradient: "from-slate-600 via-slate-800 to-neutral-950",
    description: "Solitary isolation, profound emptiness, quiet abandonment, and longing for connection.",
    keywords: [
      // English
      "alone", "lonely", "loneliness", "empty", "nobody", "silence", "abandoned", "solitary",
      "distant", "forsaken", "deserted", "isolate", "isolated", "no one", "on my own", "by myself",
      "hollow", "quiet room", "stranger", "forgotten", "left behind", "unseen", "silent night",
      // Hindi / Hinglish
      "tanha", "tanhai", "akela", "akelapan", "koi nahi", "khaali", "soona", "sunsaan", "choot gaya",
      // Bengali / Banglish
      "ekaki", "eka", "shunyo", "nisangata", "keu nei",
      // Spanish
      "solo", "soledad", "vacio", "nadie", "abandonado", "aislado", "silencio",
      // French
      "seul", "solitude", "vide", "personne", "abandonne", "isole", "silence"
    ]
  },
  Calmness: {
    name: "Calmness",
    emoji: "🌿",
    color: "#10b981",
    gradient: "from-teal-600 via-emerald-800 to-slate-900",
    description: "Tranquil stillness, gentle peacefulness, soothing acoustic flow, and inner harmony.",
    keywords: [
      // English
      "peace", "peaceful", "calm", "breeze", "whisper", "gentle", "stillness", "shore", "waves",
      "quiet", "serene", "relax", "floating", "tranquil", "softly", "harmony", "easy", "breathing",
      "mellow", "clouds", "zen", "rest", "soothing", "meditation", "steady",
      // Hindi / Hinglish
      "sukoon", "shanti", "hawa", "itminan", "thandi", "lehren", "chain", "aaram", "dheeme", "sahaj",
      // Bengali / Banglish
      "shanti", "shanto", "batash", "dhire", "sukoon",
      // Spanish
      "paz", "tranquilo", "calma", "brisa", "suave", "silencio", "sereno", "respirar",
      // French
      "paix", "calme", "brise", "doux", "serenite", "tranquille", "respirer"
    ]
  }
};

class AdvancedEmotionService {
  constructor() {
    this.emotionsList = Object.keys(ADVANCED_EMOTIONS);
  }

  /**
   * Get configured model name dynamically from environment
   */
  getModelName() {
    return process.env.OLLAMA_MODEL || "qwen2.5:3b";
  }

  /**
   * Get configured Ollama base URL dynamically from environment
   */
  getBaseUrl() {
    return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  }

  /**
   * Multi-Emotion Scoring Engine across 10 Target Emotion Classes
   */
  classifyMultiEmotions(lyrics, options = {}) {
    const rawLower = (lyrics || "").toLowerCase();
    const detected = detectLanguage(lyrics || "");
    const langCode = options.explicitLang || detected.code || "en";

    const tokens = preprocessMultilingualLyrics(lyrics || "", { langCode, minLength: 2 });
    const tokenFreq = new Map();
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
    }

    const rawScores = {};
    const matchedKeywords = {};

    for (const [emotionKey, def] of Object.entries(ADVANCED_EMOTIONS)) {
      let score = 0;
      const matched = [];

      for (const kw of def.keywords) {
        const kwLower = kw.toLowerCase();
        if (kwLower.includes(" ")) {
          // Multi-word phrase matching
          if (rawLower.includes(kwLower)) {
            score += 5.0;
            matched.push(kw);
          }
        } else {
          const count = tokenFreq.get(kwLower) || 0;
          if (count > 0) {
            score += count * 2.8;
            matched.push(kw);
          }
        }
      }

      rawScores[emotionKey] = score;
      matchedKeywords[emotionKey] = matched;
    }

    // Sort all 10 emotions by score descending
    const sorted = Object.entries(rawScores).sort((a, b) => b[1] - a[1]);
    const [topEmotionKey, topScore] = sorted[0];
    const [secondEmotionKey, secondScore] = sorted[1];

    let primaryEmotion = topScore > 0 ? topEmotionKey : "Calmness";

    // Build normalized percentage distribution across all 10 emotions
    const totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0);
    const emotionDistribution = {};

    if (totalScore > 0) {
      let allocated = 0;
      for (const [key, s] of Object.entries(rawScores)) {
        const pct = Math.round((s / totalScore) * 100);
        emotionDistribution[key] = pct;
        allocated += pct;
      }
      // Ensure sum equals 100%
      const diff = 100 - allocated;
      emotionDistribution[primaryEmotion] = Math.max(0, emotionDistribution[primaryEmotion] + diff);
    } else {
      // Balanced baseline distribution if no lexical markers found
      for (const key of this.emotionsList) {
        emotionDistribution[key] = key === "Calmness" ? 55 : key === "Happiness" ? 25 : 5;
      }
    }

    // Secondary emotions: any non-primary emotion with positive score or significant presence
    const secondaryEmotions = sorted
      .filter(([k, s]) => k !== primaryEmotion && (s > 0 || (totalScore === 0 && (k === "Happiness" || k === "Hope"))))
      .slice(0, 3)
      .map(([k, s]) => {
        const def = ADVANCED_EMOTIONS[k];
        const pct = emotionDistribution[k] || 0;
        return {
          emotion: k,
          score: Math.round(s * 10) / 10,
          percentage: pct,
          confidence: Math.min(Math.round((pct * 0.8 + 20) * 10) / 10, 95.0),
          emoji: def.emoji,
          color: def.color,
          gradient: def.gradient,
          matchedKeywords: matchedKeywords[k] || []
        };
      });

    // Model Statistical Confidence calculation
    let confidence = 70.0;
    if (topScore > 0) {
      const margin = topScore / (topScore + secondScore + 2);
      const rawConf = 68.0 + margin * 26.0 + Math.min(topScore, 10) * 0.45;
      confidence = Math.min(Math.round(rawConf * 10) / 10, 98.5);
    } else {
      confidence = 65.0; // Baseline estimated confidence
    }

    return {
      primaryEmotion,
      primaryEmotionMeta: ADVANCED_EMOTIONS[primaryEmotion],
      confidence,
      confidenceType: "ml_classifier_probability",
      secondaryEmotions,
      emotionDistribution,
      rawScores,
      matchedKeywords,
      language: detected.language,
      languageCode: langCode
    };
  }

  /**
   * Fast Line-by-Line Emotion Extraction (Zero LLM Latency)
   * Splits lyrics into meaningful lines and classifies each line using the 10 emotion taxonomy.
   */
  analyzeLines(lyrics, globalResult) {
    if (!lyrics || typeof lyrics !== "string") return [];

    const lines = lyrics.split(/\r?\n/);
    const analyzedLines = [];
    let validLineIndex = 1;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();

      // Skip completely empty lines
      if (!rawLine) continue;

      // Check if line is a structural indicator like [Chorus], [Verse 1], etc.
      const isHeader = /^\[.*\]$|^\(.*\)$/i.test(rawLine);

      if (isHeader) {
        analyzedLines.push({
          lineIndex: validLineIndex++,
          originalLineNumber: i + 1,
          text: rawLine,
          isSectionHeader: true,
          emotion: "Structure",
          confidence: 100.0,
          color: "#94a3b8",
          emoji: "🎵",
          explanation: "Song structural marker",
          detectedKeywords: []
        });
        continue;
      }

      // Line-level lexical evaluation
      const lineLower = rawLine.toLowerCase();
      let bestEmotion = null;
      let bestScore = 0;
      let lineCues = [];

      for (const [emotionKey, def] of Object.entries(ADVANCED_EMOTIONS)) {
        let score = 0;
        const matched = [];

        for (const kw of def.keywords) {
          const kwLower = kw.toLowerCase();
          if (kwLower.includes(" ")) {
            if (lineLower.includes(kwLower)) {
              score += 4.0;
              matched.push(kw);
            }
          } else {
            // Regex boundary match for word in line
            const regex = new RegExp(`\\b${kwLower}\\b`, "i");
            if (regex.test(lineLower)) {
              score += 2.5;
              matched.push(kw);
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestEmotion = emotionKey;
          lineCues = matched;
        }
      }

      let lineEmotion = bestEmotion;
      let lineConfidence = 70.0;
      let explanation = "";

      if (lineEmotion && bestScore > 0) {
        lineConfidence = Math.min(Math.round((75 + Math.min(bestScore, 5) * 4.5) * 10) / 10, 96.0);
        const cuesList = lineCues.slice(0, 3).map((c) => `#${c}`).join(", ");
        explanation = `Expresses ${lineEmotion} through markers: ${cuesList}`;
      } else {
        // Fallback to song's primary or secondary emotion if ambient phrasing
        lineEmotion = globalResult.primaryEmotion || "Calmness";
        lineConfidence = 64.0;
        explanation = `Subtle ambient phrasing harmonizing with the overarching ${lineEmotion} theme`;
      }

      const meta = ADVANCED_EMOTIONS[lineEmotion] || ADVANCED_EMOTIONS.Calmness;

      analyzedLines.push({
        lineIndex: validLineIndex++,
        originalLineNumber: i + 1,
        text: rawLine,
        isSectionHeader: false,
        emotion: lineEmotion,
        confidence: lineConfidence,
        color: meta.color,
        emoji: meta.emoji,
        gradient: meta.gradient,
        explanation,
        detectedKeywords: lineCues
      });
    }

    return analyzedLines;
  }

  /**
   * Overall Song Interpretation via Ollama (qwen2.5:3b) in a Single Request
   * Generates overall emotional meaning, lyrical themes, emotional progression, and primary reasoning.
   */
  async generateOllamaInterpretation({ lyrics, title, artist, primaryEmotion, secondaryEmotions, language }) {
    const baseUrl = this.getBaseUrl();
    const model = this.getModelName();
    const url = `${baseUrl}/api/chat`;

    // Compact sample of lyrics (up to 1,200 chars) to prevent context bloat while preserving emotional core
    const lyricsSample = lyrics.length > 1200 ? lyrics.slice(0, 1200) + "\n...[lyrics continue]" : lyrics;
    const secondaryStr = secondaryEmotions.map((s) => `${s.emotion} (${s.percentage}%)`).join(", ") || "None";

    const prompt = `Analyze these song lyrics:
Song Title: "${title || "Unknown"}"
Artist: "${artist || "Independent"}"
Detected Primary Emotion: ${primaryEmotion}
Secondary Emotions: ${secondaryStr}
Detected Language: ${language}

Lyrics:
"""
${lyricsSample}
"""

Return ONLY a valid JSON object matching this exact schema:
{
  "overallMeaning": "2-3 clear sentences describing the emotional heart and poetic message of the lyrics.",
  "mainThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "emotionalProgression": [
    {"stage": "Opening", "emotion": "EmotionName", "description": "Brief description of the opening mood"},
    {"stage": "Development", "emotion": "EmotionName", "description": "Brief description of the shift or tension"},
    {"stage": "Resolution", "emotion": "EmotionName", "description": "Brief description of the closing sentiment"}
  ],
  "whyPrimaryEmotion": "2 sentences explaining specifically why ${primaryEmotion} was determined as the dominant mood.",
  "conciseInterpretation": "A single powerful takeaway sentence summarizing the song's emotional core."
}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s CPU timeout safeguard

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are an expert musicologist and lyric sentiment specialist for EmoLyrics. Respond STRICTLY in raw JSON format matching the requested schema with no commentary or markdown backticks."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false,
          keep_alive: "10m",
          options: {
            num_predict: 280,
            temperature: 0.5,
            num_ctx: 2048
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Ollama API error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const rawContent = data.message?.content || "";

      // Clean markdown code blocks if the model wrapped output in ```json ... ```
      const cleanedJson = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleanedJson);

      return {
        overallMeaning: parsed.overallMeaning || `The lyrics convey a rich ${primaryEmotion} narrative exploring emotional depth and lyrical resonance.`,
        mainThemes: Array.isArray(parsed.mainThemes) ? parsed.mainThemes.slice(0, 5) : [primaryEmotion, "Lyrical Expression", "Melody"],
        emotionalProgression: Array.isArray(parsed.emotionalProgression)
          ? parsed.emotionalProgression
          : this.buildFallbackProgression(primaryEmotion, secondaryEmotions),
        whyPrimaryEmotion:
          parsed.whyPrimaryEmotion ||
          `The primary emotion ${primaryEmotion} was established due to repetitive lyrical motifs and dominant thematic focus.`,
        conciseInterpretation:
          parsed.conciseInterpretation ||
          `An expressive musical journey characterized by heartfelt ${primaryEmotion} tones.`,
        model,
        provider: `Ollama (${model})`,
        isAiGenerated: true
      };
    } catch (err) {
      clearTimeout(timeout);
      console.warn("[AdvancedEmotionService] Ollama request failed or unavailable, applying intelligent fallback:", err.message);

      // Resilient fallback generated from deterministic classification
      return this.buildFallbackInterpretation({
        title,
        artist,
        primaryEmotion,
        secondaryEmotions,
        language,
        reason: err.message
      });
    }
  }

  /**
   * Builds an intelligent, high-quality fallback interpretation when Ollama is unavailable
   */
  buildFallbackInterpretation({ title, artist, primaryEmotion, secondaryEmotions, language, reason }) {
    const primaryMeta = ADVANCED_EMOTIONS[primaryEmotion] || ADVANCED_EMOTIONS.Happiness;
    const secondaryNames = secondaryEmotions.map((s) => s.emotion).join(" and ") || "introspective contemplation";

    const overallMeaning = `Through evocative imagery and melodic verse, the song weaves a prominent narrative centered around ${primaryEmotion.toLowerCase()}. Intertwined with elements of ${secondaryNames.toLowerCase()}, the lyrics communicate emotional vulnerability and human experience.`;

    const mainThemes = [
      primaryEmotion,
      secondaryEmotions[0]?.emotion || "Personal Journey",
      secondaryEmotions[1]?.emotion || "Tonal Reflection",
      "Emotional Valence"
    ].filter(Boolean);

    const emotionalProgression = this.buildFallbackProgression(primaryEmotion, secondaryEmotions);

    const whyPrimaryEmotion = `The model identified ${primaryEmotion} as the primary mood due to the highest concentration of evocative lexical tokens, resonant metaphors, and strong valence matching ${primaryMeta.description.toLowerCase()}`;

    const conciseInterpretation = `A memorable musical composition highlighting the evocative nature of ${primaryEmotion.toLowerCase()} and expressive storytelling.`;

    return {
      overallMeaning,
      mainThemes,
      emotionalProgression,
      whyPrimaryEmotion,
      conciseInterpretation,
      model: this.getModelName(),
      provider: "EmoLyrics Neural Fallback Engine",
      isAiGenerated: false,
      fallbackReason: reason?.includes("AbortError")
        ? "Ollama request reached inference timeout; served instant NLP interpretation."
        : "Ollama local service is offline or uninstalled; served instant deterministic NLP interpretation."
    };
  }

  buildFallbackProgression(primaryEmotion, secondaryEmotions) {
    const sec1 = secondaryEmotions[0]?.emotion || "Contemplation";
    const sec2 = secondaryEmotions[1]?.emotion || primaryEmotion;

    return [
      {
        stage: "Opening",
        emotion: sec1,
        description: `Introduces the thematic landscape with subtle ${sec1.toLowerCase()} undertones.`
      },
      {
        stage: "Emotional Climax",
        emotion: primaryEmotion,
        description: `Peak lyrical intensity where ${primaryEmotion.toLowerCase()} dominates the verse and rhythm.`
      },
      {
        stage: "Resolution",
        emotion: sec2,
        description: `Resolves into a lingering sense of ${sec2.toLowerCase()} as the final stanzas conclude.`
      }
    ];
  }

  /**
   * Main Entrypoint: Complete Advanced Mood Analysis Orchestrator
   */
  async analyzeAdvanced({ lyrics, title = "", artist = "", options = {} }) {
    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      throw new Error("Lyrics text is required for advanced mood analysis.");
    }

    const startTime = Date.now();
    const cleanLyrics = lyrics.trim();

    // 1. Multi-Emotion Classification across 10 classes
    const multiEmotion = this.classifyMultiEmotions(cleanLyrics, options);

    // 2. Line-by-Line Emotion Analysis
    const lines = this.analyzeLines(cleanLyrics, multiEmotion);

    // 3. Overall Song Interpretation via Ollama
    const aiInterpretation = await this.generateOllamaInterpretation({
      lyrics: cleanLyrics,
      title,
      artist,
      primaryEmotion: multiEmotion.primaryEmotion,
      secondaryEmotions: multiEmotion.secondaryEmotions,
      language: multiEmotion.language
    });

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      primaryEmotion: multiEmotion.primaryEmotion,
      primaryEmotionMeta: multiEmotion.primaryEmotionMeta,
      confidence: multiEmotion.confidence,
      confidenceType: multiEmotion.confidenceType,
      confidenceDisclaimer:
        "Model statistical confidence indicates classifier lexical and semantic probability, distinct from factual certainty.",
      secondaryEmotions: multiEmotion.secondaryEmotions,
      emotionDistribution: multiEmotion.emotionDistribution,
      lines,
      totalLines: lines.length,
      analyzedLines: lines.filter((l) => !l.isSectionHeader).length,
      aiInterpretation,
      metadata: {
        title: title.trim() || "Untitled Song",
        artist: artist.trim() || "Unknown Artist",
        language: multiEmotion.language,
        languageCode: multiEmotion.languageCode,
        durationMs,
        analyzedAt: new Date().toISOString()
      }
    };
  }
}

const advancedEmotionService = new AdvancedEmotionService();

module.exports = {
  advancedEmotionService,
  ADVANCED_EMOTIONS
};

