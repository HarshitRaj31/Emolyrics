import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CheckSquare, Square } from "lucide-react";

export default function EmotionComparisonChart({ emotionComparison = [] }) {
  // Multi-select active emotions (default: all)
  const [selectedMoods, setSelectedMoods] = useState(() =>
    emotionComparison.map((e) => e.mood)
  );

  const [hoveredBar, setHoveredBar] = useState(null);

  // Toggle selection
  const toggleMood = (mood) => {
    setSelectedMoods((prev) => {
      if (prev.includes(mood)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((m) => m !== mood);
      }
      return [...prev, mood];
    });
  };

  const selectAll = () => setSelectedMoods(emotionComparison.map((e) => e.mood));

  // Filtered comparison items
  const activeItems = useMemo(() => {
    return emotionComparison.filter((item) => selectedMoods.includes(item.mood));
  }, [emotionComparison, selectedMoods]);

  // Chart dimensions
  const width = 720;
  const height = 260;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 45;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const maxCount = useMemo(() => {
    if (activeItems.length === 0) return 10;
    const max = Math.max(...activeItems.map((d) => d.count || 0), 1);
    return Math.ceil(max * 1.2);
  }, [activeItems]);

  const barWidth = useMemo(() => {
    if (activeItems.length === 0) return 30;
    const available = innerWidth / activeItems.length;
    return Math.min(Math.max(available * 0.6, 20), 48);
  }, [activeItems, innerWidth]);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h3 className="font-display font-bold text-lg text-white">Emotion Frequency Comparison</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Side-by-side volume and average confidence comparison across selected emotions
          </p>
        </div>

        <button
          type="button"
          onClick={selectAll}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <span>Select All 9 Emotions</span>
        </button>
      </div>

      {/* Multi-Select Emotion Filter Pills */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {emotionComparison.map((item) => {
          const isSelected = selectedMoods.includes(item.mood);
          return (
            <button
              key={item.mood}
              type="button"
              onClick={() => toggleMood(item.mood)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isSelected
                  ? "bg-white/15 text-white border border-white/20 shadow-sm"
                  : "bg-white/[0.02] text-neutral-500 border border-transparent hover:bg-white/5 hover:text-neutral-300"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isSelected ? item.color : "#525252" }}
              />
              <span>{item.emoji}</span>
              <span>{item.mood}</span>
            </button>
          );
        })}
      </div>

      {/* SVG Bar Chart */}
      {activeItems.length === 0 ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          No emotions selected for comparison. Please select at least one emotion above.
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
            {/* Grid Lines */}
            {[0, Math.round(maxCount / 2), maxCount].map((val, idx) => {
              const yPos = paddingTop + innerHeight - (val / maxCount) * innerHeight;
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={width - paddingRight}
                    y2={yPos}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={yPos + 4}
                    fill="#737373"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {activeItems.map((item, idx) => {
              const step = innerWidth / activeItems.length;
              const xPos = paddingLeft + idx * step + (step - barWidth) / 2;
              const barHeight = Math.max((item.count / maxCount) * innerHeight, 4);
              const yPos = paddingTop + innerHeight - barHeight;
              const isHovered = hoveredBar?.mood === item.mood;

              return (
                <g key={item.mood}>
                  {/* Bar Rect */}
                  <rect
                    x={xPos}
                    y={yPos}
                    width={barWidth}
                    height={barHeight}
                    rx="8"
                    fill={item.color || "#a855f7"}
                    opacity={isHovered ? 1 : 0.85}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      filter: isHovered
                        ? `drop-shadow(0 0 10px ${item.color}90)`
                        : "none"
                    }}
                    onMouseEnter={() => setHoveredBar({ ...item, x: xPos + barWidth / 2, y: yPos })}
                    onMouseLeave={() => setHoveredBar(null)}
                  />

                  {/* Count Number on Top of Bar */}
                  <text
                    x={xPos + barWidth / 2}
                    y={yPos - 6}
                    fill={isHovered ? "#ffffff" : "#a3a3a3"}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {item.count}
                  </text>

                  {/* Emotion Label on X Axis */}
                  <text
                    x={xPos + barWidth / 2}
                    y={height - 12}
                    fill="#d4d4d4"
                    fontSize="10"
                    fontWeight="500"
                    textAnchor="middle"
                  >
                    {item.emoji} {item.mood.split("/")[0]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredBar && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                left: `${(hoveredBar.x / width) * 100}%`,
                top: `${(hoveredBar.y / height) * 100 - 30}%`
              }}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-20"
            >
              <div className="bg-neutral-900 border border-white/20 rounded-2xl px-3.5 py-2.5 shadow-2xl text-xs space-y-1 backdrop-blur-md min-w-[140px]">
                <div className="flex items-center gap-1.5 font-bold text-white pb-1 border-b border-white/10">
                  <span>{hoveredBar.emoji}</span>
                  <span>{hoveredBar.mood}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-300">
                  <span>Count:</span>
                  <span className="font-mono font-bold text-white">{hoveredBar.count} songs</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-300">
                  <span>Frequency:</span>
                  <span className="font-mono text-purple-300">{hoveredBar.percentage}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-300">
                  <span>Avg Confidence:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {hoveredBar.averageConfidence}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

