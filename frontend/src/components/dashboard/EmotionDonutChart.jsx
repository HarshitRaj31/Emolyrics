import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Sparkles, Filter, Check } from "lucide-react";

export default function EmotionDonutChart({
  distribution = {},
  primaryEmotion = "Happiness",
  primaryMeta = {},
  lines = [],
  selectedFilter = "All",
  onSelectFilter
}) {
  const [hoveredEmotion, setHoveredEmotion] = useState(null);

  // SVG Geometry Constants
  const size = 260;
  const center = size / 2;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;

  // Count lines for each emotion
  const lineCountsByEmotion = useMemo(() => {
    const counts = {};
    lines.forEach((l) => {
      if (!l.isSectionHeader && l.emotion) {
        counts[l.emotion] = (counts[l.emotion] || 0) + 1;
      }
    });
    return counts;
  }, [lines]);

  // Color map for the 10 emotions
  const emotionColors = useMemo(
    () => ({
      Happiness: "#f59e0b",
      Sadness: "#3b82f6",
      Love: "#ec4899",
      Anger: "#ef4444",
      Nostalgia: "#8b5cf6",
      Fear: "#6366f1",
      Excitement: "#f97316",
      Hope: "#06b6d4",
      Loneliness: "#64748b",
      Calmness: "#10b981"
    }),
    []
  );

  const emotionEmojis = useMemo(
    () => ({
      Happiness: "☀️",
      Sadness: "🌧️",
      Love: "💖",
      Anger: "🔥",
      Nostalgia: "⏳",
      Fear: "👻",
      Excitement: "⚡",
      Hope: "🌅",
      Loneliness: "🥀",
      Calmness: "🌿"
    }),
    []
  );

  // Active items with percentage > 0, sorted descending (primary first)
  const activeEntries = useMemo(() => {
    return Object.entries(distribution)
      .filter(([_, pct]) => pct > 0)
      .sort((a, b) => {
        if (a[0] === primaryEmotion) return -1;
        if (b[0] === primaryEmotion) return 1;
        return b[1] - a[1];
      });
  }, [distribution, primaryEmotion]);

  // Compute stroke lengths & cumulative offsets
  const segments = useMemo(() => {
    let accumulated = 0;
    return activeEntries.map(([emotion, pct]) => {
      const fraction = pct / 100;
      const strokeLength = fraction * circumference;
      const dashoffset = -accumulated;
      accumulated += strokeLength;

      return {
        emotion,
        percentage: pct,
        fraction,
        strokeLength,
        dashoffset,
        color: emotionColors[emotion] || "#a855f7",
        emoji: emotionEmojis[emotion] || "🎵",
        lineCount: lineCountsByEmotion[emotion] || 0,
        isPrimary: emotion === primaryEmotion
      };
    });
  }, [activeEntries, circumference, emotionColors, emotionEmojis, lineCountsByEmotion, primaryEmotion]);

  // Currently active item for center display (hovered or selected or primary)
  const activeFocus = useMemo(() => {
    if (hoveredEmotion) {
      return segments.find((s) => s.emotion === hoveredEmotion);
    }
    if (selectedFilter !== "All") {
      return segments.find((s) => s.emotion === selectedFilter);
    }
    return segments.find((s) => s.isPrimary) || segments[0];
  }, [hoveredEmotion, selectedFilter, segments]);

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-neutral-900/80 border border-white/10 shadow-xl flex flex-col justify-between space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-purple-400" />
          <h3 className="font-display font-bold text-base text-white">
            Emotion Distribution Donut
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
          {activeEntries.length} Detected Emotions
        </span>
      </div>

      {/* Donut Chart & Legend Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: SVG Donut (7 cols on md) */}
        <div className="md:col-span-6 flex items-center justify-center relative">
          <div className="relative w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] shrink-0">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full -rotate-90 transform overflow-visible"
            >
              {/* Background Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="24"
              />

              {/* Data Segments */}
              {segments.map((seg) => {
                const isHovered = hoveredEmotion === seg.emotion;
                const isSelected = selectedFilter === seg.emotion;
                const isPrimary = seg.isPrimary;

                return (
                  <circle
                    key={seg.emotion}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered || isSelected ? 30 : isPrimary ? 26 : 22}
                    strokeDasharray={`${Math.max(seg.strokeLength - 1.5, 0.5)} ${circumference - Math.max(seg.strokeLength - 1.5, 0.5)}`}
                    strokeDashoffset={seg.dashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      filter:
                        isHovered || isSelected
                          ? `drop-shadow(0 0 10px ${seg.color}90)`
                          : isPrimary
                          ? `drop-shadow(0 0 6px ${seg.color}50)`
                          : "none",
                      opacity:
                        hoveredEmotion && !isHovered && !isSelected ? 0.45 : 1
                    }}
                    onMouseEnter={() => setHoveredEmotion(seg.emotion)}
                    onMouseLeave={() => setHoveredEmotion(null)}
                    onClick={() =>
                      onSelectFilter &&
                      onSelectFilter(selectedFilter === seg.emotion ? "All" : seg.emotion)
                    }
                  />
                );
              })}
            </svg>

            {/* Central Callout (Center of Donut) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
              <AnimatePresence mode="wait">
                {activeFocus ? (
                  <motion.div
                    key={activeFocus.emotion}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-0.5"
                  >
                    <span className="text-3xl select-none block">
                      {activeFocus.emoji}
                    </span>
                    <span className="font-display font-black text-xl text-white block leading-tight">
                      {activeFocus.percentage}%
                    </span>
                    <span
                      className="font-bold text-xs block truncate max-w-[120px]"
                      style={{ color: activeFocus.color }}
                    >
                      {activeFocus.emotion}
                    </span>
                    <span className="text-[10px] text-neutral-400 block font-mono">
                      {activeFocus.isPrimary ? "Primary Emotion" : `${activeFocus.lineCount} lines`}
                    </span>
                  </motion.div>
                ) : (
                  <div className="text-xs text-neutral-400">
                    Hover segment to inspect
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right: Interactive Legend & Filter List (6 cols on md) */}
        <div className="md:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Emotion Legend (Click to filter)
            </span>
            {selectedFilter !== "All" && (
              <button
                type="button"
                onClick={() => onSelectFilter && onSelectFilter("All")}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {segments.map((seg) => {
              const isHovered = hoveredEmotion === seg.emotion;
              const isSelected = selectedFilter === seg.emotion;

              return (
                <div
                  key={seg.emotion}
                  onMouseEnter={() => setHoveredEmotion(seg.emotion)}
                  onMouseLeave={() => setHoveredEmotion(null)}
                  onClick={() =>
                    onSelectFilter &&
                    onSelectFilter(selectedFilter === seg.emotion ? "All" : seg.emotion)
                  }
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-purple-600/20 border-purple-500/50 shadow-sm"
                      : isHovered
                      ? "bg-white/10 border-white/20"
                      : "bg-white/5 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-sm select-none">{seg.emoji}</span>
                    <span className="font-semibold text-neutral-200 truncate">
                      {seg.emotion}
                    </span>
                    {seg.isPrimary && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 font-bold">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    <span className="font-bold text-white">{seg.percentage}%</span>
                    <span className="text-neutral-500 text-[10px]">({seg.lineCount}L)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip Footer Note */}
      <div className="text-[11px] text-neutral-400 pt-2 border-t border-white/5 flex items-center justify-between">
        <span>Click any donut segment or legend row to filter lyrics and timeline</span>
        <span className="font-mono text-neutral-500 text-[10px]">
          100% Normalized Distribution
        </span>
      </div>
    </div>
  );
}

