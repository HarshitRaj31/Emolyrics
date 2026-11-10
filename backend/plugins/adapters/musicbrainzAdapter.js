/**
 * MusicBrainz Metadata Adapter
 * Interfaces with the official free, public MusicBrainz API (https://musicbrainz.org)
 * Includes in-memory caching (15-min TTL) and compliant User-Agent headers.
 */

class MusicBrainzAdapter {
  constructor() {
    this.baseUrl = "https://musicbrainz.org/ws/2";
    this.userAgent = "EmoLyrics/2.0.0 ( contact@emolyrics.app; https://github.com/Chandrima2507 )";
    this.cache = new Map();
    this.CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
    this.lastRequestTime = 0;
  }

  /**
   * Respect MusicBrainz 1 req/sec rate limit
   */
  async _throttle() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < 1100) {
      await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Format milliseconds into mm:ss
   */
  _formatDuration(ms) {
    if (!ms || isNaN(ms) || ms <= 0) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }

  /**
   * Fallback song discovery via LRCLIB public track search if MusicBrainz is unavailable
   */
  async _fallbackLrclibSearch(cleanQuery, limit) {
    try {
      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return null;

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) return null;

      const recordings = items.slice(0, limit).map((item) => {
        const title = item.name || item.trackName || "Unknown Title";
        const artist = item.artistName || "Unknown Artist";
        const album = item.albumName || "Unknown Album";
        const durationMs = item.duration ? Math.round(item.duration * 1000) : null;
        const spotifySearchQuery = encodeURIComponent(`${title} ${artist}`);

        return {
          id: `lrclib-${item.id}`,
          title,
          artist,
          artistId: null,
          album,
          releaseMbid: null,
          coverArtUrl: null,
          releaseDate: null,
          releaseYear: null,
          durationMs,
          durationFormatted: this._formatDuration(durationMs),
          disambiguation: item.instrumental ? "Instrumental" : null,
          spotifyUrl: `https://open.spotify.com/search/${spotifySearchQuery}`,
          tags: ["fallback-provider"]
        };
      });

      return {
        total: recordings.length,
        query: cleanQuery,
        recordings
      };
    } catch {
      return null;
    }
  }

  /**
   * Search recordings on MusicBrainz by title, artist, album, or general keywords
   * @param {string} query Search text
   * @param {number} limit Number of results (default 10)
   */
  async searchRecordings(query, limit = 10) {
    if (!query || !query.trim()) {
      return { total: 0, recordings: [] };
    }

    const cleanQuery = query.trim();
    const cacheKey = `${cleanQuery.toLowerCase()}:::${limit}`;

    // 1. Check in-memory cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        fromCache: true
      };
    }

    try {
      await this._throttle();

      // 2. Query MusicBrainz API
      const searchUrl = `${this.baseUrl}/recording?query=${encodeURIComponent(cleanQuery)}&fmt=json&limit=${limit}`;

      let res = await fetch(searchUrl, {
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json"
        },
        signal: AbortSignal.timeout(8000)
      });

      // Handle 503 rate limit with single retry
      if (res.status === 503) {
        await new Promise((r) => setTimeout(r, 1200));
        res = await fetch(searchUrl, {
          headers: {
            "User-Agent": this.userAgent,
            Accept: "application/json"
          },
          signal: AbortSignal.timeout(8000)
        });
      }

      if (!res.ok) {
        // Attempt fallback search
        const fallback = await this._fallbackLrclibSearch(cleanQuery, limit);
        if (fallback) {
          return { ...fallback, fromCache: false, fallback: true };
        }
        throw new Error(`MusicBrainz API returned HTTP status ${res.status}`);
      }

      const data = await res.json();
      const rawRecordings = data.recordings || [];

      // 3. Format into rich, clean song objects
      const recordings = rawRecordings.map((rec) => {
        // Extract primary artist credit
        const artistCredit = rec["artist-credit"]
          ? rec["artist-credit"].map((a) => a.name || a.artist?.name || "").filter(Boolean).join(" ")
          : "Unknown Artist";

        const primaryArtistId = rec["artist-credit"]?.[0]?.artist?.id || null;

        // Extract primary release / album
        const primaryRelease = rec.releases?.[0] || null;
        const albumTitle = primaryRelease?.title || "Single / Unknown Album";
        const releaseMbid = primaryRelease?.id || null;
        const releaseDate = primaryRelease?.date || rec.first_release_date || null;
        const releaseYear = releaseDate ? releaseDate.split("-")[0] : null;

        // Cover Art Archive URL (free open artwork)
        const coverArtUrl = releaseMbid
          ? `https://coverartarchive.org/release/${releaseMbid}/front-250`
          : null;

        // Direct Spotify search & listen link (no premium required)
        const spotifySearchQuery = encodeURIComponent(`${rec.title} ${artistCredit}`);
        const spotifyUrl = `https://open.spotify.com/search/${spotifySearchQuery}`;

        return {
          id: rec.id, // Recording MBID
          title: rec.title,
          artist: artistCredit,
          artistId: primaryArtistId,
          album: albumTitle,
          releaseMbid,
          coverArtUrl,
          releaseDate,
          releaseYear,
          durationMs: rec.length || null,
          durationFormatted: this._formatDuration(rec.length),
          disambiguation: rec.disambiguation || null,
          spotifyUrl,
          tags: rec.tags?.slice(0, 3).map((t) => t.name) || []
        };
      });

      const responsePayload = {
        total: data.count || recordings.length,
        query: cleanQuery,
        recordings
      };

      // 4. Save to cache
      this.cache.set(cacheKey, {
        data: responsePayload,
        expiresAt: Date.now() + this.CACHE_TTL_MS
      });

      return {
        ...responsePayload,
        fromCache: false
      };
    } catch (err) {
      console.error("[MusicBrainz Adapter Error]:", err.message);
      throw new Error(`MusicBrainz search error: ${err.message}`);
    }
  }
}

const musicBrainzAdapter = new MusicBrainzAdapter();
module.exports = musicBrainzAdapter;
