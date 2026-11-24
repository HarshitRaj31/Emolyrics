import { createContext, useContext, useState, useEffect, useCallback } from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(() => {
    try {
      const saved = localStorage.getItem("emolyrics_active_track");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Persist selected track
  useEffect(() => {
    try {
      if (currentTrack) {
        localStorage.setItem("emolyrics_active_track", JSON.stringify(currentTrack));
      }
    } catch (e) {
      // ignore
    }
  }, [currentTrack]);

  const selectTrack = useCallback((track, newQueue = null) => {
    if (!track) return;
    const formatted = {
      id: track.id || track._id || `track-${Date.now()}`,
      title: track.title || "Unknown Track",
      artist: track.artist || "Unknown Artist",
      album: track.album || "",
      coverArt:
        track.coverArt ||
        track.coverArtUrl ||
        track.coverUrl ||
        null,
      mood: track.mood || null,
      confidence: track.confidence || null,
      emoji: track.emoji || "🎵",
      lyrics: track.lyrics || "",
      spotifyUrl:
        track.spotifyUrl ||
        `https://open.spotify.com/search/${encodeURIComponent((track.title || "") + " " + (track.artist || ""))}`,
      youtubeUrl:
        track.youtubeUrl ||
        `https://www.youtube.com/results?search_query=${encodeURIComponent((track.title || "") + " " + (track.artist || "") + " audio")}`
    };

    setCurrentTrack(formatted);

    if (newQueue && Array.isArray(newQueue) && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(
        (item) => (item.id || item._id) === formatted.id || (item.title === formatted.title && item.artist === formatted.artist)
      );
      setCurrentIndex(idx >= 0 ? idx : 0);
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (queue.length === 0 || currentIndex === -1) return;
    const nextIdx = (currentIndex + 1) % queue.length;
    setCurrentIndex(nextIdx);
    selectTrack(queue[nextIdx], queue);
  }, [queue, currentIndex, selectTrack]);

  const prevTrack = useCallback(() => {
    if (queue.length === 0 || currentIndex === -1) return;
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
    selectTrack(queue[prevIdx], queue);
  }, [queue, currentIndex, selectTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        currentIndex,
        selectTrack,
        playTrack: selectTrack, // backwards compatible alias
        nextTrack,
        prevTrack
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
