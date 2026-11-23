import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Compass,
  Sparkles,
  Calendar,
  Languages,
  ShieldCheck,
  Music2,
  Clock,
  Layers,
  ArrowRight
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle } from "../../utils/emotionTheme";

export default function PersonalJourneySection({
  recentlyAnalyzed = [],
  kpi = {},
  languageDistribution = []
}) {
  const { isDark } = useTheme();

  if (!recentlyAnalyzed || recentlyAnalyzed.length === 0) {
    return (
      <div className="theme-card rounded-3xl p-10 text-center space-y-4 border-purple-500/20">
        <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
        <h3 className="font-display font-bold text-lg text-ink-main">
          Begin Your Emotional Journey
        </h3>
        <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
          Analyze songs from the Analyze tab to build your private lyrical emotion timeline right on this device.
        </p>
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze Song Lyrics</span>
          </Link>
        </div>
      </div>
    );
  }

  const topLanguage = kpi.topLanguage || "English";
  const dominantMood = kpi.mostFrequentlyDetectedEmotion || "Happy";
  const secondaryMood = kpi.mostFrequentSecondaryEmotion || "None";

  return (
    <div className="theme-card rounded-3xl p-6 shadow-xl space-y-6">
      {/* 1. Header & Journey Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 light:border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 light:text-purple-600 mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Personal Emotional Journey</span>
          </div>
          <h3 className="font-display font-bold text-xl text-ink-main">
            Lyrical Evolution Over Time
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Chronological emotional arc and multi-language trajectory across your recent local analyses
          </p>
        </div>

        {/* Journey Arc Highlights */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-well text-xs font-semibold text-ink-main">
            <span className="text-base select-none">☀️</span>
            <span>Dominant: <strong className="text-purple-400 light:text-purple-600">{dominantMood}</strong></span>
          </div>

          {secondaryMood && secondaryMood !== "None" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-well text-xs font-semibold text-ink-main">
              <Layers className="w-3.5 h-3.5 text-pink-400" />
              <span>Sub-tone: <strong className="text-pink-400 light:text-pink-600">{secondaryMood}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-well text-xs font-semibold text-ink-main">
            <Languages className="w-3.5 h-3.5 text-sky-400" />
            <span>Primary Lang: <strong className="text-sky-400 light:text-sky-600">{topLanguage}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Chronological Track Stream */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          <span>Timeline of Analyzed Tracks ({recentlyAnalyzed.length})</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {recentlyAnalyzed.map((item, idx) => {
            const hasSecondary = Boolean(item.secondaryMood);
            const dateFormatted = item.timestamp
              ? new Date(item.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "Recent";

            return (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className="p-4 rounded-2xl theme-well hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-3"
              >
                {/* Title & Artist */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-ink-dim mb-1 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{dateFormatted}</span>
                    </span>
                    <span className="text-emerald-400 font-bold">{item.confidence || 90}% AI Conf</span>
                  </div>

                  <h5 className="font-display font-bold text-sm text-ink-main truncate" title={item.title}>
                    {item.title}
                  </h5>
                  <p className="text-xs text-ink-muted truncate" title={item.artist}>
                    {item.artist || "Unknown Artist"}
                  </p>
                </div>

                {/* Badges: Primary, Secondary, Language */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5 light:border-slate-200 text-xs">
                  {/* Primary Emotion Badge */}
                  <span
                    className="px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 border"
                    style={getEmotionBadgeStyle(item.mood, isDark)}
                  >
                    <span>{item.emoji || "🎵"}</span>
                    <span>{item.mood}</span>
                  </span>

                  {/* Secondary Emotion Badge */}
                  {hasSecondary && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/15 text-pink-300 light:text-pink-700 border border-pink-500/25 flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" />
                      <span>+ {item.secondaryMood}</span>
                    </span>
                  )}

                  {/* Language Badge */}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 light:bg-slate-200 text-ink-secondary border border-white/10 light:border-slate-300 ml-auto flex items-center gap-1">
                    <Languages className="w-2.5 h-2.5 text-sky-400" />
                    <span>{item.language || "English"}</span>
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
