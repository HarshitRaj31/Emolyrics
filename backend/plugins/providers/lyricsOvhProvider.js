const LyricsProviderInterface = require("./lyricsProviderInterface");

/**
 * Lyrics.ovh Authorized Public Provider
 * Free open API fallback for international and legacy tracks.
 */
class LyricsOvhProvider extends LyricsProviderInterface {
  constructor() {
    super("Lyrics.ovh (Public Fallback API)");
    this.baseUrl = "https://api.lyrics.ovh/v1";
  }

  isAvailable() {
    return true;
  }

  async fetchLyrics({ title, artist }) {
    if (!title || !artist) {
      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: "Both artist and title are required for Lyrics.ovh provider."
      };
    }

    try {
      const cleanArtist = encodeURIComponent(artist.trim());
      const cleanTitle = encodeURIComponent(title.trim());
      const url = `${this.baseUrl}/${cleanArtist}/${cleanTitle}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: {
          "User-Agent": "EmoLyrics/2.0.0"
        }
      });

      if (!res.ok) {
        return {
          success: false,
          lyrics: null,
          isInstrumental: false,
          provider: this.name,
          error: `Lyrics.ovh returned HTTP ${res.status}`
        };
      }

      const data = await res.json();
      if (data && data.lyrics && data.lyrics.trim().length > 20) {
        return {
          success: true,
          lyrics: data.lyrics.trim(),
          syncedLyrics: null,
          isInstrumental: false,
          provider: this.name,
          copyrightNotice: "Lyrics retrieved via Lyrics.ovh public API."
        };
      }

      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: "Empty lyrics response from Lyrics.ovh"
      };
    } catch (err) {
      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: err.message
      };
    }
  }
}

module.exports = LyricsOvhProvider;

