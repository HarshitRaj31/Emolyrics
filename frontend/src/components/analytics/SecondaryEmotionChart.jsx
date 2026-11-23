import { Sparkles, Info, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

export default function SecondaryEmotionChart({
  secondaryDistribution = [],
  totalAnalyses = 0,
  topSecondaryMood = "None"
}) {
  const { isDark } = useTheme();
  const maxCount = Math.max(...secondaryDistribution.map((d) => d.count), 1);
  const activeCount = secondaryDistribution.filter((d) => d.count > 0).length;

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 light:border-slate-900/10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400 light:text-purple-600" />
            <h3 className="font-display font-bold text-lg text-ink-main">
              Secondary Emotion Dynamics
            </h3>
          </div>
          <p className="text-xs text-ink-muted">
            Highest-scoring co-occurring emotional nuance detected alongside primary moods
          </p>
        </div>

        {topSecondaryMood && topSecondaryMood !== "None" && (
          <span className="text-xs font-mono text-purple-300 light:text-purple-700 bg-purple-500/15 light:bg-purple-100 border border-purple-500/30 light:border-purple-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Top Secondary: {topSecondaryMood}</span>
          </span>
        )}
      </div>

      {/* Secondary Emotion Cards Grid */}
      {totalAnalyses === 0 || secondaryDistribution.length === 0 ? (
        <div className="py-12 text-center text-xs text-ink-dim">
          No secondary emotion records available for this view.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
          {secondaryDistribution.map((item, idx) => {
            const hasData = item.count > 0;
            const barWidth = Math.round((item.count / maxCount) * 100);

            return (
              <motion.div
                key={item.mood || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className={`p-3.5 rounded-2xl border transition-all ${
                  hasData
                    ? "theme-card border-white/10 light:border-slate-200 hover:border-purple-500/30"
                    : "opacity-45 bg-white/5 light:bg-slate-100/50 border-dashed border-white/10 light:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base select-none">{item.emoji || "🎵"}</span>
                    <span className="font-semibold text-ink-main truncate max-w-[90px]">
                      {item.mood}
                    </span>
                  </div>

                  <span
                    className="font-mono font-bold text-[11px] px-1.5 py-0.2 rounded"
                    style={{
                      color: item.color || "#8b5cf6",
                      backgroundColor: `${item.color || "#8b5cf6"}18`
                    }}
                  >
                    {item.percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-white/5 light:bg-slate-200 overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color || "#8b5cf6" }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-ink-dim">
                  <span>Sub-tone match</span>
                  <span className="font-mono font-semibold">{item.count} tracks</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Explanatory Footnote */}
      <div className="p-3 rounded-2xl bg-purple-950/20 light:bg-purple-50 border border-purple-500/20 light:border-purple-200 flex items-start gap-2.5 text-[11px] text-purple-200/90 light:text-purple-800 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-purple-400 light:text-purple-600 shrink-0 mt-0.5" />
        <span>
          Extracted directly from the multi-class probability scores across all 9 trained emotion categories. Captures nuanced emotional depth beyond the primary classification.
        </span>
      </div>
    </div>
  );
}
