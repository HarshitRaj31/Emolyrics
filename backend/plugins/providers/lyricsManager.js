const LrclibProvider = require("./lrclibProvider");
const LyricsOvhProvider = require("./lyricsOvhProvider");

class LyricsManager {
  constructor() {
    this.providers = [
      new LrclibProvider(),
      new LyricsOvhProvider()
    ];
    // In-memory cache: key -> { data, expiresAt }
    this.cache = new Map();
    this.CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
  }

  /**
   * Generate cache key from title and artist
   */
  _generateKey(title, artist) {
    return `${(title || "").trim().toLowerCase()}:::${(artist || "").trim().toLowerCase()}`;
  }

  /**
   * Fetch lyrics by querying available providers in priority order
   * @param {Object} query { title, artist, album, duration }
   */
  async getLyrics(query) {
    const key = this._generateKey(query.title, query.artist);

    // 1. Check cache
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        fromCache: true
      };
    }

    // 2. Iterate through available providers
    let lastError = "No lyrics providers available.";

    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;

      try {
        const result = await provider.fetchLyrics(query);
        if (result.success) {
          // Cache successful result or instrumental confirmation
          this.cache.set(key, {
            data: result,
            expiresAt: Date.now() + this.CACHE_TTL_MS
          });
          return {
            ...result,
            fromCache: false
          };
        }
        if (result.error) {
          lastError = result.error;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    // 3. If no provider found lyrics
    return {
      success: false,
      lyrics: null,
      isInstrumental: false,
      provider: null,
      error: `Could not retrieve verified lyrics for "${query.title}"${query.artist ? ` by ${query.artist}` : ""}. ${lastError}`
    };
  }

  /**
   * Clear cache if needed
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton export
const lyricsManager = new LyricsManager();
module.exports = lyricsManager;

