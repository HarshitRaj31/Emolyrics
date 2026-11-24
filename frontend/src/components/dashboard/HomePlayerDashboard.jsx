import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Sparkles,
  ExternalLink,
  Music2,
  ListMusic,
  FolderPlus,
  Compass,
  User,
  Heart
} from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { usePersonalization } from "../../context/PersonalizationContext";
import { api } from "../../services/api";
import { getEmotionBadgeStyle } from "../../utils/emotionTheme";

const MOOD_CHIPS = [
  { label: "All", mood: "All" },
  { label: "Happy", mood: "Happy" },
  { label: "Sad", mood: "Sad" },
  { label: "Calm/Chill", mood: "Calm/Chill" },
  { label: "Romantic", mood: "Romantic" },
  { label: "Exciting", mood: "Exciting" },
  { label: "Angry", mood: "Angry" }
];

function SpotifyIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.307a.75.75 0 0 1-1.03.248c-2.82-1.723-6.37-2.113-10.55-1.158a.751.751 0 1 1-.336-1.464c4.572-1.044 8.508-.598 11.668 1.344.348.214.46.66.248 1.03zm1.468-3.266a.938.938 0 0 1-1.29.31c-3.226-1.984-8.145-2.557-11.96-1.398a.938.938 0 1 1-.546-1.794c4.364-1.325 9.787-.68 13.486 1.593.414.254.544.79.31 1.289zm.126-3.41c-3.868-2.297-10.25-2.508-13.935-1.39a1.125 1.125 0 0 1-.65-2.155c4.238-1.286 11.287-1.037 15.727 1.597a1.125 1.125 0 0 1-1.142 1.948z" />
    </svg>
  );
}

export default function HomePlayerDashboard({
  onSelectTrackForAnalysis,
  onSearchSubmit,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab
}) {
  const navigate = useNavigate();
  const { selectTrack, currentTrack } = usePlayer();
  const { user, isAuthenticated } = useAuth();
  const { recentlyAnalyzed } = usePersonalization();

  const [selectedChip, setSelectedChip] = useState("All");
  const [tracks, setTracks] = useState([]);
  const [featuredPlaylist, setFeaturedPlaylist] = useState(null);
  const [featuredAnalysis, setFeaturedAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [likedMap, setLikedMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch real analyses from database
        const analysesRes = await api.getAnalyses({ limit: 12 });
        let serverAnalyses = [];
        if (analysesRes && analysesRes.items && Array.isArray(analysesRes.items)) {
          serverAnalyses = analysesRes.items;
        }

        // Combine with recent local analyses
        const combined = [...(recentlyAnalyzed || []), ...serverAnalyses];
        const seen = new Set();
        const uniqueTracks = [];
        for (const item of combined) {
          const key = `${(item.title || "").toLowerCase()}::${(item.artist || "").toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueTracks.push({
              id: item._id || item.id,
              title: item.title,
              artist: item.artist,
              mood: item.mood,
              confidence: item.confidence,
              lyrics: item.lyrics,
              coverUrl: item.coverArtUrl || item.coverArt || null,
              spotifyUrl: item.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent((item.title || "") + " " + (item.artist || ""))}`,
              youtubeUrl: item.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent((item.title || "") + " " + (item.artist || "") + " audio")}`
            });
          }
        }

        if (isMounted) {
          setTracks(uniqueTracks);
          if (uniqueTracks.length > 0) {
            setFeaturedAnalysis(uniqueTracks[0]);
          }
        }

        // 2. Fetch real playlists for featured card
        const playlistsRes = await api.getPlaylists();
        if (isMounted) {
          let list = [];
          if (playlistsRes && playlistsRes.playlists && Array.isArray(playlistsRes.playlists)) {
            list = playlistsRes.playlists;
          } else if (Array.isArray(playlistsRes)) {
            list = playlistsRes;
          }
          if (list.length > 0) {
            setFeaturedPlaylist(list[0]);
          }
        }
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [recentlyAnalyzed]);

  const toggleSongLike = (id, e) => {
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChipClick = (chip) => {
    setSelectedChip(chip.mood);
  };

  // Filter tracks by mood chip
  const filteredTracks = tracks.filter((t) => {
    if (selectedChip === "All") return true;
    return (t.mood || "").toLowerCase() === selectedChip.toLowerCase();
  });

  const tabs = ["Recent Analyses", "Discover Songs", "Lyrics Studio"];

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === "Discover Songs") {
      navigate("/explore");
    } else if (tab === "Lyrics Studio") {
      const workbench = document.getElementById("analyzer-workbench");
      if (workbench) workbench.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP BAR: Search pill, User status */}
      <div className="flex items-center justify-between gap-4">
        {/* Search Input Pill */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (onSearchSubmit) onSearchSubmit(searchQuery);
          }}
          className="relative flex-1 max-w-xl"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search catalog by song title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            className="w-full bg-[#202128]/80 hover:bg-[#252630]/90 focus:bg-[#252630] border border-white/[0.08] focus:border-white/20 rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder-zinc-400 focus:outline-none transition-all shadow-inner"
          />
        </form>

        {/* Real User Status (Guest or Authenticated User) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-white">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-[10px]">
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              <span className="font-medium truncate max-w-[100px]">{user.name || user.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-zinc-300">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-semibold text-[11px]">Guest Explorer</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MOOD FILTER CHIPS ROW */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {MOOD_CHIPS.map((chip) => {
          const isSelected = selectedChip === chip.mood;
          return (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? "bg-white/20 text-white border border-white/30 shadow-sm"
                  : "bg-white/[0.05] hover:bg-white/[0.09] text-zinc-300 hover:text-white border border-white/[0.06]"
              }`}
            >
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. HERO FEATURED SECTION (Real Playlist + Real Latest Analysis) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Hero Card: Featured Real Mood Playlist */}
        <div className="md:col-span-5 relative rounded-[24px] p-5 bg-gradient-to-br from-[#241a28]/95 via-[#1c1822]/90 to-[#14151c]/95 border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-between group">
          <div>
            <span className="text-[10px] font-mono font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              {featuredPlaylist?.songs ? `${featuredPlaylist.songs.length} songs • Curated` : "Curated Playlist"}
            </span>
            <h3 className="font-display font-extrabold text-xl text-white tracking-tight">
              {featuredPlaylist?.name || (featuredPlaylist?.mood ? `${featuredPlaylist.mood} Playlist` : "Emotion Soundscapes")}
            </h3>
          </div>

          <div className="my-3 flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-transform">
              <ListMusic className="w-10 h-10 text-orange-400 opacity-90" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="font-medium">{featuredPlaylist?.mood || "Emotional"}</span>
            <button
              onClick={() => navigate("/playlists")}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <Compass className="w-3 h-3" />
              <span>View Playlists</span>
            </button>
          </div>
        </div>

        {/* Right Hero Card: Latest Real Analysis */}
        <div className="md:col-span-7 relative rounded-[24px] p-5 bg-[#1a1b22]/90 border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-between group">
          {featuredAnalysis ? (
            <>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <span className="text-[10px] font-mono font-medium text-zinc-400 block mb-0.5">
                    Latest Analysis • {featuredAnalysis.artist}
                  </span>
                  <h2 className="font-display font-extrabold text-2xl text-white tracking-tight truncate max-w-sm">
                    {featuredAnalysis.title}
                  </h2>
                </div>
                {featuredAnalysis.mood && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15">
                    {featuredAnalysis.mood}
                    {featuredAnalysis.confidence ? ` • ${Math.round(featuredAnalysis.confidence)}%` : ""}
                  </span>
                )}
              </div>

              {/* Lyrics snippet excerpt */}
              <div className="my-3 p-3.5 rounded-2xl bg-black/30 border border-white/5 text-xs text-zinc-300 italic line-clamp-3">
                "{featuredAnalysis.lyrics ? featuredAnalysis.lyrics.slice(0, 180) + "..." : "No lyrics stored for this track."}"
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  {featuredAnalysis.spotifyUrl && (
                    <a
                      href={featuredAnalysis.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      <SpotifyIcon className="w-3.5 h-3.5 fill-current" />
                      <span>Spotify</span>
                    </a>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (onSelectTrackForAnalysis) {
                      onSelectTrackForAnalysis(featuredAnalysis);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze in Studio</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6 px-4">
              <Sparkles className="w-8 h-8 text-orange-400 mb-2 opacity-80" />
              <h3 className="text-base font-bold text-white mb-1">Emotion Classification Lab</h3>
              <p className="text-xs text-zinc-400 max-w-md mb-4">
                Paste any song lyrics below or search the global music catalog to classify emotions with machine learning.
              </p>
              <button
                onClick={() => {
                  const workbench = document.getElementById("analyzer-workbench");
                  if (workbench) workbench.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                Open Lyrics Studio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. TABS ROW */}
      <div className="flex items-center gap-6 border-b border-white/[0.08] pb-2 text-xs font-semibold">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`transition-colors relative pb-2 ${
                isSelected ? "text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>{tab}</span>
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 5. TRACK LIST TABLE (Real Analyzed Songs from Database) */}
      <div className="space-y-1.5">
        {filteredTracks.length > 0 ? (
          filteredTracks.map((track, idx) => {
            const isCurrent = currentTrack?.title === track.title;
            const isLiked = likedMap[track.id] ?? false;
            const moodStyle = track.mood ? getEmotionBadgeStyle(track.mood) : null;

            return (
              <div
                key={track.id}
                onClick={() => selectTrack(track, filteredTracks)}
                className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all group ${
                  isCurrent
                    ? "bg-white/[0.09] border border-white/10"
                    : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                {/* Left Column: Index + Artwork + Title */}
                <div className="flex items-center gap-4 min-w-0 w-2/5">
                  <span className="w-4 text-xs font-mono text-zinc-400 text-center">
                    {idx + 1}
                  </span>

                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm border border-white/5 flex items-center justify-center bg-white/5">
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Music2 className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold truncate ${
                      isCurrent ? "text-orange-400" : "text-white group-hover:text-zinc-200"
                    }`}
                  >
                    {track.title}
                  </span>
                </div>

                {/* Center Column: Artist Name */}
                <div className="w-1/4 text-xs text-zinc-400 truncate">
                  {track.artist}
                </div>

                {/* Right Column: Mood badge + Heart + Actions */}
                <div className="flex items-center justify-end gap-4 text-xs text-zinc-400 font-mono">
                  {track.mood && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={{
                        backgroundColor: moodStyle?.background || "rgba(255,255,255,0.08)",
                        color: moodStyle?.color || "#ffffff",
                        borderColor: moodStyle?.border || "rgba(255,255,255,0.2)"
                      }}
                    >
                      {track.mood}
                    </span>
                  )}

                  {/* Heart Button */}
                  <button
                    onClick={(e) => toggleSongLike(track.id, e)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
                    title="Favorite track"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isLiked ? "text-rose-500 fill-rose-500" : "text-zinc-400 hover:text-white"
                      }`}
                    />
                  </button>

                  {/* Analyze Lyrics button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectTrackForAnalysis) {
                        onSelectTrackForAnalysis(track);
                      }
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-400 hover:bg-white/5 transition-colors"
                    title="Analyze Lyrics in Studio"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  {/* External Spotify Audio Link */}
                  {track.spotifyUrl && (
                    <a
                      href={track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-white/5 transition-colors"
                      title="Open on Spotify"
                    >
                      <SpotifyIcon className="w-3.5 h-3.5 fill-current" />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <Music2 className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
            <h4 className="text-sm font-semibold text-zinc-300">No Tracks Found</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Analyze lyrics using the studio below or search the global music catalog to populate your dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
