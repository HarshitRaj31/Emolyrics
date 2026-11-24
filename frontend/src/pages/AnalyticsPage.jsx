import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  Users,
  Activity,
  Disc3,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck,
  Globe,
  Lock,
  Trash2,
  Database,
  Server,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Languages
} from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { MOOD_DEFINITIONS } from "../data/examples";
import MoodDoughnutChart from "../components/analytics/MoodDoughnutChart";
import MoodTrendsChart from "../components/analytics/MoodTrendsChart";
import EmotionComparisonChart from "../components/analytics/EmotionComparisonChart";
import ArtistAnalyticsSection from "../components/analytics/ArtistAnalyticsSection";
import ConfidenceAnalyticsSection from "../components/analytics/ConfidenceAnalyticsSection";
import LanguageDistributionChart from "../components/analytics/LanguageDistributionChart";
import SecondaryEmotionChart from "../components/analytics/SecondaryEmotionChart";
import PersonalJourneySection from "../components/analytics/PersonalJourneySection";
import AnalyticsFilters from "../components/analytics/AnalyticsFilters";

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

const SUPPORTED_LANGUAGES = [
  { language: "English", flag: "🇬🇧", color: "#3b82f6" },
  { language: "Hindi", flag: "🇮🇳", color: "#f97316" },
  { language: "Bengali", flag: "🇧🇩", color: "#10b981" },
  { language: "Spanish", flag: "🇪🇸", color: "#ef4444" },
  { language: "French", flag: "🇫🇷", color: "#8b5cf6" }
];

function normalizeLang(langStr) {
  if (!langStr || typeof langStr !== "string") return "English";
  const lower = langStr.toLowerCase().trim();
  if (lower.includes("hindi") || lower.includes("hinglish") || lower === "hi") return "Hindi";
  if (lower.includes("bengali") || lower.includes("bangla") || lower.includes("banglish") || lower === "bn") return "Bengali";
  if (lower.includes("spanish") || lower.includes("español") || lower === "es") return "Spanish";
  if (lower.includes("french") || lower.includes("français") || lower === "fr") return "French";
  if (lower.includes("english") || lower === "en") return "English";
  return "Other";
}

function extractItemSecondary(it) {
  if (it.secondaryMood && ALL_MOODS.includes(it.secondaryMood)) {
    return it.secondaryMood;
  }
  if (it.scores && typeof it.scores === "object") {
    const primary = (it.mood || "").toLowerCase();
    const candidates = Object.entries(it.scores)
      .filter(([m, val]) => m.toLowerCase() !== primary && Number(val) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    if (candidates.length > 0 && candidates[0][1] > 0 && ALL_MOODS.includes(candidates[0][0])) {
      return candidates[0][0];
    }
  }
  return null;
}

function computeLocalAnalytics(items) {
  const total = items.length;
  if (total === 0) {
    return {
      kpi: {
        totalAnalyses: 0,
        mostFrequentlyDetectedEmotion: null,
        mostFrequentCount: 0,
        mostFrequentSecondaryEmotion: "None",
        mostFrequentSecondaryCount: 0,
        totalWithSecondary: 0,
        topLanguage: "None",
        topLanguageCount: 0,
        uniqueArtistsCount: 0,
        averageConfidence: 0,
        recentActivity: []
      },
      languageDistribution: SUPPORTED_LANGUAGES.map((l) => ({
        ...l,
        count: 0,
        percentage: 0
      })),
      secondaryEmotionDistribution: ALL_MOODS.map((m) => ({
        mood: m,
        count: 0,
        percentage: 0,
        color: MOOD_DEFINITIONS[m]?.color || "#f59e0b",
        emoji: MOOD_DEFINITIONS[m]?.emoji || "☀️"
      })),
      moodDistribution: ALL_MOODS.map((m) => ({
        mood: m,
        count: 0,
        percentage: 0,
        color: MOOD_DEFINITIONS[m]?.color || "#f59e0b",
        emoji: MOOD_DEFINITIONS[m]?.emoji || "☀️"
      })),
      trends: { daily: [], weekly: [], monthly: [] },
      emotionComparison: ALL_MOODS.map((m) => ({
        mood: m,
        count: 0,
        percentage: 0,
        averageConfidence: 0,
        color: MOOD_DEFINITIONS[m]?.color || "#f59e0b",
        emoji: MOOD_DEFINITIONS[m]?.emoji || "☀️"
      })),
      artistAnalytics: { topArtists: [], topSongs: [] },
      confidenceAnalytics: {
        averageConfidence: 0,
        distribution: [
          { range: "90% - 100% (High Certainty)", count: 0, percentage: 0 },
          { range: "75% - 89% (Moderate Certainty)", count: 0, percentage: 0 },
          { range: "50% - 74% (Ambiguous Sentiment)", count: 0, percentage: 0 },
          { range: "< 50% (Low Certainty)", count: 0, percentage: 0 }
        ],
        individualPoints: [],
        disclaimer: "Metrics computed directly from lyrics analyzed on this browser device."
      },
      availableMoods: [],
      availableArtists: []
    };
  }

  const moodCounts = {};
  const artistCounts = {};
  const langCounts = {
    English: 0,
    Hindi: 0,
    Bengali: 0,
    Spanish: 0,
    French: 0,
    Other: 0
  };
  const secondaryCounts = {};
  let totalWithSecondary = 0;
  let totalConfidence = 0;

  items.forEach((item) => {
    const m = item.mood || "Happy";
    moodCounts[m] = (moodCounts[m] || 0) + 1;
    const a = (item.artist || "Unknown Artist").trim();
    artistCounts[a] = (artistCounts[a] || 0) + 1;
    totalConfidence += Number(item.confidence) || 0;

    // Language
    const l = normalizeLang(item.language);
    langCounts[l] = (langCounts[l] || 0) + 1;

    // Secondary emotion
    const sec = extractItemSecondary(item);
    if (sec) {
      secondaryCounts[sec] = (secondaryCounts[sec] || 0) + 1;
      totalWithSecondary += 1;
    }
  });

  let dominantMood = "Happy";
  let maxCount = 0;
  Object.entries(moodCounts).forEach(([m, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = m;
    }
  });

  let topSecondaryMood = "None";
  let topSecondaryCount = 0;
  Object.entries(secondaryCounts).forEach(([m, c]) => {
    if (c > topSecondaryCount) {
      topSecondaryCount = c;
      topSecondaryMood = m;
    }
  });

  let topLanguage = "English";
  let topLanguageCount = 0;
  Object.entries(langCounts).forEach(([l, c]) => {
    if (c > topLanguageCount) {
      topLanguageCount = c;
      topLanguage = l;
    }
  });

  const uniqueArtists = Object.keys(artistCounts);
  const avgConf = Math.round(totalConfidence / total);

  // Language Distribution
  const languageDistribution = SUPPORTED_LANGUAGES.map((l) => {
    const count = langCounts[l.language] || 0;
    const percentage = Math.round((count / total) * 100);
    return {
      ...l,
      count,
      percentage
    };
  });
  if (langCounts.Other > 0) {
    languageDistribution.push({
      language: "Other",
      flag: "🌐",
      color: "#64748b",
      count: langCounts.Other,
      percentage: Math.round((langCounts.Other / total) * 100)
    });
  }

  // Secondary Emotion Distribution
  const secondaryEmotionDistribution = ALL_MOODS.map((m) => {
    const count = secondaryCounts[m] || 0;
    const percentage = Math.round((count / total) * 100);
    const meta = MOOD_DEFINITIONS[m] || { emoji: "☀️", color: "#f59e0b" };
    return {
      mood: m,
      count,
      percentage,
      color: meta.color || "#f59e0b",
      emoji: meta.emoji || "☀️"
    };
  });

  // Mood Distribution
  const moodDistribution = ALL_MOODS.map((m) => {
    const count = moodCounts[m] || 0;
    const percentage = Math.round((count / total) * 100);
    const meta = MOOD_DEFINITIONS[m] || { emoji: "☀️", color: "#f59e0b" };
    return {
      mood: m,
      count,
      percentage,
      color: meta.color || "#f59e0b",
      emoji: meta.emoji || "☀️"
    };
  });

  const emotionComparison = ALL_MOODS.map((m) => {
    const count = moodCounts[m] || 0;
    const percentage = Math.round((count / total) * 100);
    const matching = items.filter((it) => it.mood === m);
    const moodAvgConf = matching.length > 0
      ? Math.round(matching.reduce((acc, it) => acc + (Number(it.confidence) || 0), 0) / matching.length)
      : 0;
    const meta = MOOD_DEFINITIONS[m] || { emoji: "☀️", color: "#f59e0b" };

    return {
      mood: m,
      count,
      percentage,
      averageConfidence: moodAvgConf,
      color: meta.color || "#f59e0b",
      emoji: meta.emoji || "☀️"
    };
  });

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([art, count]) => {
      const artSongs = items.filter((it) => (it.artist || "Unknown Artist").trim() === art);
      const artMoodCounts = {};
      artSongs.forEach((it) => {
        artMoodCounts[it.mood] = (artMoodCounts[it.mood] || 0) + 1;
      });
      const topArtMood = Object.entries(artMoodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Happy";

      return {
        artist: art,
        count,
        percentage: Math.round((count / total) * 100),
        topMood: topArtMood
      };
    });

  const songMap = {};
  items.forEach((it) => {
    const key = `${it.title}___${it.artist || ""}`;
    if (!songMap[key]) {
      songMap[key] = {
        title: it.title,
        artist: it.artist || "Unknown Artist",
        mood: it.mood,
        confidence: it.confidence,
        count: 0
      };
    }
    songMap[key].count += 1;
  });
  const topSongs = Object.values(songMap).sort((a, b) => b.count - a.count).slice(0, 5);

  let high = 0, mod = 0, amb = 0, low = 0;
  items.forEach((it) => {
    const c = Number(it.confidence) || 0;
    if (c >= 90) high++;
    else if (c >= 75) mod++;
    else if (c >= 50) amb++;
    else low++;
  });

  const confidenceDistribution = [
    { range: "90% - 100% (High Certainty)", count: high, percentage: Math.round((high / total) * 100) },
    { range: "75% - 89% (Moderate Certainty)", count: mod, percentage: Math.round((mod / total) * 100) },
    { range: "50% - 74% (Ambiguous Sentiment)", count: amb, percentage: Math.round((amb / total) * 100) },
    { range: "< 50% (Low Certainty)", count: low, percentage: Math.round((low / total) * 100) }
  ];

  const dailyMap = {};
  items.forEach((it) => {
    const d = (it.timestamp || new Date().toISOString()).split("T")[0];
    if (!dailyMap[d]) dailyMap[d] = { date: d, total: 0 };
    dailyMap[d].total += 1;
  });
  const dailyTrends = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  return {
    kpi: {
      totalAnalyses: total,
      mostFrequentlyDetectedEmotion: dominantMood,
      mostFrequentCount: maxCount,
      mostFrequentSecondaryEmotion: topSecondaryMood,
      mostFrequentSecondaryCount: topSecondaryCount,
      totalWithSecondary,
      topLanguage,
      topLanguageCount,
      uniqueArtistsCount: uniqueArtists.length,
      averageConfidence: avgConf,
      recentActivity: items.slice(0, 5)
    },
    languageDistribution,
    secondaryEmotionDistribution,
    moodDistribution,
    trends: {
      daily: dailyTrends,
      weekly: dailyTrends,
      monthly: dailyTrends
    },
    emotionComparison,
    artistAnalytics: {
      topArtists,
      topSongs
    },
    confidenceAnalytics: {
      averageConfidence: avgConf,
      distribution: confidenceDistribution,
      individualPoints: items.slice(0, 10).map((it, idx) => ({
        id: it.id || it._id || `${it.title}-${it.artist}-${idx}`,
        title: it.title,
        artist: it.artist,
        mood: it.mood,
        confidence: it.confidence
      })),
      disclaimer: "Metrics computed directly from lyrics analyzed on this browser device."
    },
    availableMoods: Object.keys(moodCounts),
    availableArtists: uniqueArtists
  };
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { recentlyAnalyzed, clearPersonalizationHistory } = usePersonalization();
  const isAdmin = user?.role === "admin";

  // Views: "community" (Global Analytics), "local" (My Activity), "admin" (Admin Analytics)
  const [scope, setScope] = useState("community");
  const [timeframe, setTimeframe] = useState("all");
  const [mood, setMood] = useState("All");
  const [artist, setArtist] = useState("All");

  // Global Analytics State
  const [globalAnalytics, setGlobalAnalytics] = useState(null);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [globalError, setGlobalError] = useState("");

  // Admin Analytics State
  const [adminData, setAdminData] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Fetch Global Analytics (public anonymized community dataset)
  const fetchGlobalAnalytics = useCallback(async () => {
    setLoadingGlobal(true);
    setGlobalError("");

    try {
      const data = await api.getAnalytics({
        scope: "community",
        timeframe,
        mood,
        artist
      });

      if (data.success) {
        setGlobalAnalytics(data);
      } else {
        setGlobalError(data.message || "Failed to load global analytics.");
      }
    } catch (err) {
      console.error("Global analytics fetch error:", err);
      setGlobalError(err.message || "Failed to load mood analytics.");
    } finally {
      setLoadingGlobal(false);
    }
  }, [timeframe, mood, artist]);

  // Fetch Admin Analytics (protected)
  const fetchAdminAnalytics = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    setAdminError("");

    try {
      const res = await api.getAdminAnalytics();
      if (res.success) {
        setAdminData(res.data);
      } else {
        setAdminError(res.message || "Failed to load admin analytics.");
      }
    } catch (err) {
      console.error("Admin analytics fetch error:", err);
      setAdminError(err.message || "Admin access required.");
    } finally {
      setLoadingAdmin(false);
    }
  }, [isAdmin]);

  // Load appropriate data when scope or filters change
  useEffect(() => {
    if (scope === "community") {
      fetchGlobalAnalytics();
    } else if (scope === "admin") {
      fetchAdminAnalytics();
    }
  }, [scope, fetchGlobalAnalytics, fetchAdminAnalytics]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setTimeframe("all");
    setMood("All");
    setArtist("All");
  };

  // Clear Local History Handler
  const handleClearLocalHistory = () => {
    if (window.confirm("Are you sure you want to clear your local analysis history from this browser? This cannot be undone.")) {
      clearPersonalizationHistory();
    }
  };

  // Compute filtered local activity
  const filteredLocalItems = useMemo(() => {
    let items = [...recentlyAnalyzed];

    if (mood !== "All") {
      items = items.filter((it) => it.mood === mood);
    }
    if (artist !== "All") {
      items = items.filter((it) => (it.artist || "Unknown Artist").trim() === artist);
    }
    if (timeframe !== "all") {
      const now = Date.now();
      const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      items = items.filter((it) => new Date(it.timestamp).getTime() >= cutoff);
    }

    return items;
  }, [recentlyAnalyzed, mood, artist, timeframe]);

  const localAnalytics = useMemo(() => {
    return computeLocalAnalytics(filteredLocalItems);
  }, [filteredLocalItems]);

  // Active analytics representation based on scope
  const activeAnalytics = scope === "local" ? localAnalytics : globalAnalytics;
  const loading = scope === "local" ? false : scope === "admin" ? loadingAdmin : loadingGlobal;
  const error = scope === "local" ? "" : scope === "admin" ? adminError : globalError;

  const kpi = activeAnalytics?.kpi || {};
  const topMoodDef = kpi.mostFrequentlyDetectedEmotion
    ? MOOD_DEFINITIONS[kpi.mostFrequentlyDetectedEmotion]
    : null;

  return (
    <div className="w-full space-y-8 font-sans">
      {/* 1. Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10 light:border-slate-200"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="editorial-kicker text-[10px]">Data Journalism & Empirical Sentiment</span>
            <span className="text-[var(--border-strong)]">•</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {scope === "local" ? "Browser History" : "Platform Index"}
            </span>
          </div>
          <h1 className="editorial-title text-3xl sm:text-4xl lg:text-5xl text-[var(--text-main)]">
            {scope === "admin" ? "Platform Telemetry & System Health" : "The Emotional Index of Song"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-2xl font-sans leading-relaxed">
            {scope === "local"
              ? "Your personal analysis record compiled on this device with zero tracking and full data sovereignty."
              : scope === "admin"
              ? "Infrastructure health, database latency, and system telemetry across all classification nodes."
              : "Empirical breakdown of lyrical emotion frequencies, language distributions, and classification certainty."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (scope === "community") fetchGlobalAnalytics();
            if (scope === "admin") fetchAdminAnalytics();
          }}
          disabled={loading || scope === "local"}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl theme-well hover:border-purple-500/40 active:scale-95 text-xs font-semibold text-ink-main transition-all self-start md:self-auto ${
            scope === "local" ? "opacity-40 cursor-default" : "disabled:opacity-50"
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400 light:text-purple-600" : ""}`} />
          <span>{scope === "local" ? "Local Live View" : "Refresh Insights"}</span>
        </button>
      </motion.div>

      {/* 2. Interactive Filters Toolbar */}
      <AnalyticsFilters
        scope={scope}
        onScopeChange={setScope}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        mood={mood}
        onMoodChange={setMood}
        artist={artist}
        onArtistChange={setArtist}
        onResetFilters={handleResetFilters}
        availableMoods={activeAnalytics?.availableMoods || []}
        availableArtists={activeAnalytics?.availableArtists || []}
        isAdmin={isAdmin}
        localCount={recentlyAnalyzed.length}
        onClearLocalHistory={handleClearLocalHistory}
      />

      {/* 3. My Activity Privacy & Data Sovereignty Banner (when scope === 'local') */}
      {scope === "local" && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-purple-950/20 light:bg-purple-50 border border-purple-500/30 light:border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-purple-400 light:text-purple-600 shrink-0" />
            <div>
              <span className="font-bold text-purple-300 light:text-purple-900 block">
                Local Browser Storage (Guest-First & Private)
              </span>
              <span className="text-purple-200/80 light:text-purple-800">
                Your analyzed songs are kept strictly on this device. They are not uploaded to the public platform database or shared across devices.
              </span>
            </div>
          </div>
          {recentlyAnalyzed.length > 0 && (
            <button
              type="button"
              onClick={handleClearLocalHistory}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-300 light:text-red-700 border border-red-500/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear My Activity</span>
            </button>
          )}
        </motion.div>
      )}

      {/* 4. VIEW RENDERER */}
      {scope === "admin" ? (
        /* --- ADMIN ANALYTICS VIEW --- */
        <div className="space-y-6">
          {!isAdmin ? (
            <div className="theme-card rounded-3xl p-10 text-center space-y-3 border-rose-500/20">
              <ShieldCheck className="w-8 h-8 text-rose-400 mx-auto" />
              <h3 className="font-display font-bold text-lg text-ink-main">Admin Access Restricted</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Administrative metrics and platform infrastructure telemetry are protected. Please sign in with an authorized admin account.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-2xl theme-card animate-pulse" />
                ))}
              </div>
              <div className="h-64 rounded-3xl theme-card animate-pulse" />
            </div>
          ) : adminError ? (
            <div className="theme-card rounded-3xl p-8 text-center text-rose-400 space-y-2 border-rose-500/20">
              <p className="text-sm font-semibold">{adminError}</p>
              <button
                type="button"
                onClick={fetchAdminAnalytics}
                className="px-4 py-2 rounded-xl theme-well text-xs font-semibold text-ink-main"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Admin KPI Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Database State */}
                <div className="theme-card rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Database Status</span>
                    <Database className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
                  </div>
                  <div className="font-display font-extrabold text-xl text-ink-main flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{adminData?.database?.connected ? "Online" : "Fallback"}</span>
                  </div>
                  <p className="text-[10px] text-ink-dim truncate">{adminData?.database?.provider}</p>
                </div>

                {/* Total Database Analyses */}
                <div className="theme-card rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Total Stored Analyses</span>
                    <Disc3 className="w-4 h-4 text-purple-400 light:text-purple-600" />
                  </div>
                  <div className="font-display font-extrabold text-2xl text-ink-main">
                    {adminData?.metrics?.totalAnalyses || 0}
                  </div>
                  <p className="text-[10px] text-ink-dim">Verified lyrical emotion records</p>
                </div>

                {/* Registered Users */}
                <div className="theme-card rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Registered Accounts</span>
                    <Users className="w-4 h-4 text-sky-400 light:text-sky-600" />
                  </div>
                  <div className="font-display font-extrabold text-2xl text-ink-main">
                    {adminData?.metrics?.totalRegisteredUsers || 0}
                  </div>
                  <p className="text-[10px] text-ink-dim">Anonymized user count</p>
                </div>

                {/* Server Uptime & Memory */}
                <div className="theme-card rounded-2xl p-5 space-y-1">
                  <div className="flex items-center justify-between text-ink-muted">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Runtime & Memory</span>
                    <Server className="w-4 h-4 text-amber-400 light:text-amber-600" />
                  </div>
                  <div className="font-display font-extrabold text-lg text-ink-main">
                    {adminData?.system?.memoryMb || 0} MB <span className="text-xs text-ink-muted font-normal">Heap</span>
                  </div>
                  <p className="text-[10px] text-ink-dim">
                    Uptime: {Math.floor((adminData?.system?.uptimeSeconds || 0) / 60)}m | Node {adminData?.system?.nodeVersion}
                  </p>
                </div>
              </div>

              {/* Platform Emotion Breakdown */}
              <div className="theme-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200">
                  <h3 className="font-display font-bold text-base text-ink-main">
                    Platform Emotion Distribution (Database Totals)
                  </h3>
                  <span className="text-xs text-ink-muted font-mono">All 9 Calibrated Moods</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {ALL_MOODS.map((m) => {
                    const count = adminData?.metrics?.emotionBreakdown?.[m] || 0;
                    const meta = MOOD_DEFINITIONS[m] || { emoji: "☀️", color: "#f59e0b" };
                    return (
                      <div key={m} className="theme-well p-3.5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.emoji}</span>
                          <span className="text-xs font-semibold text-ink-main">{m}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-purple-400 light:text-purple-600">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Analyses Audit Log */}
              <div className="theme-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200">
                  <h3 className="font-display font-bold text-base text-ink-main">
                    Recent Platform Analyses (Anonymized Telemetry)
                  </h3>
                  <span className="text-xs text-ink-muted font-mono">Last 10 Records</span>
                </div>

                {(!adminData?.recentActivity || adminData.recentActivity.length === 0) ? (
                  <p className="text-xs text-ink-dim py-6 text-center">No platform analyses logged yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 light:border-slate-200 text-ink-muted uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Artist</th>
                          <th className="py-2.5 px-3">Detected Mood</th>
                          <th className="py-2.5 px-3">Confidence</th>
                          <th className="py-2.5 px-3">Language</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 light:divide-slate-100">
                        {adminData.recentActivity.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/5 light:hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-ink-main">{item.title}</td>
                            <td className="py-2.5 px-3 text-ink-secondary">{item.artist}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 light:text-purple-700">
                                {item.mood}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 light:text-emerald-600">
                              {item.confidence}%
                            </td>
                            <td className="py-2.5 px-3 text-ink-dim font-mono">{item.language || "English"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* --- GLOBAL & MY ACTIVITY VIEWS --- */
        <div className="space-y-8">
          {/* KPI Metrics Overview (5 Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Songs Analyzed */}
            <div className="theme-card rounded-2xl p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-ink-muted">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Analyzed Tracks</span>
                <Disc3 className="w-4 h-4 text-purple-400 light:text-purple-600" />
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-ink-main">
                {loading ? "..." : kpi.totalAnalyses || 0}
              </div>
              <p className="text-[10px] text-ink-dim">
                {scope === "local" ? "On this browser device" : "Across platform catalog"}
              </p>
            </div>

            {/* Most Frequently Detected Emotion */}
            <div className="theme-card rounded-2xl p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-ink-muted">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Dominant Mood</span>
                <span className="text-base select-none">{topMoodDef?.emoji || "☀️"}</span>
              </div>
              <div className="font-display font-extrabold text-xl sm:text-2xl text-ink-main truncate">
                {loading ? "..." : kpi.mostFrequentlyDetectedEmotion || "None"}
              </div>
              <p className="text-[10px] text-ink-dim">
                {kpi.mostFrequentCount ? `${kpi.mostFrequentCount} matching tracks` : "Dominant emotional signature"}
              </p>
            </div>

            {/* Unique Artists */}
            <div className="theme-card rounded-2xl p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-ink-muted">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Artists Explored</span>
                <Users className="w-4 h-4 text-amber-400 light:text-amber-600" />
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-ink-main">
                {loading ? "..." : kpi.uniqueArtistsCount || 0}
              </div>
              <p className="text-[10px] text-ink-dim">Distinct artists in library</p>
            </div>

            {/* Average Model Confidence */}
            <div className="theme-card rounded-2xl p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-ink-muted">
                <span className="text-[11px] font-semibold uppercase tracking-wider">AI Confidence</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-400 light:text-emerald-600">
                {loading ? "..." : `${kpi.averageConfidence || 0}%`}
              </div>
              <p className="text-[10px] text-ink-dim">Average classification accuracy</p>
            </div>

            {/* Active View Indicator */}
            <div className="col-span-2 lg:col-span-1 theme-card rounded-2xl p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-ink-muted">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Scope</span>
                <Activity className="w-4 h-4 text-sky-400 light:text-sky-600" />
              </div>
              <div className="font-display font-extrabold text-lg sm:text-xl text-ink-main capitalize">
                {scope === "local" ? "My Activity" : "Global"}
              </div>
              <p className="text-[10px] text-ink-dim truncate">
                {scope === "local" ? "Private to this device" : "Collective benchmarks"}
              </p>
            </div>
          </div>

          {/* Empty State for My Activity */}
          {scope === "local" && kpi.totalAnalyses === 0 && (
            <div className="theme-card rounded-3xl p-10 text-center space-y-3 border-purple-500/20">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
              <h3 className="font-display font-bold text-lg text-ink-main">No Local Activity Recorded Yet</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                You haven't analyzed any song lyrics in this browser session yet. Analyze any song from the Analyze tab to build your personal emotional insights right on this device.
              </p>
              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze Song Lyrics Now</span>
                </Link>
              </div>
            </div>
          )}

          {/* Interactive Charts Section */}
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 h-[340px] rounded-3xl theme-card animate-pulse" />
                <div className="lg:col-span-7 h-[340px] rounded-3xl theme-card animate-pulse" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-6 h-[340px] rounded-3xl theme-card animate-pulse" />
                <div className="lg:col-span-6 h-[340px] rounded-3xl theme-card animate-pulse" />
              </div>
              <div className="h-[300px] rounded-3xl theme-card animate-pulse" />
            </div>
          ) : error ? (
            <div className="theme-card rounded-3xl p-10 border-red-500/20 text-center space-y-3">
              <p className="text-sm text-red-300 light:text-red-700">{error}</p>
              <button
                type="button"
                onClick={fetchGlobalAnalytics}
                className="px-4 py-2 rounded-xl theme-well text-xs font-semibold text-ink-main hover:border-purple-500/40"
              >
                Retry
              </button>
            </div>
          ) : (
            (scope !== "local" || kpi.totalAnalyses > 0) && (
              <div className="space-y-8">
                {/* 1. Personal Emotional Journey Section (My Activity view only) */}
                {scope === "local" && (
                  <PersonalJourneySection
                    recentlyAnalyzed={filteredLocalItems}
                    kpi={kpi}
                    languageDistribution={activeAnalytics?.languageDistribution || []}
                  />
                )}

                {/* 2. Charts Row 1: Primary Mood Distribution Doughnut & Trends Line Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5">
                    <MoodDoughnutChart
                      distribution={activeAnalytics?.moodDistribution || []}
                      totalAnalyses={kpi.totalAnalyses || 0}
                    />
                  </div>

                  <div className="lg:col-span-7">
                    <MoodTrendsChart trends={activeAnalytics?.trends || {}} />
                  </div>
                </div>

                {/* 3. Charts Row 2: Secondary Emotion Dynamics & Language Distribution (NEW PHASE 2) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6">
                    <SecondaryEmotionChart
                      secondaryDistribution={activeAnalytics?.secondaryEmotionDistribution || []}
                      totalAnalyses={kpi.totalAnalyses || 0}
                      topSecondaryMood={kpi.mostFrequentSecondaryEmotion}
                    />
                  </div>

                  <div className="lg:col-span-6">
                    <LanguageDistributionChart
                      distribution={activeAnalytics?.languageDistribution || []}
                      totalAnalyses={kpi.totalAnalyses || 0}
                    />
                  </div>
                </div>

                {/* 4. Charts Row 3: Emotion Comparison Bar Chart */}
                <div>
                  <EmotionComparisonChart
                    emotionComparison={activeAnalytics?.emotionComparison || []}
                  />
                </div>

                {/* 5. Charts Row 4: Artist Analytics Section */}
                <div>
                  <ArtistAnalyticsSection
                    topArtists={activeAnalytics?.artistAnalytics?.topArtists || []}
                    topSongs={activeAnalytics?.artistAnalytics?.topSongs || []}
                    totalAnalyses={kpi.totalAnalyses || 0}
                  />
                </div>

                {/* 6. Charts Row 5: Confidence Analytics Section */}
                <div>
                  <ConfidenceAnalyticsSection
                    confidenceAnalytics={activeAnalytics?.confidenceAnalytics || {}}
                  />
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
