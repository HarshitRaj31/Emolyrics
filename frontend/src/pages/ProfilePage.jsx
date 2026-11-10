import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  Sparkles,
  Bookmark,
  Trash2,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Headphones,
  FileText,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Check,
  Disc3,
  Layers,
  Heart,
  ChevronRight,
  ShieldCheck,
  LogOut,
  X
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { MOOD_DEFINITIONS } from "../data/examples";

function YoutubeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const ALL_MOODS = [
  "Happy",
  "Sad",
  "Angry",
  "Romantic",
  "Calm/Chill",
  "Exciting",
  "Patriotic",
  "Thrilling",
  "Horror"
];

export default function ProfilePage({ onOpenAuth }) {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { recentlyAnalyzed } = usePersonalization();

  // Active dashboard tab: 'timeline' | 'history' | 'saved'
  const [activeTab, setActiveTab] = useState("timeline");

  // Profile Data State
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit Profile Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // History State
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyMood, setHistoryMood] = useState("All");
  const [historySort, setHistorySort] = useState("newest"); // 'newest' | 'oldest'
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null);

  // Saved Songs State
  const [savedSongs, setSavedSongs] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);

  // Load Profile and Aggregated Stats
  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const res = await api.getUserProfile();
      if (res.success) {
        setProfileData(res.profile);
        setStats(res.stats);
        setTimeline(res.timeline || []);
        setEditName(res.profile.name);
        setEditAvatar(res.profile.avatar);
      }
    } catch (err) {
      console.warn("Error loading user profile:", err.message);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  // Load User Analysis History
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const res = await api.getUserHistory({
        search: historySearch,
        mood: historyMood,
        sort: historySort,
        limit: 50
      });
      if (res.success) {
        setHistoryItems(res.items || []);
      }
    } catch (err) {
      console.warn("Error loading history:", err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, historySearch, historyMood, historySort]);

  // Load Saved Songs
  const loadSavedSongs = useCallback(async () => {
    if (!user) return;
    setSavedLoading(true);
    try {
      const res = await api.getSavedSongs();
      if (res.success) {
        setSavedSongs(res.songs || []);
      }
    } catch (err) {
      console.warn("Error loading saved songs:", err.message);
    } finally {
      setSavedLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    } else if (activeTab === "saved") {
      loadSavedSongs();
    }
  }, [activeTab, loadHistory, loadSavedSongs]);

  // Update Profile Submit
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await api.updateUserProfile({
        name: editName.trim(),
        avatar: editAvatar.trim()
      });

      if (res.success) {
        updateUser(res.user);
        setProfileData((prev) => ({ ...prev, ...res.user }));
        setProfileMsg("Profile updated successfully!");
        setTimeout(() => {
          setEditModalOpen(false);
          setProfileMsg("");
        }, 1200);
      }
    } catch (err) {
      setProfileMsg("Update failed: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Delete Individual History Record
  const handleDeleteHistoryItem = async (id) => {
    if (!window.confirm("Are you sure you want to remove this analysis record?")) return;
    try {
      await api.deleteHistoryItem(id);
      setHistoryItems((prev) => prev.filter((item) => item._id !== id));
      setTimeline((prev) => prev.filter((item) => item.id !== id && item._id !== id));
      if (selectedHistoryDetail?._id === id) {
        setSelectedHistoryDetail(null);
      }
      loadProfile();
    } catch (err) {
      alert("Failed to delete record: " + err.message);
    }
  };

  // Clear All History with Confirmation
  const handleClearAllHistory = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear your entire analysis history? This action cannot be undone."
      )
    )
      return;

    try {
      await api.clearAllHistory();
      setHistoryItems([]);
      setTimeline([]);
      loadProfile();
      alert("All analysis history cleared successfully.");
    } catch (err) {
      alert("Failed to clear history: " + err.message);
    }
  };

  // Remove Saved Song
  const handleRemoveSavedSong = async (id) => {
    try {
      await api.removeSavedSong(id);
      setSavedSongs((prev) => prev.filter((s) => s._id !== id));
      loadProfile();
    } catch (err) {
      alert("Failed to remove saved song: " + err.message);
    }
  };

  // Re-Analyze Song
  const handleReAnalyze = (song) => {
    navigate("/", {
      state: {
        reanalyzeSong: {
          title: song.title,
          artist: song.artist,
          lyrics: song.lyrics || ""
        }
      }
    });
  };

  // Guest State Render
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center space-y-8">
        <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-white/10 flex items-center justify-center mx-auto text-neutral-400 shadow-xl">
          <User className="w-10 h-10 text-amber-400" />
        </div>

        <div className="space-y-3">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">
            Guest User Session Active
          </h1>
          <p className="text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
            You are currently exploring EmoLyrics as a guest. All core features—song discovery, lyrics retrieval, mood prediction, and recommendations—are fully functional.
          </p>
        </div>

        {/* Guest Recent Activity */}
        {recentlyAnalyzed.length > 0 && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 max-w-xl mx-auto text-left space-y-4">
            <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-white/10">
              <span className="font-bold uppercase tracking-wider text-neutral-300">
                Session History ({recentlyAnalyzed.length})
              </span>
              <span>Stored in Local Storage</span>
            </div>
            <div className="space-y-2">
              {recentlyAnalyzed.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.emoji}</span>
                    <span className="font-semibold text-white truncate max-w-[180px]">
                      {item.title}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.mood}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-6 py-3 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-all shadow-xl"
          >
            Sign In or Create Account
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    );
  }

  const topMoodDef = stats?.mostFrequentMood ? MOOD_DEFINITIONS[stats.mostFrequentMood] : null;

  return (
    <div className="min-h-[calc(100vh-65px)] pb-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* 1. Profile Overview Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <img
                src={profileData?.avatar || user.avatar}
                alt={user.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-white/20 shadow-xl"
              />
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-transform hover:scale-110"
                title="Edit Profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Meta */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                  {profileData?.name || user.name}
                </h1>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {profileData?.role || "Explorer"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{profileData?.email || user.email}</span>
              </p>
              <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-0.5">
                <Calendar className="w-3 h-3" />
                <span>
                  Member since{" "}
                  {profileData?.createdAt
                    ? new Date(profileData.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric"
                      })
                    : "Recent"}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. Key Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Analyses */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Analyzed</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-extrabold text-3xl text-white">
            {stats ? stats.totalAnalyses : "0"}
          </div>
          <p className="text-[11px] text-neutral-500">Lyrics emotion classifications</p>
        </div>

        {/* Most Frequent Mood */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Lyrical Mood</span>
            <span className="text-base select-none">{topMoodDef?.emoji || "🎵"}</span>
          </div>
          <div className="font-display font-extrabold text-2xl text-white truncate">
            {stats?.mostFrequentMood || "None Yet"}
          </div>
          <p className="text-[11px] text-neutral-500">
            {stats?.mostFrequentMoodCount ? `${stats.mostFrequentMoodCount} songs detected` : "Awaiting analyses"}
          </p>
        </div>

        {/* Saved Songs */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Saved Favorites</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-display font-extrabold text-3xl text-white">
            {stats ? stats.totalSavedSongs : "0"}
          </div>
          <p className="text-[11px] text-neutral-500">Bookmarked in personal library</p>
        </div>

        {/* Emotion Coverage */}
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Mood Spectrum</span>
            <Disc3 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="font-display font-extrabold text-3xl text-white">
            {stats?.moodDistribution ? Object.keys(stats.moodDistribution).length : 0} / 9
          </div>
          <p className="text-[11px] text-neutral-500">Trained emotions explored</p>
        </div>
      </div>

      {/* 3. Dashboard Segmented Tabs */}
      <div className="flex p-1.5 bg-neutral-900/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "timeline"
              ? "bg-purple-600 text-white shadow-md"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Mood Timeline & Distribution</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "history"
              ? "bg-purple-600 text-white shadow-md"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Analysis History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("saved")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === "saved"
              ? "bg-purple-600 text-white shadow-md"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Songs ({savedSongs.length || stats?.totalSavedSongs || 0})</span>
        </button>
      </div>

      {/* 4. Tab Content: Mood Timeline & Distribution */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          {/* Important Medical/Psychological Disclaimer */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200 leading-relaxed shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-300 mb-0.5">
                Notice on Lyrical Emotion Classification
              </span>
              The metrics and timeline below visualize automated natural language classifications of song lyrics analyzed through our NLP machine learning model. They reflect artistic and poetic sentiment in the music you explore, not your actual psychological or emotional state.
            </div>
          </div>

          {/* Mood Distribution Bar Breakdown */}
          {stats?.moodDistribution && Object.keys(stats.moodDistribution).length > 0 && (
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Emotion Classification Distribution</span>
                </h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {stats.totalAnalyses} Total Records
                </span>
              </div>

              {/* Multi-colored Distribution Bar */}
              <div className="h-4 w-full bg-neutral-900 rounded-full overflow-hidden flex shadow-inner">
                {Object.entries(stats.moodDistribution).map(([mood, count]) => {
                  const def = MOOD_DEFINITIONS[mood];
                  const pct = Math.round((count / (stats.totalAnalyses || 1)) * 100);
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={mood}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: def?.color || "#a855f7"
                      }}
                      title={`${mood}: ${count} songs (${pct}%)`}
                      className="h-full hover:opacity-80 transition-opacity"
                    />
                  );
                })}
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                {ALL_MOODS.map((mood) => {
                  const def = MOOD_DEFINITIONS[mood];
                  const count = stats.moodDistribution[mood] || 0;
                  const pct = Math.round((count / (stats.totalAnalyses || 1)) * 100);
                  return (
                    <div
                      key={mood}
                      className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{def?.emoji}</span>
                        <span className="font-medium text-neutral-300 truncate">{mood}</span>
                      </div>
                      <span className="font-mono font-bold text-neutral-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chronological Timeline Stream */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Chronological Activity Timeline</span>
            </h3>

            {timeline.length === 0 ? (
              <div className="text-center py-10 space-y-2 text-neutral-400 text-xs">
                <Disc3 className="w-8 h-8 mx-auto text-neutral-500 animate-spin-slow" />
                <p>No analyzed songs in your timeline yet.</p>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20"
                >
                  Analyze Your First Song
                </button>
              </div>
            ) : (
              <div className="relative border-l-2 border-white/10 ml-4 sm:ml-6 pl-4 sm:pl-6 space-y-6 py-2">
                {timeline.map((entry, idx) => {
                  const moodDef = MOOD_DEFINITIONS[entry.mood];
                  return (
                    <div key={entry.id || idx} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className="absolute -left-[23px] sm:-left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-neutral-950 flex items-center justify-center"
                        style={{ backgroundColor: moodDef?.color || "#a855f7" }}
                      />

                      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/5 hover:border-white/20 transition-all space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-neutral-400 text-[11px]">
                            {new Date(entry.date).toLocaleString()}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${moodDef?.color}20`,
                              color: moodDef?.color
                            }}
                          >
                            {moodDef?.emoji} {entry.mood} ({entry.confidence}%)
                          </span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-white">{entry.title}</h4>
                        <p className="text-xs text-neutral-400">{entry.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Tab Content: Analysis History */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Controls: Search, Emotion Filter, Sort, Clear All */}
          <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search your analysis history by title, artist, or cues..."
                  className="w-full bg-neutral-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Emotion Filter */}
              <select
                value={historyMood}
                onChange={(e) => setHistoryMood(e.target.value)}
                className="bg-neutral-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="All">All Emotions</option>
                {ALL_MOODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setHistorySort((prev) => (prev === "newest" ? "oldest" : "newest"))}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300"
                title="Toggle sort order"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
                <span>{historySort === "newest" ? "Newest First" : "Oldest First"}</span>
              </button>

              {/* Clear All Button */}
              {historyItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHistory}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* History Cards Grid */}
          {historyLoading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 mt-2">Loading history records...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="glass-panel rounded-3xl p-10 border border-white/10 text-center space-y-2 text-neutral-400 text-xs">
              <FileText className="w-8 h-8 text-neutral-500 mx-auto" />
              <p>No analysis records match your search or filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyItems.map((item) => {
                const moodDef = MOOD_DEFINITIONS[item.mood];
                return (
                  <div
                    key={item._id}
                    className="glass-panel rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${moodDef?.color}20`,
                            color: moodDef?.color
                          }}
                        >
                          {moodDef?.emoji} {item.mood} ({item.confidence}%)
                        </span>
                        <span className="text-[11px] font-mono text-neutral-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-base text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-neutral-300 font-medium truncate">{item.artist}</p>

                      <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                        {item.explanation}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryDetail(item)}
                        className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistoryItem(item._id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Tab Content: Saved Songs */}
      {activeTab === "saved" && (
        <div className="space-y-6">
          {savedLoading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 mt-2">Loading saved songs...</p>
            </div>
          ) : savedSongs.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 border border-white/10 text-center space-y-3">
              <Bookmark className="w-10 h-10 text-neutral-500 mx-auto" />
              <h3 className="font-display font-bold text-lg text-white">No Saved Songs Yet</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Bookmark tracks from the Song Discovery or Analyzer page to access your favorite songs and external listening links here anytime.
              </p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all"
              >
                Discover & Save Songs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {savedSongs.map((song) => {
                const moodDef = MOOD_DEFINITIONS[song.mood];
                return (
                  <div
                    key={song._id}
                    className="glass-panel rounded-3xl p-5 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start gap-3.5">
                        <img
                          src={song.coverArtUrl}
                          alt={song.title}
                          className="w-16 h-16 rounded-2xl object-cover bg-neutral-900 border border-white/10 shadow-md shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `${moodDef?.color}20`,
                              color: moodDef?.color
                            }}
                          >
                            {moodDef?.emoji} {song.mood}
                          </span>
                          <h4 className="font-display font-bold text-sm text-white truncate mt-1">
                            {song.title}
                          </h4>
                          <p className="text-xs text-neutral-400 truncate">{song.artist}</p>
                          {song.album && (
                            <p className="text-[11px] text-neutral-500 truncate">{song.album}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {song.spotifyUrl && (
                          <a
                            href={song.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                          >
                            <Headphones className="w-3 h-3 text-emerald-400" />
                            <span>Spotify</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}

                        {song.youtubeUrl && (
                          <a
                            href={song.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                          >
                            <YoutubeIcon className="w-3 h-3 text-rose-400" />
                            <span>YouTube</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleReAnalyze(song)}
                          className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-Analyze Lyrics</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveSavedSong(song._id)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 transition-colors"
                          title="Remove from saved"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Modal: History Details View */}
      <AnimatePresence>
        {selectedHistoryDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="font-display font-bold text-xl text-white">
                    {selectedHistoryDetail.title}
                  </h3>
                  <p className="text-xs text-neutral-400">{selectedHistoryDetail.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryDetail(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mood Badge */}
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-xl text-xs font-bold"
                  style={{
                    backgroundColor: `${MOOD_DEFINITIONS[selectedHistoryDetail.mood]?.color}25`,
                    color: MOOD_DEFINITIONS[selectedHistoryDetail.mood]?.color
                  }}
                >
                  {MOOD_DEFINITIONS[selectedHistoryDetail.mood]?.emoji} {selectedHistoryDetail.mood} (
                  {selectedHistoryDetail.confidence}%)
                </span>
                <span className="text-xs text-neutral-400">
                  Language: {selectedHistoryDetail.language}
                </span>
                <span className="text-xs text-neutral-500 font-mono ml-auto">
                  {new Date(selectedHistoryDetail.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Explanation */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-neutral-200 leading-relaxed">
                <span className="font-bold text-purple-400 block mb-1">NLP Linguistic Analysis</span>
                {selectedHistoryDetail.explanation}
              </div>

              {/* Matched Cues */}
              {selectedHistoryDetail.detectedKeywords?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500">
                    Matched Emotional Keywords:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHistoryDetail.detectedKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/10 text-white font-mono text-[10px]"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Lyrics Content */}
              {selectedHistoryDetail.lyrics && (
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500">
                    Analyzed Lyrical Text:
                  </span>
                  <div className="bg-neutral-950 p-4 rounded-2xl max-h-[220px] overflow-y-auto text-xs text-neutral-300 leading-relaxed whitespace-pre-line font-mono border border-white/5">
                    {selectedHistoryDetail.lyrics}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Modal: Edit Profile */}
      <AnimatePresence>
        {editModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="font-display font-bold text-lg text-white">Update Profile</h3>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-xl bg-white/10 text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-semibold mb-1">Avatar Image URL</label>
                  <input
                    type="url"
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {profileMsg && (
                  <p className="text-xs text-center font-medium text-purple-400">{profileMsg}</p>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

