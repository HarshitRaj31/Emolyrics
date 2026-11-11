import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle, getEmotionToken } from "../../utils/emotionTheme";

export default function MoodDoughnutChart({ distribution = [], totalAnalyses = 0 }) {
  const { isDark } = useTheme();
  const [hoveredMood, setHoveredMood] = useState(null);

  // SVG dimensions
  const size = 260;
  const center = size / 2;
  const radius = 78;
  const circumference = 2 * Math.PI * radius;

  // Active items with count > 0
  const activeItems = distribution.filter((item) => item.count > 0);
  const totalCount = activeItems.reduce((acc, curr) => acc + curr.count, 0) || totalAnalyses || 0;

  // Compute stroke offsets
  let accumulatedLength = 0;
  const segments = activeItems.map((item) => {
    const fraction = totalCount > 0 ? item.count / totalCount : 0;
    const strokeLength = fraction * circumference;
    const dashoffset = -accumulatedLength;
    accumulatedLength += strokeLength;

    return {
      ...item,
      fraction,
      strokeLength,
      dashoffset
    };
  });

  const activeHover = hoveredMood
    ? segments.find((s) => s.mood === hoveredMood) || distribution.find((d) => d.mood === hoveredMood)
    : null;

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-900/10">
        <div>
          <h3 className="font-display font-bold text-lg text-ink-main">Mood Distribution</h3>
          <p className="text-xs text-ink-muted">
            Proportional representation of all 9 trained emotion categories
          </p>
        </div>
        <span className="text-xs font-mono text-purple-300 light:text-purple-700 bg-purple-500/15 light:bg-purple-100 border border-purple-500/30 light:border-purple-200 px-2.5 py-0.5 rounded-full">
          {totalCount} Songs
        </span>
      </div>

      {/* Doughnut SVG & Center Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
        <div className="relative w-[260px] h-[260px] shrink-0">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full -rotate-90 transform overflow-visible"
          >
            {/* Background Base Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--chart-track)"
              strokeWidth="24"
            />

            {/* Segments */}
            {segments.map((segment) => {
              const isHovered = hoveredMood === segment.mood;
              return (
                <circle
                  key={segment.mood}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={segment.color || "#a855f7"}
                  strokeWidth={isHovered ? "32" : "24"}
                  strokeDasharray={`${segment.strokeLength} ${circumference - segment.strokeLength}`}
                  strokeDashoffset={segment.dashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: isHovered
                      ? `drop-shadow(0 0 12px ${segment.color}80)`
                      : "none"
                  }}
                  onMouseEnter={() => setHoveredMood(segment.mood)}
                  onMouseLeave={() => setHoveredMood(null)}
                />
              );
            })}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            <AnimatePresence mode="wait">
              {activeHover ? (
                <motion.div
                  key={activeHover.mood}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-0.5"
                >
                  <span className="text-2xl select-none">{activeHover.emoji}</span>
                  <div className="font-display font-extrabold text-xl text-ink-main truncate max-w-[140px]">
                    {activeHover.mood}
                  </div>
                  <div
                    className="font-display font-bold text-lg"
                    style={{ color: isDark ? getEmotionToken(activeHover.mood).darkText : getEmotionToken(activeHover.mood).lightText }}
                  >
                    {activeHover.percentage}%
                  </div>
                  <span className="text-[11px] text-ink-muted font-mono">
                    {activeHover.count} songs
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-0.5"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    Total Songs
                  </span>
                  <div className="font-display font-extrabold text-3xl text-ink-main">
                    {totalCount}
                  </div>
                  <span className="text-[10px] text-ink-dim">Hover for details</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 flex-1 max-w-xs w-full text-xs">
          {distribution.map((item) => {
            const isHovered = hoveredMood === item.mood;
            return (
              <div
                key={item.mood}
                onMouseEnter={() => setHoveredMood(item.mood)}
                onMouseLeave={() => setHoveredMood(null)}
                className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? "bg-white/10 light:bg-slate-900/10 border-white/30 light:border-slate-900/25 shadow-md scale-102"
                    : "theme-well hover:border-white/15 light:hover:border-slate-900/20"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm select-none">{item.emoji}</span>
                  <span className="font-medium text-ink-main truncate">{item.mood}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="text-ink-muted">{item.count}</span>
                  <span
                    className="font-bold text-[11px] px-1.5 py-0.2 rounded border"
                    style={getEmotionBadgeStyle(item.mood, isDark)}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

