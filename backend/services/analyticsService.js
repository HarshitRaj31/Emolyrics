/**
 * EmoLyrics Analytics Service
 * Computes deep aggregations, distributions, trends, and confidence metrics
 * across verified ML lyrical analysis records.
 */

const { getIsConnected, memoryStore } = require("../db");
const Analysis = require("../models/Analysis");
const { classifyLyrics } = require("../nlp/emotionClassifier");

// All 9 Trained ML Emotion Classes with Design Metadata
const MOOD_METADATA = {
  Happy: { emoji: "☀️", color: "#f59e0b" },
  Sad: { emoji: "🌧️", color: "#3b82f6" },
  Angry: { emoji: "🔥", color: "#ef4444" },
  Romantic: { emoji: "💖", color: "#ec4899" },
  "Calm/Chill": { emoji: "🌿", color: "#10b981" },
  Exciting: { emoji: "⚡", color: "#8b5cf6" },
  Patriotic: { emoji: "🇮🇳", color: "#f97316" },
  Thrilling: { emoji: "🎬", color: "#a855f7" },
  Horror: { emoji: "👻", color: "#dc2626" }
};

// Supported Languages with Design & Metadata
const LANGUAGE_METADATA = {
  English: { flag: "🇬🇧", name: "English", color: "#3b82f6" },
  Hindi: { flag: "🇮🇳", name: "Hindi", color: "#f97316" },
  Bengali: { flag: "🇧🇩", name: "Bengali", color: "#10b981" },
  Spanish: { flag: "🇪🇸", name: "Spanish", color: "#ef4444" },
  French: { flag: "🇫🇷", name: "French", color: "#8b5cf6" },
  Other: { flag: "🌐", name: "Other", color: "#64748b" }
};

/**
 * Normalize any input language string into one of the supported languages or Other
 */
function normalizeLanguage(langStr) {
  if (!langStr || typeof langStr !== "string") return "English";
  const lower = langStr.toLowerCase().trim();
  if (lower.includes("hindi") || lower.includes("hinglish") || lower === "hi") return "Hindi";
  if (lower.includes("bengali") || lower.includes("bangla") || lower.includes("banglish") || lower === "bn") return "Bengali";
  if (lower.includes("spanish") || lower.includes("español") || lower === "es") return "Spanish";
  if (lower.includes("french") || lower.includes("français") || lower === "fr") return "French";
  if (lower.includes("english") || lower === "en") return "English";
  return "Other";
}

/**
 * Extract the highest-scoring secondary emotion from an analysis record
 */
function extractSecondaryEmotion(rec, primaryMood) {
  let scores = null;
  if (rec.scores) {
    if (rec.scores instanceof Map) {
      scores = {};
      for (const [k, v] of rec.scores.entries()) {
        scores[k] = v;
      }
    } else if (typeof rec.scores === "object") {
      scores = rec.scores;
    }
  }

  const targetMood = (primaryMood || rec.mood || "").toLowerCase();

  if (scores && typeof scores === "object") {
    const candidates = Object.entries(scores)
      .filter(([m, val]) => m.toLowerCase() !== targetMood && Number(val) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));

    if (candidates.length > 0 && candidates[0][1] > 0) {
      return candidates[0][0];
    }
  }

  // Fallback to classifying lyrics if scores absent on record
  if (rec.lyrics && typeof rec.lyrics === "string" && rec.lyrics.length > 5) {
    try {
      const classified = classifyLyrics(rec.lyrics);
      if (classified && classified.scores) {
        const candidates = Object.entries(classified.scores)
          .filter(([m, val]) => m.toLowerCase() !== targetMood && Number(val) > 0)
          .sort((a, b) => Number(b[1]) - Number(a[1]));

        if (candidates.length > 0 && candidates[0][1] > 0) {
          return candidates[0][0];
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

// Initial Seed Dataset for Realistic Community Benchmarks
const SEED_ANALYSES = [
  {
    title: "Walking on Sunshine",
    artist: "Katrina and the Waves",
    lyrics: "Walking on sunshine, feeling so alive\nEvery moment sparkles, happiness will thrive\nSmiles all around me, laughter fills the air\nLife is so amazing, not a single care",
    mood: "Happy",
    confidence: 94.5,
    scores: { Happy: 75, Exciting: 20, "Calm/Chill": 5 },
    explanation: "Identified vibrant joy markers (sunshine, happiness, smiles, laughter) radiating euphoric energy.",
    language: "English",
    daysAgo: 1
  },
  {
    title: "Yellow",
    artist: "Coldplay",
    lyrics: "Look at the stars, look how they shine for you\nAnd everything you do, yeah they were all yellow\nI came along, I wrote a song for you\nAnd all the things you do, and it was called Yellow",
    mood: "Romantic",
    confidence: 88.9,
    scores: { Romantic: 70, "Calm/Chill": 20, Happy: 10 },
    explanation: "Dominant emotional cues characterizing romantic devotion and heartfelt affection.",
    language: "English",
    daysAgo: 2
  },
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    lyrics: "Is this the real life? Is this just fantasy?\nCaught in a landslide, no escape from reality\nOpen your eyes, look up to the skies and see\nI'm just a poor boy, I need no sympathy",
    mood: "Calm/Chill",
    confidence: 86.2,
    scores: { "Calm/Chill": 60, Thrilling: 25, Sad: 15 },
    explanation: "Identified calm reflective pacing with philosophical lyrical nuance.",
    language: "English",
    daysAgo: 3
  },
  {
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    lyrics: "Hum tere bin ab reh nahi sakte\nTere bina kya wajood mera\nTujh se juda agar ho jaayenge\nToh khud se hi ho jaayenge juda",
    mood: "Sad",
    confidence: 83.6,
    scores: { Sad: 75, Romantic: 20, "Calm/Chill": 5 },
    explanation: "Dominant melancholic markers conveying deep sorrow, yearning, and poignant grief.",
    language: "Hindi",
    daysAgo: 4
  },
  {
    title: "Don't You Worry Child",
    artist: "Swedish House Mafia",
    lyrics: "There was a time, I used to look into my father's eyes\nIn a happy home, I was a king, I had a golden throne\nDon't you worry, don't you worry, child\nSee heaven's got a plan for you",
    mood: "Exciting",
    confidence: 91.0,
    scores: { Exciting: 70, Happy: 20, "Calm/Chill": 10 },
    explanation: "High arousal electric momentum with anthemic festival drops.",
    language: "English",
    daysAgo: 5
  },
  {
    title: "Break Stuff",
    artist: "Limp Bizkit",
    lyrics: "It's just one of those days where you don't wanna wake up\nEverything is messed up, everybody sucks\nYou don't really know why, but you wanna justify rippin' someone's head off",
    mood: "Angry",
    confidence: 92.1,
    scores: { Angry: 80, Exciting: 15, Thrilling: 5 },
    explanation: "Explosive cathartic wrath and defiant fury driven by high tension.",
    language: "English",
    daysAgo: 6
  },
  {
    title: "Maa Tujhe Salaam",
    artist: "A.R. Rahman",
    lyrics: "Vande Mataram, Vande Mataram\nYahan vahan saara jahan dekh liya\nAb tak bhi tere jaisa koi nahin\nMain ghoom aaya dharati par",
    mood: "Patriotic",
    confidence: 96.0,
    scores: { Patriotic: 80, Exciting: 15, Happy: 5 },
    explanation: "Stirring homeland devotion, national solidarity, and anthem fervor.",
    language: "Hindi",
    daysAgo: 7
  },
  {
    title: "Supermassive Black Hole",
    artist: "Muse",
    lyrics: "Oh baby, don't you know I suffer?\nOh baby, can you hear me moan?\nYou caught me under false pretenses\nHow long before you let me go?",
    mood: "Thrilling",
    confidence: 89.4,
    scores: { Thrilling: 70, Exciting: 20, Angry: 10 },
    explanation: "Cinematic driving tension, mysterious edge-of-seat pacing, and suspense.",
    language: "English",
    daysAgo: 8
  },
  {
    title: "Tubular Bells",
    artist: "Mike Oldfield",
    lyrics: "Bells tolling in the dark silence, eerie footsteps approaching through the fog, shadows whisper dread",
    mood: "Horror",
    confidence: 87.5,
    scores: { Horror: 75, Thrilling: 20, Sad: 5 },
    explanation: "Spine-chilling dark ambient dissonance, supernatural chill, and macabre atmosphere.",
    language: "English",
    daysAgo: 9
  },
  {
    title: "Someone Like You",
    artist: "Adele",
    lyrics: "I heard that you're settled down, that you found a girl and you're married now\nI heard that your dreams came true, guess she gave you things I didn't give to you\nNever mind, I'll find someone like you",
    mood: "Sad",
    confidence: 93.2,
    scores: { Sad: 75, Romantic: 15, "Calm/Chill": 10 },
    explanation: "Introspective acoustic vulnerability, poignant heartbreak, and grief.",
    language: "English",
    daysAgo: 10
  },
  {
    title: "Perfect",
    artist: "Ed Sheeran",
    lyrics: "I found a love for me, darling just dive right in and follow my lead\nWell I found a girl, beautiful and sweet\nI never knew you were the someone waiting for me",
    mood: "Romantic",
    confidence: 95.0,
    scores: { Romantic: 80, Happy: 15, "Calm/Chill": 5 },
    explanation: "Tender acoustic affection and starry-eyed emotional depth.",
    language: "English",
    daysAgo: 11
  },
  {
    title: "Happy",
    artist: "Pharrell Williams",
    lyrics: "Because I'm happy, clap along if you feel like a room without a roof\nBecause I'm happy, clap along if you feel like happiness is the truth",
    mood: "Happy",
    confidence: 92.8,
    scores: { Happy: 85, Exciting: 15 },
    explanation: "Radiant joy, rhythmic optimism, and feel-good celebration.",
    language: "English",
    daysAgo: 12
  },
  {
    title: "Killing In The Name",
    artist: "Rage Against The Machine",
    lyrics: "Some of those that work forces are the same that burn crosses\nAnd now you do what they told ya, now you do what they told ya\nI won't do what you tell me!",
    mood: "Angry",
    confidence: 94.0,
    scores: { Angry: 85, Exciting: 10, Thrilling: 5 },
    explanation: "Uncompromising rebellion, heavy distortion, and anti-authoritarian fury.",
    language: "English",
    daysAgo: 13
  },
  {
    title: "Weightless",
    artist: "Marconi Union",
    lyrics: "Gentle breeze over the calm shoreline, quiet waves floating softly in the afternoon stillness",
    mood: "Calm/Chill",
    confidence: 88.0,
    scores: { "Calm/Chill": 85, Happy: 10, Romantic: 5 },
    explanation: "Atmospheric textures, low-arousal harmonic pacing, and tranquil ease.",
    language: "English",
    daysAgo: 14
  },
  {
    title: "Wake Me Up",
    artist: "Avicii",
    lyrics: "Feeling my way through the darkness, guided by a beating heart\nI can't tell where the journey will end, but I know where to start\nSo wake me up when it's all over",
    mood: "Exciting",
    confidence: 90.5,
    scores: { Exciting: 70, Happy: 20, Patriotic: 10 },
    explanation: "High-tempo acoustic folk-EDM fusion with adrenaline-charged chorus.",
    language: "English",
    daysAgo: 15
  },
  {
    title: "Teri Mitti",
    artist: "B Praak",
    lyrics: "O maai meri kya fikar tujhe, kyon aankh se dariya behta hai\nTu kehti thi tera chaand hoon main, aur chaand hamesha rehta hai\nTeri mitti me mil jawaan, gul banke main khil jawaan",
    mood: "Patriotic",
    confidence: 95.2,
    scores: { Patriotic: 75, Sad: 15, Romantic: 10 },
    explanation: "Deep reverent sacrifice, love for the homeland soil, and national solidarity.",
    language: "Hindi",
    daysAgo: 16
  },
  {
    title: "Time",
    artist: "Hans Zimmer",
    lyrics: "Orchestral countdown echoing against the ticking clock, racing pulse of fate and memory",
    mood: "Thrilling",
    confidence: 88.7,
    scores: { Thrilling: 75, Horror: 15, "Calm/Chill": 10 },
    explanation: "Dramatic cinematic buildup, edge-of-seat suspense, and high-stakes tension.",
    language: "English",
    daysAgo: 17
  },
  {
    title: "Stranger Things Theme",
    artist: "Survive",
    lyrics: "Eerie analog synths pulse in the upside down, shadowy creatures lurking in the mist",
    mood: "Horror",
    confidence: 91.3,
    scores: { Horror: 75, Thrilling: 20, "Calm/Chill": 5 },
    explanation: "Supernatural horror atmosphere, uncanny chills, and dark ambient dread.",
    language: "English",
    daysAgo: 18
  },
  {
    title: "Fix You",
    artist: "Coldplay",
    lyrics: "When you try your best, but you don't succeed\nWhen you get what you want, but not what you need\nWhen you feel so tired, but you can't sleep\nTears stream down your face",
    mood: "Sad",
    confidence: 89.6,
    scores: { Sad: 65, "Calm/Chill": 20, Romantic: 15 },
    explanation: "Comforting sorrow, gentle organ swell, and emotional tears.",
    language: "English",
    daysAgo: 19
  },
  {
    title: "Kesariya",
    artist: "Arijit Singh",
    lyrics: "Kesariya tera ishq hai piya, rang jaaun jo main haath lagaun\nDin beete saara teri fikr mein, rain saari teri khair manaun",
    mood: "Romantic",
    confidence: 91.5,
    scores: { Romantic: 70, Happy: 20, "Calm/Chill": 10 },
    explanation: "Warm romantic affection, soulful acoustic guitar, and poetic devotion.",
    language: "Hindi",
    daysAgo: 20
  },
  {
    title: "Despacito",
    artist: "Luis Fonsi",
    lyrics: "Sí, sabes que ya llevo un rato mirándote\nTengo que bailar contigo hoy\nVi que tu mirada ya estaba llamándome\nMuéstrame el camino que yo voy",
    mood: "Romantic",
    confidence: 92.0,
    scores: { Romantic: 65, Happy: 25, Exciting: 10 },
    explanation: "Passionate Latin romantic melody, buoyant tropical rhythm, and vibrant dance sentiment.",
    language: "Spanish",
    daysAgo: 21
  },
  {
    title: "Ami Chini Go Chini",
    artist: "Rabindranath Tagore",
    lyrics: "আমি চিনি গো চিনি তোমারে ওগো বিদেশিনী\nতুমি থাক সিন্ধুপারে ওগো বিদেশিনী\nতোমায় দেখেছি শারদপ্রাতে, তোমায় দেখেছি মাধবী রাতে",
    mood: "Romantic",
    confidence: 90.5,
    scores: { Romantic: 60, "Calm/Chill": 25, Sad: 15 },
    explanation: "Deep poetic devotion, serene acoustic melodic nuances, and ethereal longing.",
    language: "Bengali",
    daysAgo: 22
  },
  {
    title: "La Vie En Rose",
    artist: "Édith Piaf",
    lyrics: "Des yeux qui font baisser les miens, un rire qui se perd sur sa bouche\nVoilà le portrait sans retouche de l'homme auquel j'appartiens\nQuand il me prend dans ses bras, il me parle tout bas, je vois la vie en rose",
    mood: "Romantic",
    confidence: 93.5,
    scores: { Romantic: 75, Happy: 15, "Calm/Chill": 10 },
    explanation: "Iconic French romantic ballad, tender acoustic orchestration, and heartfelt devotion.",
    language: "French",
    daysAgo: 23
  }
];

class AnalyticsService {
  constructor() {
    this._seeded = false;
    this.ensureSeedData = this.ensureSeedData.bind(this);
    this.getAnalytics = this.getAnalytics.bind(this);
  }

  /**
   * Ensure database has a robust community baseline if empty or low
   */
  async ensureSeedData() {
    if (this._seeded) return;
    try {
      if (getIsConnected()) {
        const count = await Analysis.countDocuments();
        if (count < 8) {
          const docs = SEED_ANALYSES.map((item) => ({
            title: item.title,
            artist: item.artist,
            lyrics: item.lyrics,
            mood: item.mood,
            confidence: item.confidence,
            explanation: item.explanation,
            language: item.language,
            scores: item.scores || {},
            isPublic: true,
            createdAt: new Date(Date.now() - item.daysAgo * 86400000)
          }));
          await Analysis.insertMany(docs);
        }
      } else {
        if (memoryStore.analyses.length < 8) {
          SEED_ANALYSES.forEach((item) => {
            const exists = memoryStore.analyses.some(
              (a) => a.title === item.title && a.artist === item.artist
            );
            if (!exists) {
              memoryStore.analyses.push({
                _id: "seed-" + Math.random().toString(36).substring(2, 9),
                title: item.title,
                artist: item.artist,
                lyrics: item.lyrics,
                mood: item.mood,
                confidence: item.confidence,
                explanation: item.explanation,
                language: item.language,
                scores: item.scores || {},
                isPublic: true,
                createdAt: new Date(Date.now() - item.daysAgo * 86400000).toISOString()
              });
            }
          });
        }
      }
      this._seeded = true;
    } catch (err) {
      console.warn("[AnalyticsService] Seed check notice:", err.message);
    }
  }

  /**
   * Aggregate complete analytics based on filtered records
   * 
   * @param {Object} options
   * @param {string} [options.scope="community"] - "mine" (user records only) or "community"
   * @param {string} [options.userId] - Authenticated user id
   * @param {string} [options.timeframe="all"] - "7d", "30d", "90d", "all"
   * @param {string} [options.startDate] - Custom ISO date string
   * @param {string} [options.endDate] - Custom ISO date string
   * @param {string} [options.mood="All"] - Emotion filter
   * @param {string} [options.artist="All"] - Artist filter
   */
  async getAnalytics(options = {}) {
    await this.ensureSeedData();

    const {
      scope = "community",
      userId = null,
      timeframe = "all",
      startDate = null,
      endDate = null,
      mood = "All",
      artist = "All"
    } = options;

    // 1. Fetch raw candidate records based on scope
    let allRecords = [];
    if (getIsConnected()) {
      const baseFilter = {};
      if (scope === "mine") {
        if (!userId) {
          return { success: true, empty: true, message: "No authenticated user session." };
        }
        baseFilter.user = userId;
      }
      allRecords = await Analysis.find(baseFilter).sort({ createdAt: -1 }).lean();
    } else {
      let storeItems = [...(memoryStore.analyses || [])];
      if (scope === "mine") {
        if (!userId) {
          return { success: true, empty: true, message: "No authenticated user session." };
        }
        storeItems = storeItems.filter((a) => a.user && a.user.toString() === userId.toString());
      }
      allRecords = storeItems;
    }

    // 2. Extract distinct metadata for filter dropdowns before narrowing
    const availableArtists = Array.from(
      new Set(
        allRecords
          .map((r) => r.artist?.trim())
          .filter((a) => a && a !== "Unknown Artist" && a !== "Independent / Unknown")
      )
    ).sort();

    const availableMoods = Object.keys(MOOD_METADATA);

    // 3. Compute Date Range Bounds
    let startTimestamp = 0;
    let endTimestamp = Date.now();

    if (startDate) {
      const parsedStart = new Date(startDate).getTime();
      if (!isNaN(parsedStart)) startTimestamp = parsedStart;
    } else if (timeframe === "7d") {
      startTimestamp = Date.now() - 7 * 86400000;
    } else if (timeframe === "30d") {
      startTimestamp = Date.now() - 30 * 86400000;
    } else if (timeframe === "90d") {
      startTimestamp = Date.now() - 90 * 86400000;
    }

    if (endDate) {
      const parsedEnd = new Date(endDate).getTime();
      if (!isNaN(parsedEnd)) endTimestamp = parsedEnd + 86399999;
    }

    // 4. Apply Filters (Date, Mood, Artist)
    const filteredRecords = allRecords.filter((rec) => {
      const recTime = new Date(rec.createdAt).getTime();

      // Date check
      if (recTime < startTimestamp || recTime > endTimestamp) return false;

      // Mood check
      if (mood && mood !== "All") {
        if (rec.mood?.toLowerCase() !== mood.toLowerCase()) return false;
      }

      // Artist check
      if (artist && artist !== "All") {
        const cleanRecArtist = (rec.artist || "").toLowerCase();
        const cleanTargetArtist = artist.toLowerCase();
        if (!cleanRecArtist.includes(cleanTargetArtist)) return false;
      }

      return true;
    });

    const totalAnalyses = filteredRecords.length;

    // Handle Empty Dataset gracefully
    if (totalAnalyses === 0) {
      return {
        success: true,
        scope,
        kpi: {
          totalAnalyses: 0,
          mostFrequentlyDetectedEmotion: "None",
          mostFrequentCount: 0,
          mostFrequentSecondaryEmotion: "None",
          mostFrequentSecondaryCount: 0,
          totalWithSecondary: 0,
          topLanguage: "None",
          topLanguageCount: 0,
          uniqueArtistsCount: 0,
          averageConfidence: 0,
          recentActivity: []
        },
        languageDistribution: ["English", "Hindi", "Bengali", "Spanish", "French"].map((lang) => ({
          language: lang,
          count: 0,
          percentage: 0,
          ...LANGUAGE_METADATA[lang]
        })),
        secondaryEmotionDistribution: availableMoods.map((m) => ({
          mood: m,
          count: 0,
          percentage: 0,
          ...MOOD_METADATA[m]
        })),
        moodDistribution: availableMoods.map((m) => ({
          mood: m,
          count: 0,
          percentage: 0,
          ...MOOD_METADATA[m]
        })),
        trends: { daily: [], weekly: [], monthly: [] },
        emotionComparison: availableMoods.map((m) => ({
          mood: m,
          count: 0,
          averageConfidence: 0,
          percentage: 0,
          ...MOOD_METADATA[m]
        })),
        artistAnalytics: { topArtists: [], topSongs: [] },
        confidenceAnalytics: {
          averageConfidence: 0,
          distribution: [
            { range: "90-100% (Very High)", count: 0, percentage: 0 },
            { range: "80-89% (High)", count: 0, percentage: 0 },
            { range: "70-79% (Moderate)", count: 0, percentage: 0 },
            { range: "<70% (Tentative)", count: 0, percentage: 0 }
          ],
          individualPoints: []
        },
        availableMoods,
        availableArtists
      };
    }

    // 5. Aggregate KPI Metrics
    const moodCounts = {};
    const artistCounts = {};
    const songCounts = {};
    const langCounts = {
      English: 0,
      Hindi: 0,
      Bengali: 0,
      Spanish: 0,
      French: 0,
      Other: 0
    };
    const secondaryCounts = {};
    let totalWithSecondary = 0;
    let confidenceSum = 0;

    filteredRecords.forEach((rec) => {
      const m = rec.mood || "Happy";
      moodCounts[m] = (moodCounts[m] || 0) + 1;

      const art = rec.artist ? rec.artist.trim() : "Unknown Artist";
      artistCounts[art] = (artistCounts[art] || 0) + 1;

      const songKey = `${rec.title || "Untitled"}:::${art}`;
      songCounts[songKey] = (songCounts[songKey] || 0) + 1;

      confidenceSum += Number(rec.confidence) || 0;

      // Language tracking
      const normalizedLang = normalizeLanguage(rec.language);
      langCounts[normalizedLang] = (langCounts[normalizedLang] || 0) + 1;

      // Secondary emotion tracking
      const secMood = extractSecondaryEmotion(rec, m);
      if (secMood && MOOD_METADATA[secMood]) {
        secondaryCounts[secMood] = (secondaryCounts[secMood] || 0) + 1;
        totalWithSecondary += 1;
      }
    });

    // Top Emotion
    let topMood = "Happy";
    let topMoodCount = 0;
    Object.entries(moodCounts).forEach(([m, c]) => {
      if (c > topMoodCount) {
        topMoodCount = c;
        topMood = m;
      }
    });

    // Top Secondary Emotion
    let topSecondaryMood = "None";
    let topSecondaryCount = 0;
    Object.entries(secondaryCounts).forEach(([m, c]) => {
      if (c > topSecondaryCount) {
        topSecondaryCount = c;
        topSecondaryMood = m;
      }
    });

    // Top Language
    let topLanguage = "English";
    let topLanguageCount = 0;
    Object.entries(langCounts).forEach(([lang, c]) => {
      if (c > topLanguageCount) {
        topLanguageCount = c;
        topLanguage = lang;
      }
    });

    const averageConfidence = Math.round((confidenceSum / totalAnalyses) * 10) / 10;
    const uniqueArtistsCount = Object.keys(artistCounts).length;

    // 6. Language Distribution
    const baseLanguages = ["English", "Hindi", "Bengali", "Spanish", "French"];
    const languageDistribution = baseLanguages.map((lang) => {
      const count = langCounts[lang] || 0;
      const percentage = Math.round((count / totalAnalyses) * 100);
      return {
        language: lang,
        count,
        percentage,
        ...LANGUAGE_METADATA[lang]
      };
    });
    if (langCounts.Other > 0) {
      languageDistribution.push({
        language: "Other",
        count: langCounts.Other,
        percentage: Math.round((langCounts.Other / totalAnalyses) * 100),
        ...LANGUAGE_METADATA.Other
      });
    }

    // 7. Secondary Emotion Distribution (all 9 classes represented)
    const secondaryEmotionDistribution = availableMoods.map((m) => {
      const count = secondaryCounts[m] || 0;
      const percentage = Math.round((count / totalAnalyses) * 100);
      return {
        mood: m,
        count,
        percentage,
        ...MOOD_METADATA[m]
      };
    });

    // 8. Mood Distribution (all 9 classes represented)
    const moodDistribution = availableMoods.map((m) => {
      const count = moodCounts[m] || 0;
      const percentage = Math.round((count / totalAnalyses) * 100);
      return {
        mood: m,
        count,
        percentage,
        ...MOOD_METADATA[m]
      };
    });

    // 7. Interactive Mood Trends (Daily, Weekly, Monthly)
    // Daily Trends (grouped by YYYY-MM-DD)
    const dailyMap = new Map();
    filteredRecords.forEach((rec) => {
      const d = new Date(rec.createdAt).toISOString().split("T")[0];
      if (!dailyMap.has(d)) {
        dailyMap.set(d, { date: d, label: d, total: 0, moods: {} });
      }
      const entry = dailyMap.get(d);
      entry.total += 1;
      entry.moods[rec.mood] = (entry.moods[rec.mood] || 0) + 1;
    });

    const dailyTrends = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    // Weekly Trends
    const weeklyMap = new Map();
    filteredRecords.forEach((rec) => {
      const d = new Date(rec.createdAt);
      // Start of week (Sunday)
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const key = startOfWeek.toISOString().split("T")[0];
      const label = `Week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, { date: key, label, total: 0, moods: {} });
      }
      const entry = weeklyMap.get(key);
      entry.total += 1;
      entry.moods[rec.mood] = (entry.moods[rec.mood] || 0) + 1;
    });

    const weeklyTrends = Array.from(weeklyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);

    // Monthly Trends
    const monthlyMap = new Map();
    filteredRecords.forEach((rec) => {
      const d = new Date(rec.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, { date: key, label, total: 0, moods: {} });
      }
      const entry = monthlyMap.get(key);
      entry.total += 1;
      entry.moods[rec.mood] = (entry.moods[rec.mood] || 0) + 1;
    });

    const monthlyTrends = Array.from(monthlyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);

    // 8. Emotion Comparison Metrics
    const emotionComparison = availableMoods.map((m) => {
      const matchingMoodRecords = filteredRecords.filter((r) => r.mood === m);
      const count = matchingMoodRecords.length;
      const avgConf =
        count > 0
          ? Math.round(
              (matchingMoodRecords.reduce((acc, r) => acc + (Number(r.confidence) || 0), 0) / count) *
                10
            ) / 10
          : 0;

      return {
        mood: m,
        count,
        averageConfidence: avgConf,
        percentage: Math.round((count / totalAnalyses) * 100),
        ...MOOD_METADATA[m]
      };
    });

    // 9. Artist Analytics (Top Artists & Top Songs)
    const topArtists = Object.entries(artistCounts)
      .map(([art, count]) => {
        const artistTracks = filteredRecords.filter((r) => (r.artist || "").trim() === art);
        // Find artist's top mood
        const artMoods = {};
        let artConfSum = 0;
        artistTracks.forEach((t) => {
          artMoods[t.mood] = (artMoods[t.mood] || 0) + 1;
          artConfSum += Number(t.confidence) || 0;
        });
        let topArtMood = "Happy";
        let maxMCount = 0;
        Object.entries(artMoods).forEach(([m, c]) => {
          if (c > maxMCount) {
            maxMCount = c;
            topArtMood = m;
          }
        });

        return {
          artist: art,
          count,
          topMood: topArtMood,
          averageConfidence: Math.round((artConfSum / (artistTracks.length || 1)) * 10) / 10
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topSongs = Object.entries(songCounts)
      .map(([key, count]) => {
        const [title, art] = key.split(":::");
        const songRecord = filteredRecords.find(
          (r) => (r.title || "").trim() === title && (r.artist || "").trim() === art
        );
        return {
          title,
          artist: art,
          count,
          mood: songRecord?.mood || "Happy",
          confidence: songRecord?.confidence || 90
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 10. Confidence Analytics & Distribution Buckets
    const confBuckets = {
      veryHigh: 0, // 90-100%
      high: 0, // 80-89%
      moderate: 0, // 70-79%
      tentative: 0 // <70%
    };

    filteredRecords.forEach((r) => {
      const c = Number(r.confidence) || 0;
      if (c >= 90) confBuckets.veryHigh += 1;
      else if (c >= 80) confBuckets.high += 1;
      else if (c >= 70) confBuckets.moderate += 1;
      else confBuckets.tentative += 1;
    });

    const confidenceDistribution = [
      {
        range: "90–100% (Very High)",
        count: confBuckets.veryHigh,
        percentage: Math.round((confBuckets.veryHigh / totalAnalyses) * 100),
        color: "#10b981"
      },
      {
        range: "80–89% (High)",
        count: confBuckets.high,
        percentage: Math.round((confBuckets.high / totalAnalyses) * 100),
        color: "#3b82f6"
      },
      {
        range: "70–79% (Moderate)",
        count: confBuckets.moderate,
        percentage: Math.round((confBuckets.moderate / totalAnalyses) * 100),
        color: "#f59e0b"
      },
      {
        range: "<70% (Tentative)",
        count: confBuckets.tentative,
        percentage: Math.round((confBuckets.tentative / totalAnalyses) * 100),
        color: "#ef4444"
      }
    ];

    const individualPoints = filteredRecords.slice(0, 15).map((r) => ({
      id: r._id,
      title: r.title,
      artist: r.artist,
      mood: r.mood,
      confidence: r.confidence,
      date: r.createdAt
    }));

    return {
      success: true,
      scope,
      kpi: {
        totalAnalyses,
        mostFrequentlyDetectedEmotion: topMood,
        mostFrequentCount: topMoodCount,
        mostFrequentSecondaryEmotion: topSecondaryMood,
        mostFrequentSecondaryCount: topSecondaryCount,
        totalWithSecondary,
        topLanguage,
        topLanguageCount,
        uniqueArtistsCount,
        averageConfidence,
        recentActivity: filteredRecords.slice(0, 5).map((r) => ({
          id: r._id,
          title: r.title,
          artist: r.artist,
          mood: r.mood,
          confidence: r.confidence,
          date: r.createdAt
        }))
      },
      languageDistribution,
      secondaryEmotionDistribution,
      moodDistribution,
      trends: {
        daily: dailyTrends,
        weekly: weeklyTrends,
        monthly: monthlyTrends
      },
      emotionComparison,
      artistAnalytics: {
        topArtists,
        topSongs
      },
      confidenceAnalytics: {
        averageConfidence,
        distribution: confidenceDistribution,
        individualPoints,
        disclaimer:
          "Important Note on Confidence: Model confidence reflects the statistical certainty and density of lexical emotion cues extracted by the NLP classifier. It measures linguistic signal strength, not psychological diagnosis or human ground-truth correctness."
      },
      availableMoods,
      availableArtists
    };
  }
}

const analyticsService = new AnalyticsService();
module.exports = analyticsService;
