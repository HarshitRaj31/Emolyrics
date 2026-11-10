import { useState, useEffect, useCallback } from "react";
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
  ShieldCheck
} from "lucide-react";
import { api } from "../services/api";
import { MOOD_DEFINITIONS } from "../data/examples";
import MoodDoughnutChart from "../components/analytics/MoodDoughnutChart";
import MoodTrendsChart from "../components/analytics/MoodTrendsChart";
import EmotionComparisonChart from "../components/analytics/EmotionComparisonChart";
import ArtistAnalyticsSection from "../components/analytics/ArtistAnalyticsSection";
import ConfidenceAnalyticsSection from "../components/analytics/ConfidenceAnalyticsSection";
import AnalyticsFilters from "../components/analytics/AnalyticsFilters";

export default function AnalyticsPage() {
  // Filters State
  const [scope, setScope] = useState("community");
  const [timeframe, setTimeframe] = useState("all");
  const [mood, setMood] = useState("All");
  const [artist, setArtist] = useState("All");

  // Analytics Data State
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.getAnalytics({
        scope: "community",
        timeframe,
        mood,
        artist
      });

      if (data.success) {
        setAnalytics(data);
      } else {
        setError(data.message || "Failed to load analytics.");
      }
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError(err.message || "Failed to load mood analytics.");
    } finally {
      setLoading(false);
    }
  }, [timeframe, mood, artist]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setTimeframe("all");
    setMood("All");
    setArtist("All");
    if (user) setScope("mine");
  };

  const kpi = analytics?.kpi || {};
  const topMoodDef = kpi.mostFrequentlyDetectedEmotion
    ? MOOD_DEFINITIONS[kpi.mostFrequentlyDetectedEmotion]
    : null;

  return (
    <div className="min-h-[calc(100vh-65px)] pb-24 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* 1. Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Interactive Dashboard
            </span>
            <span className="text-xs text-neutral-500 font-mono">NLP Analytics Engine</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Lyrical Mood Analytics
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Exploratory intelligence across verified natural language song lyrics classifications,
            measuring emotional valence, temporal trends, artist distributions, and model confidence.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white transition-all self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
          <span>Refresh Data</span>
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
        availableMoods={analytics?.availableMoods || []}
        availableArtists={analytics?.availableArtists || []}
        isAuthenticated={false}
      />

      {/* 3. KPI Metrics Overview (5 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Songs Analyzed */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Songs</span>
            <Disc3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            {loading ? "..." : kpi.totalAnalyses || 0}
          </div>
          <p className="text-[10px] text-neutral-500">Verified classifications</p>
        </div>

        {/* Most Frequently Detected Emotion */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Emotion</span>
            <span className="text-base select-none">{topMoodDef?.emoji || "☀️"}</span>
          </div>
          <div className="font-display font-extrabold text-xl sm:text-2xl text-white truncate">
            {loading ? "..." : kpi.mostFrequentlyDetectedEmotion || "None"}
          </div>
          <p className="text-[10px] text-neutral-500">
            {kpi.mostFrequentCount ? `${kpi.mostFrequentCount} matching tracks` : "Dominant mood"}
          </p>
        </div>

        {/* Unique Artists */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Unique Artists</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            {loading ? "..." : kpi.uniqueArtistsCount || 0}
          </div>
          <p className="text-[10px] text-neutral-500">Distinct artists analyzed</p>
        </div>

        {/* Average Model Confidence */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Confidence</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-400">
            {loading ? "..." : `${kpi.averageConfidence || 0}%`}
          </div>
          <p className="text-[10px] text-neutral-500">Mean linguistic certainty</p>
        </div>

        {/* Recent Activity Count / Scope */}
        <div className="col-span-2 lg:col-span-1 glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Scope Active</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="font-display font-extrabold text-lg sm:text-xl text-white capitalize">
            {scope === "mine" ? "Personal" : "Community"}
          </div>
          <p className="text-[10px] text-neutral-500 truncate">
            {kpi.recentActivity?.length || 0} recent stream events
          </p>
        </div>
      </div>

      {/* 4. Interactive Charts Section */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-[340px] rounded-3xl bg-white/5 animate-pulse" />
            <div className="lg:col-span-7 h-[340px] rounded-3xl bg-white/5 animate-pulse" />
          </div>
          <div className="h-[300px] rounded-3xl bg-white/5 animate-pulse" />
        </div>
      ) : error ? (
        <div className="glass-panel rounded-3xl p-10 border border-red-500/20 text-center space-y-3">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
          >
            Retry Analytics
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Charts Row 1: Mood Distribution Doughnut (col-span-5) & Trends Line Chart (col-span-7) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5">
              <MoodDoughnutChart
                distribution={analytics.moodDistribution || []}
                totalAnalyses={kpi.totalAnalyses || 0}
              />
            </div>

            <div className="lg:col-span-7">
              <MoodTrendsChart trends={analytics.trends || {}} />
            </div>
          </div>

          {/* Charts Row 2: Emotion Comparison Bar Chart */}
          <div>
            <EmotionComparisonChart
              emotionComparison={analytics.emotionComparison || []}
            />
          </div>

          {/* Charts Row 3: Artist Analytics Section */}
          <div>
            <ArtistAnalyticsSection
              topArtists={analytics.artistAnalytics?.topArtists || []}
              topSongs={analytics.artistAnalytics?.topSongs || []}
              totalAnalyses={kpi.totalAnalyses || 0}
            />
          </div>

          {/* Charts Row 4: Confidence Analytics Section */}
          <div>
            <ConfidenceAnalyticsSection
              confidenceAnalytics={analytics.confidenceAnalytics || {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}

