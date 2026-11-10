/**
 * EmoLyrics Smart Mood-Based Playlist Generator Engine
 * Automatically generates, curates, and sequences playlists matching single
 * or multiple target emotions, utilizing analyzed user history, model prediction
 * confidence, artist diversity controls, and duplicate prevention.
 *
 * Supported 9 ML Model Emotion Classes:
 * Happy, Sad, Angry, Romantic, Calm/Chill, Exciting, Patriotic, Thrilling, Horror.
 */

const { getIsConnected, memoryStore } = require("../db");
const Playlist = require("../models/Playlist");
const Analysis = require("../models/Analysis");
const recommendationService = require("./recommendationService");
const CURATED_EMOTION_CATALOG =
  recommendationService.CURATED_EMOTION_CATALOG || {};

const VALID_EMOTIONS = [
  "Happy",
  "Sad",
  "Angry",
  "Romantic",
  "Calm/Chill",
  "Exciting",
  "Patriotic",
  "Thrilling",
  "Horror"
];

// Smart Titles & Descriptors Generator for single or mixed emotions
const EMOTION_TITLES = {
  Happy: ["Euphoric Sunshine", "Golden Daybreak", "Pure Bliss & High Valence", "Joyful Horizon"],
  Sad: ["Midnight Melancholy", "Echoes in the Rain", "Vulnerable Solitude", "Quiet Heartstrings"],
  Angry: ["Cathartic Fire", "Unleashed Fury", "Defiant Resonance", "Raw Voltage"],
  Romantic: ["Constellations of Love", "Tender Embers", "Starry Devotion", "Soulmate Serenade"],
  "Calm/Chill": ["Tranquil Shorelines", "Ocean Whispers", "Slow Breathing Room", "Serene Drift"],
  Exciting: ["Electric Pulse", "Adrenaline Surge", "Unstoppable Tempo", "Ignite the Floor"],
  Patriotic: ["Anthem of Pride", "Honor & Heritage", "Sons of the Soil", "Valor United"],
  Thrilling: ["Edge of the Night", "Shadow Chase", "Heartbeat Countdown", "Suspense Velocity"],
  Horror: ["Nocturnal Tremors", "Whispers from the Crypt", "Creeping Darkness", "Grave Echoes"]
};

/**
 * Generate Listening URLs for a song
 */
function enrichSongListeningLinks(song) {
  if (!song || typeof song !== "object") return song;
  const title = (song.title || "Untitled").trim();
  const artist = (song.artist || "Unknown Artist").trim();
  const query = encodeURIComponent(`${title} ${artist}`);
  return {
    ...song,
    title,
    artist,
    spotifyUrl:
      song.spotifyUrl || `https://open.spotify.com/search/${query}`,
    youtubeUrl:
      song.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(title + " " + artist + " audio")}`
  };
}

class PlaylistGeneratorService {
  /**
   * Seed default 9 emotion presets into database if not present
   */
  async ensurePresetsSeeded() {
    if (!getIsConnected()) return;
    try {
      const count = await Playlist.countDocuments({ isSystemPreset: true });
      if (count < 9) {
        for (const pl of memoryStore.playlists) {
          const exists = await Playlist.findOne({ mood: pl.mood, isSystemPreset: true });
          if (!exists) {
            await Playlist.create({
              title: pl.title,
              description: pl.description,
              mood: pl.mood,
              emotions: [pl.mood],
              isSystemPreset: true,
              songs: pl.songs.map((s) =>
                enrichSongListeningLinks({ ...s, mood: pl.mood, source: "recommended" })
              )
            });
          }
        }
      }
    } catch (e) {
      console.warn("[PlaylistGenerator] Presets seed warning:", e.message);
    }
  }

  /**
   * Validate and sanitize requested emotions against model labels
   */
  sanitizeEmotions(emotionsInput) {
    if (!emotionsInput) return ["Happy"];
    const arr = Array.isArray(emotionsInput) ? emotionsInput : [emotionsInput];
    const filtered = arr.filter((e) => VALID_EMOTIONS.includes(e));
    return filtered.length > 0 ? filtered : ["Happy"];
  }

  /**
   * Smart Playlist Generation
   * @param {object} options
   * @param {Array<string>|string} options.emotions - Single or multiple target emotions
   * @param {number} [options.count=10] - Desired song count (5-30)
   * @param {string} [options.title] - Optional custom title
   * @param {string} [options.description] - Optional custom description
   * @param {string} [options.userId] - Authenticated user ID (if any)
   */
  async generatePlaylist(options = {}) {
    const {
      count = 10,
      title: customTitle,
      description: customDescription,
      userId = null
    } = options;

    const targetEmotions = this.sanitizeEmotions(options.emotions || options.mood);
    const targetCount = Math.min(Math.max(parseInt(count, 10) || 10, 5), 30);

    // 1. Gather Candidate Songs from User/Community ML Analyses
    let analyzedPool = [];
    try {
      if (getIsConnected()) {
        const query = { mood: { $in: targetEmotions } };
        analyzedPool = await Analysis.find(query)
          .sort({ confidence: -1, createdAt: -1 })
          .limit(40)
          .lean();
      } else {
        analyzedPool = memoryStore.analyses.filter((a) =>
          targetEmotions.includes(a.mood)
        );
      }
    } catch (e) {
      console.warn("[PlaylistGenerator] Error fetching analyses pool:", e.message);
    }

    // 2. Gather Curated Catalog Tracks for Target Emotions
    const catalogPool = [];
    for (const em of targetEmotions) {
      const items = CURATED_EMOTION_CATALOG[em] || [];
      for (const item of items) {
        catalogPool.push({
          ...item,
          mood: em,
          source: "recommended"
        });
      }
    }

    // 3. Selection & Sequencing with Duplicate Prevention & Artist Diversity
    const selectedSongs = [];
    const seenSongs = new Set();
    const artistCounts = new Map();

    const maxPerArtist = targetCount <= 8 ? 2 : 3;

    // Helper to evaluate and add a candidate song
    const tryAddSong = (candidate, sourceTag) => {
      if (!candidate || !candidate.title || !candidate.artist) return false;
      const key = `${candidate.title.trim().toLowerCase()}::${candidate.artist.trim().toLowerCase()}`;

      if (seenSongs.has(key)) return false;

      const artistKey = candidate.artist.trim().toLowerCase();
      const currentArtistCount = artistCounts.get(artistKey) || 0;
      if (currentArtistCount >= maxPerArtist && selectedSongs.length < targetCount - 2) {
        return false;
      }

      seenSongs.add(key);
      artistCounts.set(artistKey, currentArtistCount + 1);

      const songObj = enrichSongListeningLinks({
        title: candidate.title.trim(),
        artist: candidate.artist.trim(),
        album: candidate.album || "Single",
        duration: candidate.duration || "3:30",
        coverArtUrl:
          candidate.coverArtUrl ||
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
        mood: candidate.mood || targetEmotions[0],
        confidence: candidate.confidence || null,
        source: sourceTag || candidate.source || "recommended",
        analysisId: candidate._id || null
      });

      selectedSongs.push(songObj);
      return true;
    };

    // Step A: Allocate slots across target emotions
    const slotsPerEmotion = Math.max(1, Math.floor(targetCount / targetEmotions.length));

    for (const emotion of targetEmotions) {
      let addedForEmotion = 0;

      // First check ML analyzed songs matching this emotion
      const matchingAnalyzed = analyzedPool.filter((a) => a.mood === emotion);
      for (const a of matchingAnalyzed) {
        if (addedForEmotion >= slotsPerEmotion) break;
        if (tryAddSong(a, "analyzed")) {
          addedForEmotion++;
        }
      }

      // Fill remaining emotion slots with Curated Catalog
      const matchingCatalog = catalogPool.filter((c) => c.mood === emotion);
      for (const c of matchingCatalog) {
        if (addedForEmotion >= slotsPerEmotion) break;
        if (tryAddSong(c, "recommended")) {
          addedForEmotion++;
        }
      }
    }

    // Step B: If slots still need filling up to targetCount, draw from combined pool
    const remainingPool = [...analyzedPool, ...catalogPool];
    for (const item of remainingPool) {
      if (selectedSongs.length >= targetCount) break;
      tryAddSong(item, item._id ? "analyzed" : "recommended");
    }

    // 4. Generate Smart Title & Description
    const isMixed = targetEmotions.length > 1;
    const primaryMood = targetEmotions[0];

    let generatedTitle = customTitle;
    let generatedDescription = customDescription;

    if (!generatedTitle) {
      if (isMixed) {
        const titlePair = targetEmotions.slice(0, 2).join(" & ");
        generatedTitle = `Harmonic Fusion (${titlePair})`;
      } else {
        const titleOptions = EMOTION_TITLES[primaryMood] || ["Emotion Sync"];
        generatedTitle = titleOptions[Math.floor(Math.random() * titleOptions.length)];
      }
    }

    if (!generatedDescription) {
      if (isMixed) {
        generatedDescription = `An intelligent ${selectedSongs.length}-track playlist blending ${targetEmotions.join(", ")} vibes, prioritizing verified NLP lyrical sentiments and smooth transitions.`;
      } else {
        generatedDescription = `A focused ${selectedSongs.length}-track collection synchronized with ${primaryMood} emotional frequencies, verified through EmoLyrics NLP analysis.`;
      }
    }

    return {
      title: generatedTitle,
      description: generatedDescription,
      mood: isMixed ? "Mixed" : primaryMood,
      emotions: targetEmotions,
      isSystemPreset: false,
      artwork:
        selectedSongs[0]?.coverArtUrl ||
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
      songs: selectedSongs,
      stats: {
        totalSongs: selectedSongs.length,
        analyzedCount: selectedSongs.filter((s) => s.source === "analyzed").length,
        recommendedCount: selectedSongs.filter((s) => s.source === "recommended").length,
        uniqueArtists: artistCounts.size
      }
    };
  }

  /**
   * Save a Playlist to Database (or MemoryStore)
   */
  async savePlaylist(playlistData, userId = null) {
    const {
      title,
      description = "",
      mood = "Happy",
      emotions = ["Happy"],
      artwork = "",
      songs = []
    } = playlistData;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      mood,
      emotions,
      user: userId,
      isSystemPreset: false,
      artwork: artwork || songs[0]?.coverArtUrl || "",
      songs: (songs || []).filter(Boolean).map((s) => enrichSongListeningLinks(s))
    };

    if (getIsConnected()) {
      const created = await Playlist.create(payload);
      return created;
    } else {
      const created = {
        _id: "pl-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memoryStore.playlists.unshift(created);
      return created;
    }
  }

  /**
   * Duplicate an existing playlist
   */
  async duplicatePlaylist(playlistId, userId = null) {
    let source = null;

    if (getIsConnected()) {
      source = await Playlist.findById(playlistId).lean();
    } else {
      source = memoryStore.playlists.find((p) => p._id === playlistId);
    }

    if (!source) {
      throw new Error("Source playlist not found to duplicate.");
    }

    const newTitle = `${source.title} (Copy)`;
    const newPlaylist = {
      title: newTitle,
      description: source.description,
      mood: source.mood,
      emotions: source.emotions || [source.mood],
      artwork: source.artwork,
      songs: (source.songs || []).map((s) => ({
        title: s.title,
        artist: s.artist,
        album: s.album || "Single",
        duration: s.duration || "3:30",
        coverArtUrl: s.coverArtUrl || "",
        spotifyUrl: s.spotifyUrl || "",
        youtubeUrl: s.youtubeUrl || "",
        mood: s.mood || source.mood,
        confidence: s.confidence || null,
        source: s.source || "recommended"
      }))
    };

    return await this.savePlaylist(newPlaylist, userId);
  }
}

const playlistGeneratorService = new PlaylistGeneratorService();
module.exports = playlistGeneratorService;
