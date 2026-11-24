import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  Bot,
  Sparkles,
  ExternalLink,
  Music2,
  Clock
} from "lucide-react";
import { usePersonalization } from "../../context/PersonalizationContext";
import { usePlayer } from "../../context/PlayerContext";
import { api } from "../../services/api";
import { getEmotionBadgeStyle } from "../../utils/emotionTheme";

export default function RightSidebar() {
  const navigate = useNavigate();
  const { recentlyAnalyzed } = usePersonalization();
  const { selectTrack, currentTrack } = usePlayer();
  const [likedMap, setLikedMap] = useState({});
  const [serverRecent, setServerRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRecentAnalyses() {
      try {
        const res = await api.getAnalyses({ limit: 7 });
        if (isMounted && res && res.items) {
          setServerRecent(res.items);
        }
      } catch (e) {
        // ignore network error
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRecentAnalyses();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleLike = (id, e) => {
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Combine real user analyzed songs with server database analyses (strictly no fake data)
  const combined = [
    ...(recentlyAnalyzed || []),
    ...serverRecent
  ];

  // Deduplicate by title & artist
  const seen = new Set();
  const displayedSongs = [];
  for (const item of combined) {
    const key = `${(item.title || "").toLowerCase()}::${(item.artist || "").toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      displayedSongs.push({
        id: item._id || item.id,
        title: item.title,
        artist: item.artist,
        mood: item.mood,
        confidence: item.confidence,
        lyrics: item.lyrics,
        coverUrl: item.coverArtUrl || item.coverArt || null,
        spotifyUrl: item.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(item.title + " " + item.artist)}`,
        youtubeUrl: item.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " " + item.artist + " audio")}`
      });
    }
    if (displayedSongs.length >= 7) break;
  }

  return (
    <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col gap-3.5 select-none">
      {/* Recent Played / Analyzed Card */}
      <div className="backdrop-blur-2xl bg-[#191a1f]/85 border border-white/[0.08] rounded-[24px] p-4 flex-1 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5 px-1">
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Analyzed</h3>
            <Link
              to="/analytics"
              className="text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors"
            >
              See All
            </Link>
          </div>

          {/* List of recent tracks */}
          {displayedSongs.length > 0 ? (
            <div className="space-y-1 overflow-y-auto max-h-[380px] pr-0.5 custom-scrollbar">
              {displayedSongs.map((song) => {
                const isLiked = likedMap[song.id] ?? false;
                const isCurrent = currentTrack?.title === song.title;
                const moodStyle = song.mood ? getEmotionBadgeStyle(song.mood) : null;

                return (
                  <div
                    key={song.id}
                    onClick={() => selectTrack(song, displayedSongs)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all group ${
                      isCurrent
                        ? "bg-white/[0.09] border border-white/10"
                        : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Cover Art Tile or Mood Icon */}
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm border border-white/5 flex items-center justify-center bg-white/5">
                        {song.coverUrl ? (
                          <img
                            src={song.coverUrl}
                            alt={song.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Music2 className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>

                      {/* Song Info */}
                      <div className="min-w-0">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isCurrent ? "text-orange-400 font-bold" : "text-zinc-200 group-hover:text-white"
                          }`}
                        >
                          {song.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                          <span className="truncate">{song.artist}</span>
                          {song.mood && (
                            <span
                              className="text-[9px] px-1 rounded-sm border"
                              style={{
                                color: moodStyle?.color || "#ffffff",
                                borderColor: moodStyle?.border || "rgba(255,255,255,0.2)"
                              }}
                            >
                              {song.mood}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Heart / Favorite Button */}
                    <button
                      onClick={(e) => toggleLike(song.id, e)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors flex-shrink-0"
                      title={isLiked ? "Favorited" : "Favorite"}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isLiked
                            ? "text-rose-500 fill-rose-500"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-2 text-zinc-400">
              <Music2 className="w-7 h-7 mx-auto mb-2 opacity-30 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-300">No Recent Analyses</p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                Songs you analyze or explore will appear here automatically.
              </p>
              <Link
                to="/explore"
                className="inline-block mt-3 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                Explore Music
              </Link>
            </div>
          )}
        </div>

        {/* Real Platform Feature Card: AI Music Assistant */}
        <div className="relative mt-3 rounded-[20px] p-4 bg-gradient-to-br from-[#241c30] via-[#1c1a29] to-[#161720] border border-purple-500/20 text-white shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 mb-1.5 font-bold text-xs tracking-tight text-purple-300">
            <Bot className="w-4 h-4 text-purple-400" />
            <span>AI Music Assistant</span>
          </div>

          <p className="text-[11px] text-zinc-300 leading-relaxed mb-3">
            Get personalized emotion insights, lyrical interpretations, and curated mood playlists.
          </p>

          <button
            onClick={() => navigate("/assistant")}
            className="w-full py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Chat with Assistant</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
