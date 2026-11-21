const LyricsProviderInterface = require("./lyricsProviderInterface");

/**
 * Lyrics.ovh Authorized Public Provider
 * Free open API fallback for international and legacy tracks.
 */
class LyricsOvhProvider extends LyricsProviderInterface {
  constructor() {
    super("Lyrics.ovh (Public Fallback API)");
    this.baseUrl = "https://api.lyrics.ovh/v1";
    this.suggestUrl = "https://api.lyrics.ovh/suggest";
    this.userAgent = "EmoLyrics/2.0.0 (https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07)";
  }

  isAvailable() {
    return true;
  }

  /**
   * Normalize and sanitize artist and song title to handle extra noise,
   * featured credits, remaster/live tags, and split artist prefixes.
   */
  _normalizeMetadata(rawArtist = "", rawTitle = "") {
    let artist = (rawArtist || "").trim();
    let title = (rawTitle || "").trim();

    // If title is "Artist - Title", split it
    if (title.includes(" - ")) {
      const parts = title.split(" - ");
      if (parts.length === 2) {
        if (!artist || artist.toLowerCase() === parts[0].trim().toLowerCase()) {
          artist = parts[0].trim();
          title = parts[1].trim();
        }
      }
    }

    // Strip parenthetical and bracket noise like (Remastered 2011), (Official Video), (Live), [Lyrics], etc.
    title = title
      .replace(/\s*\(remaster(ed)?.*?\)/gi, "")
      .replace(/\s*\[remaster(ed)?.*?\]/gi, "")
      .replace(/\s*\(official\s*(music\s*)?video.*?\)/gi, "")
      .replace(/\s*\[official\s*(music\s*)?video.*?\]/gi, "")
      .replace(/\s*\(live.*?\)/gi, "")
      .replace(/\s*\[live.*?\]/gi, "")
      .replace(/\s*\(feat\..*?\)/gi, "")
      .replace(/\s*\[feat\..*?\)/gi, "")
      .replace(/\s*\(ft\..*?\)/gi, "")
      .replace(/\s*\[ft\..*?\)/gi, "")
      .replace(/\s*\(audio.*?\)/gi, "")
      .replace(/\s*\[audio.*?\]/gi, "")
      .replace(/\s*\(lyrics.*?\)/gi, "")
      .replace(/\s*\[lyrics.*?\]/gi, "")
      .replace(/\s*\(cover.*?\)/gi, "")
      .replace(/\s*-\s*remaster(ed)?.*$/gi, "")
      .replace(/\s*-\s*radio edit.*$/gi, "")
      .replace(/\s*-\s*single version.*$/gi, "")
      .replace(/\s*-\s*live.*$/gi, "")
      .trim();

    // If title has (Artist), e.g. "Yellow (Coldplay)" -> "Yellow"
    if (artist) {
      const escapedArtist = artist.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const artistRegex = new RegExp(`\\s*\\(${escapedArtist}\\)`, "gi");
      title = title.replace(artistRegex, "").trim();
    }

    // Strip featured artists from artist string to isolate primary artist
    artist = artist
      .replace(/\s*(feat\.|ft\.|featuring).*$/gi, "")
      .replace(/\s*\(feat\..*?\)/gi, "")
      .trim();

    return { artist, title };
  }

  /**
   * Helper to execute a single fetch to api.lyrics.ovh/v1/:artist/:title
   */
  async _fetchDirect(artistName, songTitle) {
    if (!artistName || !songTitle) return null;
    const cleanArtist = encodeURIComponent(artistName.trim());
    const cleanTitle = encodeURIComponent(songTitle.trim());
    const url = `${this.baseUrl}/${cleanArtist}/${cleanTitle}`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        headers: {
          "User-Agent": this.userAgent
        }
      });

      if (!res.ok) {
        return { ok: false, status: res.status, url };
      }

      const data = await res.json();
      if (data && data.lyrics && data.lyrics.trim().length > 20) {
        return {
          ok: true,
          status: 200,
          url,
          lyrics: data.lyrics.trim()
        };
      }

      return { ok: false, status: 200, url, empty: true };
    } catch (err) {
      return { ok: false, status: 0, url, error: err.message };
    }
  }

  async fetchLyrics({ title, artist }) {
    if (!title) {
      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        error: "Track title is required for Lyrics.ovh provider."
      };
    }

    const rawArtist = (artist || "").trim();
    const rawTitle = (title || "").trim();
    const { artist: cleanArtist, title: cleanTitle } = this._normalizeMetadata(rawArtist, rawTitle);

    let lastAttemptUrl = `${this.baseUrl}/${encodeURIComponent(rawArtist)}/${encodeURIComponent(rawTitle)}`;
    let lastStatus = 404;

    try {
      // 1. Primary Attempt: Direct fetch with normalized artist & title
      if (cleanArtist && cleanTitle) {
        const directRes = await this._fetchDirect(cleanArtist, cleanTitle);
        if (directRes) {
          lastAttemptUrl = directRes.url;
          lastStatus = directRes.status;
          if (directRes.ok && directRes.lyrics) {
            return {
              success: true,
              lyrics: directRes.lyrics,
              syncedLyrics: null,
              isInstrumental: false,
              provider: this.name,
              url: directRes.url,
              copyrightNotice: "Lyrics retrieved via Lyrics.ovh public API."
            };
          }
        }
      }

      // 2. Secondary Attempt: If clean metadata differed from raw input, try raw
      if (rawArtist && (rawArtist !== cleanArtist || rawTitle !== cleanTitle)) {
        const rawRes = await this._fetchDirect(rawArtist, rawTitle);
        if (rawRes) {
          lastAttemptUrl = rawRes.url;
          lastStatus = rawRes.status;
          if (rawRes.ok && rawRes.lyrics) {
            return {
              success: true,
              lyrics: rawRes.lyrics,
              syncedLyrics: null,
              isInstrumental: false,
              provider: this.name,
              url: rawRes.url,
              copyrightNotice: "Lyrics retrieved via Lyrics.ovh public API."
            };
          }
        }
      }

      // 3. Tertiary Attempt: Try swapped artist and title (in case caller inverted them)
      if (cleanArtist && cleanTitle && cleanArtist.toLowerCase() !== cleanTitle.toLowerCase()) {
        const swappedRes = await this._fetchDirect(cleanTitle, cleanArtist);
        if (swappedRes && swappedRes.ok && swappedRes.lyrics) {
          return {
            success: true,
            lyrics: swappedRes.lyrics,
            syncedLyrics: null,
            isInstrumental: false,
            provider: this.name,
            url: swappedRes.url,
            copyrightNotice: "Lyrics retrieved via Lyrics.ovh public API."
          };
        }
      }

      // 4. Suggestion Fallback: Query Lyrics.ovh Suggest API to resolve canonical track
      const suggestQuery = `${cleanArtist} ${cleanTitle}`.trim();
      if (suggestQuery) {
        try {
          const suggestUrl = `${this.suggestUrl}/${encodeURIComponent(suggestQuery)}`;
          const sRes = await fetch(suggestUrl, {
            signal: AbortSignal.timeout(6000),
            headers: { "User-Agent": this.userAgent }
          });

          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData && Array.isArray(sData.data) && sData.data.length > 0) {
              const bestCandidate = sData.data[0];
              const canonicalArtist = bestCandidate.artist?.name;
              const canonicalTitle = bestCandidate.title;

              if (canonicalArtist && canonicalTitle) {
                const canonRes = await this._fetchDirect(canonicalArtist, canonicalTitle);
                if (canonRes) {
                  lastAttemptUrl = canonRes.url;
                  lastStatus = canonRes.status;
                  if (canonRes.ok && canonRes.lyrics) {
                    return {
                      success: true,
                      lyrics: canonRes.lyrics,
                      syncedLyrics: null,
                      isInstrumental: false,
                      provider: this.name,
                      url: canonRes.url,
                      copyrightNotice: "Lyrics retrieved via Lyrics.ovh public API."
                    };
                  }
                }
              }
            }
          }
        } catch {
          // Suggest fallback ignored, continue to failure response
        }
      }

      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        url: lastAttemptUrl,
        error: `Lyrics.ovh returned HTTP ${lastStatus || 404}`
      };
    } catch (err) {
      return {
        success: false,
        lyrics: null,
        isInstrumental: false,
        provider: this.name,
        url: lastAttemptUrl,
        error: err.message
      };
    }
  }
}

module.exports = LyricsOvhProvider;
