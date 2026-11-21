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
    this.userAgent = "EmoLyrics/2.0.0 (https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07)";
  }

  isAvailable() {
    return true; // No private API key required; completely open REST API
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

    const { artist: cleanArtist, title: cleanTitle } = this._normalizeMetadata(artist, title);

    try {
      // 1. Try exact match via /get endpoint with provided parameters
      const params = new URLSearchParams({
        track_name: cleanTitle || title.trim()
      });
      if (cleanArtist || artist) params.append("artist_name", (cleanArtist || artist).trim());
      if (album) params.append("album_name", album.trim());
      if (duration && Number(duration) > 0) {
        params.append("duration", Math.round(Number(duration) / 1000));
      }

      let getUrl = `${this.baseUrl}/get?${params.toString()}`;
      let response = await fetch(getUrl, {
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(6000)
      });

      // 1b. If album or duration caused exact match 404, retry /get with just clean title & artist
      if (!response.ok && (album || (duration && Number(duration) > 0))) {
        const simpleParams = new URLSearchParams({
          track_name: cleanTitle || title.trim()
        });
        if (cleanArtist || artist) simpleParams.append("artist_name", (cleanArtist || artist).trim());
        getUrl = `${this.baseUrl}/get?${simpleParams.toString()}`;
        response = await fetch(getUrl, {
          headers: { "User-Agent": this.userAgent },
          signal: AbortSignal.timeout(6000)
        });
      }

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

      // 2. Fallback: Query /search endpoint with clean track name & artist
      const searchParams = new URLSearchParams();
      const searchArtist = cleanArtist || (artist ? artist.trim() : "");
      const searchTitle = cleanTitle || title.trim();

      if (searchArtist) {
        searchParams.append("track_name", searchTitle);
        searchParams.append("artist_name", searchArtist);
      } else {
        searchParams.append("q", searchTitle);
      }

      let searchUrl = `${this.baseUrl}/search?${searchParams.toString()}`;
      let searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": this.userAgent },
        signal: AbortSignal.timeout(6000)
      });

      if (searchRes.ok) {
        let results = await searchRes.json();

        // 2b. If specific track_name & artist_name had no results, query general q parameter
        if ((!Array.isArray(results) || results.length === 0) && searchArtist) {
          const generalSearchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(`${searchArtist} ${searchTitle}`)}`;
          const genRes = await fetch(generalSearchUrl, {
            headers: { "User-Agent": this.userAgent },
            signal: AbortSignal.timeout(6000)
          });
          if (genRes.ok) {
            results = await genRes.json();
          }
        }

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
