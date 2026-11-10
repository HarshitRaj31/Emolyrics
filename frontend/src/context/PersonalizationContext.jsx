import { createContext, useContext, useState, useEffect, useCallback } from "react";

const PersonalizationContext = createContext(null);

const STORAGE_KEYS = {
  ANALYZED: "emolyrics_recently_analyzed",
  RECOMMENDED: "emolyrics_recently_recommended",
  HISTORY: "emolyrics_recommendation_history"
};

export function PersonalizationProvider({ children }) {
  const [recentlyAnalyzed, setRecentlyAnalyzed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANALYZED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyRecommended, setRecentlyRecommended] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECOMMENDED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recommendationHistory, setRecommendationHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ANALYZED, JSON.stringify(recentlyAnalyzed));
    } catch (e) {
      console.warn("Storage sync error (analyzed):", e);
    }
  }, [recentlyAnalyzed]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RECOMMENDED, JSON.stringify(recentlyRecommended));
    } catch (e) {
      console.warn("Storage sync error (recommended):", e);
    }
  }, [recentlyRecommended]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(recommendationHistory));
    } catch (e) {
      console.warn("Storage sync error (history):", e);
    }
  }, [recommendationHistory]);

  /**
   * Track an analyzed song into personal history
   */
  const addAnalyzedSong = useCallback((song) => {
    if (!song || !song.title) return;

    setRecentlyAnalyzed((prev) => {
      const cleanTitle = song.title.trim().toLowerCase();
      const cleanArtist = (song.artist || "").trim().toLowerCase();

      // Deduplicate
      const filtered = prev.filter(
        (item) =>
          !(item.title.trim().toLowerCase() === cleanTitle && (item.artist || "").trim().toLowerCase() === cleanArtist)
      );

      const entry = {
        id: song._id || song.id || `analyzed-${Date.now()}`,
        title: song.title.trim(),
        artist: (song.artist || "Unknown Artist").trim(),
        mood: song.mood || "Happy",
        emoji: song.emoji || "☀️",
        confidence: song.confidence || 90,
        color: song.color || "#f59e0b",
        timestamp: new Date().toISOString()
      };

      return [entry, ...filtered].slice(0, 20);
    });
  }, []);

  /**
   * Track recommended songs to prevent repeat recommendations and build history
   */
  const trackRecommendations = useCallback((songs, mood) => {
    if (!Array.isArray(songs) || songs.length === 0) return;

    // 1. Update recently recommended titles for deduplication
    setRecentlyRecommended((prev) => {
      const newItems = songs.map((s) => ({
        title: s.title,
        artist: s.artist,
        mood: s.mood || mood,
        timestamp: new Date().toISOString()
      }));

      const existingTitles = new Set(prev.map((p) => p.title.toLowerCase()));
      const filteredNew = newItems.filter((n) => !existingTitles.has(n.title.toLowerCase()));

      return [...filteredNew, ...prev].slice(0, 50);
    });

    // 2. Add batch to recommendation history
    setRecommendationHistory((prev) => {
      const historyEntry = {
        id: `rec-history-${Date.now()}`,
        mood,
        timestamp: new Date().toISOString(),
        songs: songs.slice(0, 6).map((s) => ({
          title: s.title,
          artist: s.artist,
          album: s.album,
          spotifyUrl: s.spotifyUrl,
          youtubeUrl: s.youtubeUrl
        }))
      };

      return [historyEntry, ...prev].slice(0, 15);
    });
  }, []);

  /**
   * Get list of titles to exclude for recommendations
   */
  const getExcludedTitles = useCallback(() => {
    return recentlyRecommended.map((r) => r.title);
  }, [recentlyRecommended]);

  /**
   * Clear all personal history
   */
  const clearPersonalizationHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ANALYZED);
    localStorage.removeItem(STORAGE_KEYS.RECOMMENDED);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    setRecentlyAnalyzed([]);
    setRecentlyRecommended([]);
    setRecommendationHistory([]);
  }, []);

  return (
    <PersonalizationContext.Provider
      value={{
        recentlyAnalyzed,
        recentlyRecommended,
        recommendationHistory,
        addAnalyzedSong,
        trackRecommendations,
        getExcludedTitles,
        clearPersonalizationHistory
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error("usePersonalization must be used within a PersonalizationProvider");
  }
  return context;
}

