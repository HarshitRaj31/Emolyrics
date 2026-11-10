const LyricsProviderInterface = require("./lyricsProviderInterface");

/**
 * LRCLIB Authorized Lyrics Provider
 * Public REST API (https://lrclib.net) specifically built for open-source audio players.
 * 100% legal, non-scraping crowd-sourced licensed repository.
 */
class LrclibProvider extends LyricsProviderInterface {
  constructor() {
    super("LRCLIB (Authorized Public API)");
    this.baseUrl = "https://lrclib.net/api";
  }

  isAvailable() {
    return true; // No private API key required; completely open REST API
  }

  async fetchLyrics({ title, artist, album, duration }) {
    if (!title) {
      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: "Track title is required to retrieve lyrics."
      };
    }

    try {
      // 1. Try exact match via /get endpoint
      const params = new URLSearchParams({
        track_name: title.trim()
      });
      if (artist) params.append("artist_name", artist.trim());
      if (album) params.append("album_name", album.trim());
      if (duration && Number(duration) > 0) {
        params.append("duration", Math.round(Number(duration) / 1000));
      }

      const getUrl = `${this.baseUrl}/get?${params.toString()}`;
      const response = await fetch(getUrl, {
        headers: {
          "User-Agent": "EmoLyrics/2.0.0 (https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07)"
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.instrumental) {
          return {
            success: true,
            lyrics: null,
            syncedLyrics: null,
            isInstrumental: true,
            provider: this.name,
            copyrightNotice: "Verified instrumental track from LRCLIB community database."
          };
        }

        if (data.plainLyrics && data.plainLyrics.trim()) {
          return {
            success: true,
            lyrics: data.plainLyrics.trim(),
            syncedLyrics: data.syncedLyrics || null,
            isInstrumental: false,
            provider: this.name,
            copyrightNotice: "Lyrics legally retrieved via LRCLIB authorized open REST API."
          };
        }
      }

      // 2. Fallback: Query /search endpoint with track name & artist
      const searchParams = new URLSearchParams();
      if (artist) {
        searchParams.append("track_name", title.trim());
        searchParams.append("artist_name", artist.trim());
      } else {
        searchParams.append("q", title.trim());
      }

      const searchUrl = `${this.baseUrl}/search?${searchParams.toString()}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          "User-Agent": "EmoLyrics/2.0.0 (https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07)"
        }
      });

      if (searchRes.ok) {
        const results = await searchRes.json();
        if (Array.isArray(results) && results.length > 0) {
          // Select best match with lyrics
          const match = results.find(
            (r) => r.plainLyrics && r.plainLyrics.trim().length > 30
          ) || results[0];

          if (match.instrumental) {
            return {
              success: true,
              lyrics: null,
              syncedLyrics: null,
              isInstrumental: true,
              provider: this.name,
              copyrightNotice: "Verified instrumental track from LRCLIB community database."
            };
          }

          if (match.plainLyrics && match.plainLyrics.trim()) {
            return {
              success: true,
              lyrics: match.plainLyrics.trim(),
              syncedLyrics: match.syncedLyrics || null,
              isInstrumental: false,
              provider: this.name,
              copyrightNotice: "Lyrics legally retrieved via LRCLIB authorized open REST API."
            };
          }
        }
      }

      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: `No authorized lyrics found on LRCLIB for "${title}"${artist ? ` by ${artist}` : ""}.`
      };
    } catch (err) {
      console.warn(`[LRCLIB Provider] Retrieval warning for "${title}":`, err.message);
      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: `Failed to contact LRCLIB API: ${err.message}`
      };
    }
  }
}

module.exports = LrclibProvider;

