/**
 * Abstract Base Class / Interface for Authorized Lyrics Providers
 * Ensures all lyrics integrations follow a strict, uniform contract.
 */
class LyricsProviderInterface {
  constructor(name) {
    if (this.constructor === LyricsProviderInterface) {
      throw new Error("Cannot instantiate abstract class LyricsProviderInterface directly.");
    }
    this.name = name;
  }

  /**
   * Check if provider is configured and available
   * @returns {boolean}
   */
  isAvailable() {
    return true;
  }

  /**
   * Retrieve lyrics for a track
   * @param {Object} query { title, artist, album, duration }
   * @returns {Promise<{
   *   success: boolean,
   *   lyrics: string|null,
   *   syncedLyrics: string|null,
   *   isInstrumental: boolean,
   *   provider: string,
   *   copyrightNotice: string,
   *   error?: string
   * }>}
   */
  async fetchLyrics(query) {
    throw new Error("Method 'fetchLyrics' must be implemented by subclass.");
  }
}

module.exports = LyricsProviderInterface;

