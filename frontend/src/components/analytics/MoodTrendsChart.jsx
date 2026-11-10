import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Calendar, ChevronRight } from "lucide-react";

export default function MoodTrendsChart({ trends = { daily: [], weekly: [], monthly: [] } }) {
  const [viewMode, setViewMode] = useState("daily"); // 'daily' | 'weekly' | 'monthly'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const rawData = useMemo(() => {
    if (viewMode === "weekly") return trends.weekly || [];
    if (viewMode === "monthly") return trends.monthly || [];
    return trends.daily || [];
  }, [viewMode, trends]);

  // Chart dimensions
  const width = 720;
  const height = 240;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 45;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  // Max value for Y scale
  const maxTotal = useMemo(() => {
    if (!rawData || rawData.length === 0) return 10;
    const max = Math.max(...rawData.map((d) => d.total || 0), 1);
    return Math.ceil(max * 1.25);
  }, [rawData]);

  // Coordinates calculation
  const points = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const count = rawData.length;
    const step = count > 1 ? innerWidth / (count - 1) : innerWidth / 2;

    return rawData.map((d, i) => {
      const x = paddingLeft + (count > 1 ? i * step : innerWidth / 2);
      const y = paddingTop + innerHeight - (d.total / maxTotal) * innerHeight;
      return {
        ...d,
        x,
        y,
        index: i
      };
    });
  }, [rawData, innerWidth, innerHeight, maxTotal, paddingLeft, paddingTop]);

  // Build SVG path
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) {
      return `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`;
    }

    // Smooth Bezier Curve Path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [points]);

  // Closed area path for gradient
  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return "";
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = paddingTop + innerHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, points, paddingTop, innerHeight]);

  // Y-axis grid ticks
  const yTicks = [0, Math.round(maxTotal / 2), maxTotal];

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-6">
      {/* Top Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h3 className="font-display font-bold text-lg text-white">Mood Analysis Trends</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Temporal activity volume showing lyrical analysis frequency over time
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex p-1 bg-neutral-900 border border-white/10 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setViewMode("daily");
              setHoveredPoint(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "daily"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("weekly");
              setHoveredPoint(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "weekly"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("monthly");
              setHoveredPoint(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "monthly"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Interactive Line Chart SVG */}
      {points.length === 0 ? (
        <div className="py-16 text-center text-xs text-neutral-500 space-y-2">
          <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
          <p>No historical analysis activity recorded for this timeframe.</p>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y Axis Grid Lines */}
            {yTicks.map((val, idx) => {
              const yPos = paddingTop + innerHeight - (val / maxTotal) * innerHeight;
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

            {/* Gradient Area */}
            {areaPath && <path d={areaPath} fill="url(#trendGradient)" />}

            {/* Primary Curve Path */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#c084fc"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hovered Guide Line */}
            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={paddingTop + innerHeight}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeDasharray="2 2"
              />
            )}

            {/* Data Points */}
            {points.map((pt, i) => {
              const isHovered = hoveredPoint?.index === i;
              return (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill={isHovered ? "#ffffff" : "#c084fc"}
                    stroke="#171717"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredPoint(pt)}
                  />
                  {/* Invisible enlarged hit target */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={18}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              );
            })}

            {/* X Axis Date Labels */}
            {points.map((pt, i) => {
              // Show label for every point if <= 8 points, else sample every 2nd or 3rd
              const shouldShowLabel =
                points.length <= 8 ||
                i === 0 ||
                i === points.length - 1 ||
                i % Math.ceil(points.length / 6) === 0;

              if (!shouldShowLabel) return null;

              return (
                <text
                  key={i}
                  x={pt.x}
                  y={height - 10}
                  fill="#a3a3a3"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {pt.label ? pt.label.replace("Week of ", "W: ") : pt.date}
                </text>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 35}%`
              }}
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-20"
            >
              <div className="bg-neutral-900 border border-white/20 rounded-2xl px-3 py-2 shadow-2xl text-xs space-y-1 backdrop-blur-md min-w-[130px]">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pb-1 border-b border-white/10">
                  <span>{hoveredPoint.label || hoveredPoint.date}</span>
                  <span className="text-white font-bold">{hoveredPoint.total} songs</span>
                </div>
                {hoveredPoint.moods && Object.keys(hoveredPoint.moods).length > 0 && (
                  <div className="space-y-0.5 pt-0.5">
                    {Object.entries(hoveredPoint.moods).map(([m, c]) => (
                      <div key={m} className="flex items-center justify-between text-[10px]">
                        <span className="text-neutral-300">{m}</span>
                        <span className="font-mono text-purple-300 font-semibold">{c}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

