import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Music2,
  RefreshCw,
  ExternalLink,
  Bot,
  Play,
  ListPlus,
  Compass,
  Check,
  Disc3,
  Clock,
  Layers,
  Search,
  Filter,
  Flame,
  Volume2,
  Heart,
  Share2,
  Sliders,
  AlertTriangle,
  ArrowRight,
  BookmarkPlus
} from "lucide-react";
import { api } from "../services/api";
import { usePersonalization } from "../context/PersonalizationContext";
import { useTheme } from "../context/ThemeContext";
import { getEmotionBadgeStyle } from "../utils/emotionTheme";

function YoutubeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// 10 Advanced Emotion Classes
const ADVANCED_MOODS = [
  { name: "Happiness", emoji: "☀️", color: "#f59e0b", desc: "Joyful, buoyant & optimistic" },
  { name: "Sadness", emoji: "🌧️", color: "#3b82f6", desc: "Melancholic, slow & vulnerable" },
  { name: "Love", emoji: "💖", color: "#ec4899", desc: "Tender, passionate & devoted" },
  { name: "Anger", emoji: "🔥", color: "#ef4444", desc: "Cathartic, distorted & defiant" },
  { name: "Nostalgia", emoji: "⏳", color: "#8b5cf6", desc: "Bittersweet, retrospective & warm" },
  { name: "Fear", emoji: "👻", color: "#6366f1", desc: "Dark suspense, eerie & chilling" },
  { name: "Excitement", emoji: "⚡", color: "#f97316", desc: "High-octane, fast BPM & anthemic" },
  { name: "Hope", emoji: "🌅", color: "#06b6d4", desc: "Uplifting, resilient & inspiring" },
  { name: "Loneliness", emoji: "🥀", color: "#64748b", desc: "Quiet midnight solitude & ache" },
  { name: "Calmness", emoji: "🌿", color: "#10b981", desc: "Serene, meditative & tranquil" }
];

export default function RecommendationsPage() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { trackRecommendations, getExcludedTitles } = usePersonalization();

  // Mood selection state
  const initialMood = location.state?.mood || "Happiness";
  const [selectedMood, setSelectedMood] = useState(initialMood);
  const [secondaryMood, setSecondaryMood] = useState("");
  const [seedTitle, setSeedTitle] = useState(location.state?.seedSong?.title || "");
  const [seedArtist, setSeedArtist] = useState(location.state?.seedSong?.artist || "");
  const [searchQuery, setSearchQuery] = useState("");

  // Recommendations data
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AI match explanations (keyed by track id)
  const [aiExplanations, setAiExplanations] = useState({});
  const [explainingId, setExplainingId] = useState(null);

  // Similar songs discovery
  const [similarSongs, setSimilarSongs] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  // Smart playlist drawer
  const [playlistDrawerOpen, setPlaylistDrawerOpen] = useState(false);
  const [playlistLength, setPlaylistLength] = useState(10);
  const [playlistEmotions, setPlaylistEmotions] = useState([initialMood]);
  const [generatedPlaylist, setGeneratedPlaylist] = useState(null);
  const [generatingPlaylist, setGeneratingPlaylist] = useState(false);
  const [playlistSaved, setPlaylistSaved] = useState(false);

  // Active mood metadata
  const activeMoodMeta = useMemo(() => {
    return ADVANCED_MOODS.find((m) => m.name.toLowerCase() === selectedMood.toLowerCase()) || ADVANCED_MOODS[0];
  }, [selectedMood]);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async (isExploringMore = false) => {
    setLoading(true);
    setError("");

    try {
      const excludeList = isExploringMore
        ? [...recommendations.map((r) => r.title), ...getExcludedTitles()]
        : getExcludedTitles();

      const secondaryList = secondaryMood ? [{ emotion: secondaryMood, percentage: 30 }] : [];

      const res = await api.getRecommendations({
        mood: selectedMood,
        seedTitle: seedTitle.trim(),
        seedArtist: seedArtist.trim(),
        secondaryEmotions: secondaryList,
        exclude: excludeList,
        limit: 8
      });

      if (res && res.success && Array.isArray(res.recommendations)) {
        setRecommendations(res.recommendations);
        trackRecommendations(res.recommendations, selectedMood);
      } else {
        setRecommendations([]);
        setError("No recommendation matches found for this filter combination.");
      }
    } catch (err) {
      console.error("Recommendations fetch error:", err);
      setError(err.message || "Unable to retrieve recommendations.");
    } finally {
      setLoading(false);
    }
  }, [selectedMood, secondaryMood, seedTitle, seedArtist, recommendations, getExcludedTitles, trackRecommendations]);

  // Trigger recommendations fetch when mood or secondary changes
  useEffect(() => {
    fetchRecommendations(false);
  }, [selectedMood, secondaryMood]);

  // Discover similar songs if seed song is present
  useEffect(() => {
    if (!seedTitle.trim()) {
      setSimilarSongs([]);
      return;
    }

    let isMounted = true;
    const fetchSimilar = async () => {
      setSimilarLoading(true);
      try {
        const res = await api.getSimilarSongs({
          seedTitle: seedTitle.trim(),
          seedArtist: seedArtist.trim(),
          mood: selectedMood,
          limit: 4
        });
        if (isMounted && res && res.success) {
          setSimilarSongs(res.similarSongs || []);
        }
      } catch (e) {
        console.warn("Similar songs fetch warning:", e.message);
      } finally {
        if (isMounted) setSimilarLoading(false);
      }
    };

    fetchSimilar();
    return () => {
      isMounted = false;
    };
  }, [seedTitle, seedArtist, selectedMood]);

  // AI Explanation handler using Ollama
  const handleExplainTrack = async (track) => {
    if (aiExplanations[track.id]) return;
    setExplainingId(track.id);

    try {
      const res = await api.explainRecommendation({
        songTitle: track.title,
        artist: track.artist,
        mood: selectedMood,
        seedTitle,
        lyricalThemes: track.traits || []
      });

      if (res && res.success) {
        setAiExplanations((prev) => ({
          ...prev,
          [track.id]: {
            explanation: res.explanation,
            model: res.model
          }
        }));
      }
    } catch (e) {
      console.error("AI explanation error:", e);
    } finally {
      setExplainingId(null);
    }
  };

  // Generate Smart Playlist
  const handleGeneratePlaylist = async () => {
    setGeneratingPlaylist(true);
    setPlaylistSaved(false);

    try {
      const res = await api.generatePlaylist({
        emotions: playlistEmotions.length > 0 ? playlistEmotions : [selectedMood],
        count: playlistLength,
        autoSave: false
      });

      if (res && res.success && res.playlist) {
        setGeneratedPlaylist(res.playlist);
      }
    } catch (err) {
      alert("Failed to generate playlist: " + err.message);
    } finally {
      setGeneratingPlaylist(false);
    }
  };

  // Save Generated Playlist
  const handleSavePlaylist = async () => {
    if (!generatedPlaylist) return;
    try {
      const res = await api.createPlaylist(generatedPlaylist);
      if (res && res.success) {
        setPlaylistSaved(true);
        setTimeout(() => setPlaylistSaved(false), 3000);
      }
    } catch (e) {
      // Guest local storage fallback
      const localPlaylists = JSON.parse(localStorage.getItem("emolyrics_guest_playlists") || "[]");
      localPlaylists.unshift({
        _id: "guest-pl-" + Date.now(),
        ...generatedPlaylist,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("emolyrics_guest_playlists", JSON.stringify(localPlaylists));
      setPlaylistSaved(true);
      setTimeout(() => setPlaylistSaved(false), 3000);
    }
  };

  // Quick Action to analyze lyrics on AnalyzerPage
  const handleAnalyzeSong = (track) => {
    navigate("/", {
      state: {
        reanalyzeSong: {
          title: track.title,
          artist: track.artist,
          lyrics: ""
        }
      }
    });
  };

  // Filter recommendations by client-side search query
  const filteredRecommendations = useMemo(() => {
    if (!searchQuery.trim()) return recommendations;
    const q = searchQuery.toLowerCase();
    return recommendations.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.artist?.toLowerCase().includes(q) ||
        r.album?.toLowerCase().includes(q) ||
        r.traits?.some((t) => t.toLowerCase().includes(q))
    );
  }, [recommendations, searchQuery]);

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* 1. HERO HEADER BANNER */}
      <div className="relative rounded-3xl p-6 sm:p-10 overflow-hidden theme-card shadow-2xl">
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 light:opacity-15 pointer-events-none transition-colors duration-500"
          style={{ backgroundColor: activeMoodMeta.color }}
        />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-purple-500/20 light:bg-purple-50 text-purple-300 light:text-purple-700 border border-purple-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
              <span>Phase 3 Engine</span>
            </span>
            <span className="text-xs font-mono px-3 py-1 rounded-full theme-well text-ink-secondary">
              10-Emotion Spectrum
            </span>
            {seedTitle && (
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-sky-500/20 light:bg-sky-50 text-sky-300 light:text-sky-700 border border-sky-500/30">
                Seeded: {seedTitle}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-black text-ink-main tracking-tight">
            Personalized Music Recommendations
          </h1>
          <p className="text-sm sm:text-base text-ink-secondary leading-relaxed font-sans">
            Discover emotionally aligned songs matched through natural language lyrical analysis,
            sentiment valence, arousal densities, and intelligent Ollama AI explanations.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setPlaylistEmotions([selectedMood]);
                setPlaylistDrawerOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:opacity-95 transition-all"
            >
              <ListPlus className="w-4 h-4" />
              <span>Create Mood Playlist</span>
            </button>

            <Link
              to="/"
              className="px-4 py-2.5 rounded-2xl theme-well hover:border-purple-500/40 text-ink-main font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
            >
              <Compass className="w-4 h-4 text-purple-400 light:text-purple-600" />
              <span>Analyze New Lyrics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MOOD SELECTOR CONTROLS (ALL 10 EMOTIONS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-400 light:text-purple-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-secondary">
              Select Dominant Emotional Frequency
            </h2>
          </div>
          <span className="text-xs text-ink-muted font-mono hidden sm:inline">
            Active: {selectedMood} {activeMoodMeta.emoji}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {ADVANCED_MOODS.map((mood) => {
            const isSelected = selectedMood.toLowerCase() === mood.name.toLowerCase();
            return (
              <button
                key={mood.name}
                type="button"
                onClick={() => setSelectedMood(mood.name)}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border ${
                  isSelected
                    ? "bg-white/15 light:bg-purple-600/10 border-purple-500 shadow-lg scale-105"
                    : "theme-card hover:border-purple-500/30"
                }`}
              >
                <span className="text-2xl select-none">{mood.emoji}</span>
                <span className={`text-xs font-bold leading-none ${isSelected ? "text-ink-main light:text-purple-800" : "text-ink-muted"}`}>
                  {mood.name}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{ backgroundColor: isSelected ? mood.color : "transparent" }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BLENDED CONTROLS & SEARCH BAR */}
      <div className="p-4 rounded-3xl theme-card shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Secondary Emotion Blend Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
            <span>Blend Secondary Mood:</span>
          </span>

          <select
            value={secondaryMood}
            onChange={(e) => setSecondaryMood(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs text-ink-main font-medium cursor-pointer"
          >
            <option value="">None (Pure {selectedMood})</option>
            {ADVANCED_MOODS.filter((m) => m.name.toLowerCase() !== selectedMood.toLowerCase()).map((m) => (
              <option key={m.name} value={m.name}>
                {m.emoji} {m.name}
              </option>
            ))}
          </select>

          {secondaryMood && (
            <button
              type="button"
              onClick={() => setSecondaryMood("")}
              className="text-xs text-amber-400 hover:text-amber-300 light:text-amber-700 light:hover:text-amber-800 font-semibold transition-colors"
            >
              Reset Blend
            </button>
          )}
        </div>

        {/* Right: Search Filter & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, artist, trait..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400 font-sans"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl theme-well hover:border-purple-500/40 text-ink-main text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
            title="Explore more recommendations without duplicates"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 light:text-purple-600 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>
      </div>

      {/* 4. FEATURE 2: SIMILAR SONG DISCOVERY (IF SEED PRESENT) */}
      {seedTitle && (
        <div className="p-6 rounded-3xl theme-card border-sky-500/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 light:border-slate-200">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400 light:text-sky-600" />
              <h3 className="font-display font-bold text-base text-ink-main">
                Similar Song Discovery
              </h3>
              <span className="text-xs text-sky-300 light:text-sky-700 font-mono">
                Matching "{seedTitle}"
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSeedTitle("");
                setSeedArtist("");
              }}
              className="text-xs text-ink-muted hover:text-ink-main transition-colors"
            >
              Clear Seed
            </button>
          </div>

          {similarLoading ? (
            <div className="py-6 text-center text-xs text-ink-muted animate-pulse">
              Finding emotionally similar song profiles...
            </div>
          ) : similarSongs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {similarSongs.map((song, idx) => (
                <div
                  key={song.id || idx}
                  className="p-3 rounded-2xl theme-well space-y-2 hover:border-sky-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/60 light:bg-slate-200 shrink-0 border border-white/10 light:border-slate-200 flex items-center justify-center">
                      {song.coverArtUrl ? (
                        <img
                          src={song.coverArtUrl}
                          alt={song.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <Music2 className="w-5 h-5 text-ink-dim" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-ink-main truncate">{song.title}</div>
                      <div className="text-[11px] text-ink-muted truncate">{song.artist}</div>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-secondary leading-relaxed font-sans line-clamp-2">
                    {song.similarityReason}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-ink-muted">
              No directly similar tracks found. Explore the general recommendation grid below!
            </div>
          )}
        </div>
      )}

      {/* 5. FEATURE 1 & 5: RECOMMENDED SONGS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Disc3 className="w-4 h-4 text-purple-400 light:text-purple-600 animate-spin-slow" />
            <h3 className="font-display font-bold text-lg text-ink-main">
              Curated {selectedMood} Tracklist
              {secondaryMood && ` (with ${secondaryMood} cues)`}
            </h3>
          </div>
          <span className="text-xs text-ink-muted font-mono">
            {filteredRecommendations.length} verified songs
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-3xl theme-card p-5 flex flex-col justify-between animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 light:bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-white/10 light:bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-white/10 light:bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 light:bg-slate-100 rounded" />
                  <div className="h-3 bg-white/5 light:bg-slate-100 rounded w-5/6" />
                </div>
                <div className="h-8 bg-white/5 light:bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-3xl bg-red-500/10 light:bg-red-50 border border-red-500/30 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-400 light:text-red-600 mx-auto" />
            <h4 className="font-bold text-red-200 light:text-red-800">Recommendation Engine Notice</h4>
            <p className="text-xs text-ink-muted max-w-md mx-auto">{error}</p>
            <button
              onClick={() => fetchRecommendations(false)}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="py-16 text-center rounded-3xl theme-card space-y-3">
            <Music2 className="w-10 h-10 text-ink-dim mx-auto" />
            <h4 className="font-bold text-ink-secondary">No Tracks Matched Query</h4>
            <p className="text-xs text-ink-dim">
              Try adjusting your search query or switching to another emotional vibe.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredRecommendations.map((track, idx) => {
              const aiExp = aiExplanations[track.id];
              const isExplaining = explainingId === track.id;

              return (
                <motion.div
                  key={track.id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="rounded-3xl p-5 theme-card hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Artwork + Badges */}
                    <div className="relative rounded-2xl overflow-hidden aspect-square bg-black/60 light:bg-slate-200 border border-white/10 light:border-slate-200 flex items-center justify-center group-hover:shadow-md transition-shadow">
                      {track.coverArtUrl ? (
                        <img
                          src={track.coverArtUrl}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-ink-dim gap-1">
                          <Disc3 className="w-12 h-12 text-purple-400/50" />
                          <span className="text-[10px] font-mono">EmoLyrics Audio</span>
                        </div>
                      )}

                      {/* Top Badges overlay */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-amber-300 border border-white/10">
                          {track.similarityScore || 90}% Match
                        </span>
                      </div>

                      <div className="absolute bottom-2.5 right-2.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-neutral-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{track.duration || "3:30"}</span>
                        </span>
                      </div>
                    </div>

                    {/* Title & Artist */}
                    <div>
                      <h4 className="font-display font-bold text-base text-ink-main truncate group-hover:text-purple-300 light:group-hover:text-purple-700 transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-xs text-ink-muted truncate">{track.artist}</p>
                      {track.album && (
                        <p className="text-[11px] text-ink-dim truncate mt-0.5">{track.album}</p>
                      )}
                    </div>

                    {/* Traits Cues */}
                    {track.traits?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {track.traits.slice(0, 2).map((t, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-2 py-0.5 rounded-md theme-well text-ink-secondary"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Match Reason Text */}
                    <p className="text-xs text-ink-secondary leading-relaxed font-sans line-clamp-3 theme-well p-2.5 rounded-xl">
                      {track.reason}
                    </p>

                    {/* FEATURE 4: AI EXPLANATION DRAWER */}
                    {aiExp ? (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 light:bg-purple-50 border border-purple-500/30 text-[11px] text-purple-200 light:text-purple-900 leading-relaxed space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-purple-300 light:text-purple-700">
                          <span className="flex items-center gap-1">
                            <Bot className="w-3 h-3 text-purple-400 light:text-purple-600" />
                            <span>AI Explanation</span>
                          </span>
                          <span>{aiExp.model}</span>
                        </div>
                        <p className="font-sans text-[11px]">{aiExp.explanation}</p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleExplainTrack(track)}
                        disabled={isExplaining}
                        className="w-full py-1.5 px-2.5 rounded-xl theme-well hover:border-purple-500/40 text-[11px] text-purple-300 light:text-purple-700 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {isExplaining ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <span>Consulting Ollama AI...</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-purple-400 light:text-purple-600" />
                            <span>Why does this match? (AI)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* External Links & Actions */}
                  <div className="pt-3 mt-3 border-t border-white/10 light:border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={track.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 light:bg-emerald-50 light:hover:bg-emerald-100 text-emerald-400 light:text-emerald-700 transition-colors"
                        title="Listen on Spotify"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={track.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 light:bg-red-50 light:hover:bg-red-100 text-red-400 light:text-red-700 transition-colors"
                        title="Listen on YouTube Audio"
                      >
                        <YoutubeIcon className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeSong(track)}
                      className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 light:text-purple-700 light:hover:text-purple-800 flex items-center gap-1 transition-colors"
                    >
                      <span>Analyze</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. FEATURE 3: SMART PLAYLIST GENERATION SECTION */}
      {playlistDrawerOpen && (
        <div className="p-6 sm:p-8 rounded-3xl theme-modal border-purple-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 light:bg-purple-50 border border-purple-500/40 flex items-center justify-center text-purple-400 light:text-purple-600">
                <ListPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-ink-main">
                  Smart Mood Playlist Generator
                </h3>
                <p className="text-xs text-ink-muted">
                  Compose single or mixed-emotion playlists with customized track lengths
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPlaylistDrawerOpen(false)}
              className="text-xs text-ink-muted hover:text-ink-main px-3 py-1.5 rounded-xl theme-well"
            >
              Close
            </button>
          </div>

          {/* Controls: Target Emotions Multi-Select + Length */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                Select Target Emotions (Mixed Emotion Supported)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ADVANCED_MOODS.map((m) => {
                  const isChecked = playlistEmotions.includes(m.name);
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          if (playlistEmotions.length > 1) {
                            setPlaylistEmotions(playlistEmotions.filter((e) => e !== m.name));
                          }
                        } else {
                          setPlaylistEmotions([...playlistEmotions, m.name]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isChecked
                          ? "bg-purple-600 text-white shadow-sm"
                          : "theme-well text-ink-muted hover:text-ink-main"
                      }`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.name}</span>
                      {isChecked && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">
                Playlist Track Count
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlaylistLength(count)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                      playlistLength === count
                        ? "bg-purple-600 text-white"
                        : "theme-well text-ink-muted hover:text-ink-main"
                    }`}
                  >
                    {count} Tracks
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-dim">
                Equally balances track quotas across {playlistEmotions.length} selected mood(s).
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleGeneratePlaylist}
              disabled={generatingPlaylist}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg disabled:opacity-40"
            >
              {generatingPlaylist ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Playlist...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Playlist</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Playlist Preview Table */}
          {generatedPlaylist && (
            <div className="pt-4 border-t border-white/10 light:border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl theme-well">
                <div>
                  <h4 className="font-display font-bold text-lg text-ink-main">
                    {generatedPlaylist.title}
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {generatedPlaylist.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSavePlaylist}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      playlistSaved
                        ? "bg-emerald-600 text-white"
                        : "theme-card hover:border-purple-500/40 text-ink-main"
                    }`}
                  >
                    {playlistSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Saved to Library</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
                        <span>Save Playlist</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                {generatedPlaylist.songs?.map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl theme-well text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-ink-dim w-5">{i + 1}</span>
                      <div>
                        <div className="font-semibold text-ink-main">{song.title}</div>
                        <div className="text-[11px] text-ink-muted">{song.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                        style={getEmotionBadgeStyle(song.mood, isDark)}
                      >
                        {song.mood}
                      </span>
                      <span className="text-ink-muted font-mono text-[11px]">
                        {song.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

