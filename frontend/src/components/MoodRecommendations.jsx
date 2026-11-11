import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Music2,
  Headphones,
  History,
  Clock,
  CheckCircle2,
  ChevronRight,
  Disc3,
  Layers,
  ArrowUpRight,
  Trash2,
  Compass
} from "lucide-react";

function YoutubeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
import { api } from "../services/api";
import { usePersonalization } from "../context/PersonalizationContext";
import { useTheme } from "../context/ThemeContext";
import { MOOD_DEFINITIONS } from "../data/examples";
import { getEmotionBadgeStyle, getEmotionToken } from "../utils/emotionTheme";

const CANONICAL_MOOD_MAP = {
  happy: "Happiness",
  happiness: "Happiness",
  sad: "Sadness",
  sadness: "Sadness",
  love: "Love",
  romantic: "Love",
  anger: "Anger",
  angry: "Anger",
  nostalgia: "Nostalgia",
  fear: "Fear",
  horror: "Fear",
  thrilling: "Fear",
  excitement: "Excitement",
  exciting: "Excitement",
  hope: "Hope",
  patriotic: "Hope",
  loneliness: "Loneliness",
  lonely: "Loneliness",
  calmness: "Calmness",
  calm: "Calmness",
  "calm/chill": "Calmness"
};

// All 10 Advanced Emotion Classes
const ALL_MOODS = [
  "Happiness",
  "Sadness",
  "Love",
  "Anger",
  "Nostalgia",
  "Fear",
  "Excitement",
  "Hope",
  "Loneliness",
  "Calmness"
];

const MOOD_META = {
  Happiness: { emoji: "☀️", color: "#f59e0b" },
  Sadness: { emoji: "🌧️", color: "#3b82f6" },
  Love: { emoji: "💖", color: "#ec4899" },
  Anger: { emoji: "🔥", color: "#ef4444" },
  Nostalgia: { emoji: "⏳", color: "#8b5cf6" },
  Fear: { emoji: "👻", color: "#6366f1" },
  Excitement: { emoji: "⚡", color: "#f97316" },
  Hope: { emoji: "🌅", color: "#06b6d4" },
  Loneliness: { emoji: "🥀", color: "#64748b" },
  Calmness: { emoji: "🌿", color: "#10b981" }
};

export default function MoodRecommendations({
  detectedMood = "Happiness",
  seedSong = null,
  secondaryEmotions = [],
  lyricalThemes = [],
  overallTone = "",
  onSelectSongForAnalysis = null
}) {
  const { isDark } = useTheme();
  const {
    recentlyAnalyzed,
    recentlyRecommended,
    recommendationHistory,
    trackRecommendations,
    getExcludedTitles,
    clearPersonalizationHistory
  } = usePersonalization();

  const resolveMood = (m) => {
    if (!m) return "Happiness";
    return CANONICAL_MOOD_MAP[m.toLowerCase()] || m;
  };

  const [activeMood, setActiveMood] = useState(resolveMood(detectedMood));
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Sync active mood whenever parent detectedMood changes
  useEffect(() => {
    if (detectedMood) {
      setActiveMood(resolveMood(detectedMood));
    }
  }, [detectedMood]);

  // Fetch recommendations for active mood & seed song
  const fetchRecommendations = useCallback(
    async (isExploringMore = false) => {
      setLoading(true);
      setError("");

      try {
        const excludeList = isExploringMore
          ? [...recommendations.map((r) => r.title), ...getExcludedTitles()]
          : getExcludedTitles();

        const res = await api.getRecommendations({
          mood: activeMood,
          seedTitle: seedSong?.title || "",
          seedArtist: seedSong?.artist || "",
          secondaryEmotions,
          lyricalThemes,
          overallTone,
          exclude: excludeList,
          limit: 6
        });

        if (res.success && Array.isArray(res.recommendations)) {
          setRecommendations(res.recommendations);
          trackRecommendations(res.recommendations, activeMood);
        } else {
          setRecommendations([]);
          setError("No recommendations available for this mood category.");
        }
      } catch (err) {
        console.error("Recommendations fetch error:", err);
        setError(err.message || "Unable to retrieve recommendations.");
      } finally {
        setLoading(false);
      }
    },
    [activeMood, seedSong, secondaryEmotions, lyricalThemes, overallTone, recommendations, getExcludedTitles, trackRecommendations]
  );

  // Initial load or when activeMood / seedSong changes
  useEffect(() => {
    fetchRecommendations(false);
  }, [activeMood, seedSong?.title]);

  const activeMoodInfo = MOOD_DEFINITIONS[activeMood] || MOOD_DEFINITIONS.Happy;
  const activeToken = getEmotionToken(activeMood);
  const activeMoodTextColor = isDark ? (activeMoodInfo?.color || activeToken.color) : activeToken.lightText;

  return (
    <section className="mt-14 relative space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10 light:border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-2xl select-none">{activeMoodInfo?.emoji || activeToken.emoji}</span>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-ink-main tracking-tight">
              Personalized {activeMood} Recommendations
            </h2>
            <span
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
              style={getEmotionBadgeStyle(activeMood, isDark)}
            >
              Emotion-Aligned
            </span>
          </div>

          <p className="text-xs sm:text-sm text-ink-muted max-w-2xl leading-relaxed">
            {seedSong?.title ? (
              <>
                Curated based on the lyrical emotional fingerprint of{" "}
                <span className="text-ink-main font-semibold">"{seedSong.title}"</span>
                {seedSong.artist ? ` by ${seedSong.artist}` : ""} to match its{" "}
                <span className="font-semibold" style={{ color: activeMoodTextColor }}>
                  {activeMood}
                </span>{" "}
                mood profile.
              </>
            ) : (
              <>
                Discover hand-picked tracks matching the{" "}
                <span className="font-semibold" style={{ color: activeMoodTextColor }}>
                  {activeMood}
                </span>{" "}
                emotional spectrum with Spotify and YouTube listening links.
              </>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Dedicated Recommendations Studio Link */}
          <Link
            to="/recommendations"
            state={{ mood: activeMood, seedSong }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/45 light:bg-purple-50 light:hover:bg-purple-100 text-purple-200 light:text-purple-700 border border-purple-500/30 text-xs font-semibold transition-all"
            title="Open Dedicated Music Recommendation Studio"
          >
            <Compass className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
            <span className="hidden sm:inline">Discovery Studio</span>
          </Link>

          {/* Explore More Button */}
          <button
            type="button"
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 light:bg-white light:hover:bg-slate-100 border border-white/10 light:border-slate-300 active:scale-95 text-xs font-semibold text-ink-main transition-all disabled:opacity-50 shadow-sm"
            title="Fetch new recommendations without repeats"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400 light:text-amber-600" : ""}`} />
            <span>Explore More</span>
          </button>

          {/* Personalized History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-200 text-xs font-semibold text-ink-secondary hover:text-ink-main transition-all"
            title="View personal analyzed and recommended history"
          >
            <History className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
            <span className="hidden sm:inline">Personal History</span>
            {recentlyAnalyzed.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-500/30 light:bg-purple-100 text-purple-200 light:text-purple-700 text-[10px] flex items-center justify-center font-bold">
                {recentlyAnalyzed.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Mood Explorer Chips (Switch to any of the 10 emotions) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-ink-muted">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-ink-muted" />
            Explore Recommendations by Detected Emotion:
          </span>
          <span className="text-[11px] text-ink-dim">10 Core Emotion Spectrums</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {ALL_MOODS.map((mood) => {
            const def = MOOD_META[mood] || MOOD_DEFINITIONS[mood];
            const isSelected = activeMood === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => setActiveMood(mood)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? "bg-white text-black light:bg-slate-900 light:text-white shadow-lg scale-102"
                    : "theme-well text-ink-muted hover:text-ink-main"
                }`}
              >
                <span>{def?.emoji || "🎵"}</span>
                <span>{mood}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Personalized Journey Banner (Recently Analyzed Songs) */}
      {recentlyAnalyzed.length > 0 && (
        <div className="p-3 rounded-2xl theme-well flex items-center gap-3 overflow-x-auto">
          <span className="text-[11px] uppercase tracking-wider font-bold text-ink-dim shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Recent:
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {recentlyAnalyzed.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveMood(item.mood);
                  if (onSelectSongForAnalysis) {
                    onSelectSongForAnalysis(item);
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 light:bg-white light:hover:bg-slate-100 border border-white/10 light:border-slate-200 text-xs text-ink-secondary hover:text-ink-main transition-all shrink-0"
              >
                <span>{item.emoji}</span>
                <span className="font-medium max-w-[120px] truncate">{item.title}</span>
                <span className="text-[10px] text-ink-dim">({item.mood})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Recommendation Cards Grid */}
      {loading ? (
        // Loading Skeleton Grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="theme-card rounded-3xl p-5 animate-pulse space-y-4"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/10 light:bg-slate-200 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/10 light:bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-white/5 light:bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-white/5 light:bg-slate-100 rounded w-1/4" />
                </div>
              </div>
              <div className="h-12 bg-white/5 light:bg-slate-100 rounded-xl" />
              <div className="h-9 bg-white/10 light:bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="theme-card rounded-3xl p-8 border-red-500/20 text-center space-y-3">
          <p className="text-sm text-red-300 light:text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => fetchRecommendations(false)}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 light:bg-slate-100 light:hover:bg-slate-200 text-xs font-semibold text-ink-main"
          >
            Retry Recommendations
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="theme-card rounded-3xl p-8 text-center space-y-2">
          <p className="text-sm text-ink-muted">
            No recommendations found for this mood yet. Try exploring another emotion.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {recommendations.map((song, idx) => (
              <motion.div
                key={song.id || `${song.title}-${idx}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: idx * 0.05 }}
                className="group theme-card rounded-3xl p-5 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/10 transition-all flex flex-col justify-between"
              >
                {/* Top Section: Artwork + Info */}
                <div>
                  <div className="flex items-start gap-4 mb-3.5">
                    {/* Album Artwork */}
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 theme-well shadow-md">
                      <img
                        src={song.coverArtUrl}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-1 right-1 text-[10px] font-mono text-white bg-black/75 px-1.5 py-0.5 rounded">
                        {song.duration}
                      </div>
                    </div>

                    {/* Song Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                          style={getEmotionBadgeStyle(song.mood || activeMood, isDark)}
                        >
                          {song.mood || activeMood}
                        </span>
                        {song.language && (
                          <span className="text-[10px] text-ink-dim font-medium">
                            • {song.language}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-bold text-base text-ink-main truncate group-hover:text-amber-300 light:group-hover:text-amber-700 transition-colors">
                        {song.title}
                      </h3>
                      <p className="text-xs text-ink-secondary truncate font-medium">
                        {song.artist}
                      </p>
                      <p className="text-[11px] text-ink-dim truncate mt-0.5">
                        {song.album}
                      </p>
                    </div>
                  </div>

                  {/* Why Recommended Reason Box */}
                  <div className="p-3 rounded-2xl theme-well space-y-1 mb-4">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-300 light:text-amber-700">
                      <Sparkles className="w-3 h-3 text-amber-400 light:text-amber-600" />
                      <span>Why Recommended</span>
                    </div>
                    <p className="text-xs text-ink-secondary leading-relaxed font-sans">
                      {song.reason}
                    </p>
                  </div>
                </div>

                {/* Bottom Section: Listening & Action Links */}
                <div className="pt-3 border-t border-white/10 light:border-slate-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Spotify Listen Link */}
                    {song.spotifyUrl && (
                      <a
                        href={song.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 light:bg-emerald-50 light:hover:bg-emerald-100 text-emerald-300 light:text-emerald-700 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <Headphones className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                        <span>Spotify</span>
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </a>
                    )}

                    {/* YouTube Search/Listen Link */}
                    {song.youtubeUrl && (
                      <a
                        href={song.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 light:bg-rose-50 light:hover:bg-rose-100 text-rose-300 light:text-rose-700 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <YoutubeIcon className="w-3.5 h-3.5 text-rose-400 light:text-rose-600" />
                        <span>YouTube</span>
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                  </div>

                  {/* Optional Quick Action: Analyze This Song */}
                  {onSelectSongForAnalysis && (
                    <button
                      type="button"
                      onClick={() => onSelectSongForAnalysis(song)}
                      className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 light:bg-slate-100 light:hover:bg-slate-200 text-[11px] font-medium text-ink-muted hover:text-ink-main transition-colors flex items-center justify-center gap-1"
                    >
                      <Music2 className="w-3 h-3" />
                      <span>Analyze Lyrics of this Song</span>
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 5. Personal History Modal / Drawer */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 light:bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              className="theme-modal rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 light:border-slate-200">
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-purple-400 light:text-purple-600" />
                  <h3 className="font-display font-bold text-xl text-ink-main">
                    Personalized Music Journey
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 light:bg-slate-100 light:hover:bg-slate-200 text-xs font-semibold text-ink-main"
                >
                  Close
                </button>
              </div>

              {/* Analyzed Songs History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Recently Analyzed Songs ({recentlyAnalyzed.length})
                  </h4>
                  {recentlyAnalyzed.length > 0 && (
                    <button
                      type="button"
                      onClick={clearPersonalizationHistory}
                      className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 light:text-red-600 light:hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear History
                    </button>
                  )}
                </div>

                {recentlyAnalyzed.length === 0 ? (
                  <p className="text-xs text-ink-dim py-3">No analyzed songs yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {recentlyAnalyzed.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl theme-well text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{item.emoji}</span>
                          <div>
                            <div className="font-semibold text-ink-main">{item.title}</div>
                            <div className="text-[11px] text-ink-muted">{item.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded border"
                            style={getEmotionBadgeStyle(item.mood, isDark)}
                          >
                            {item.mood} ({item.confidence}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMood(item.mood);
                              setShowHistoryModal(false);
                            }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 light:bg-white light:hover:bg-slate-200 border border-transparent light:border-slate-200 text-ink-main"
                            title="Explore Recommendations for this Mood"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Recommendation Batches */}
              <div className="space-y-3 pt-2 border-t border-white/10 light:border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Past Recommendation Sessions ({recommendationHistory.length})
                </h4>
                {recommendationHistory.length === 0 ? (
                  <p className="text-xs text-ink-dim py-3">
                    Recommendations will be saved here as you explore.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {recommendationHistory.map((batch, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl theme-well text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between text-ink-muted text-[11px]">
                          <span className="font-semibold text-ink-main">
                            Mood: {batch.mood}
                          </span>
                          <span>{new Date(batch.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {batch.songs?.map((s, sIdx) => (
                            <a
                              key={sIdx}
                              href={s.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 light:bg-white border border-transparent light:border-slate-200 text-[11px] text-ink-secondary hover:text-ink-main"
                            >
                              <span>{s.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
