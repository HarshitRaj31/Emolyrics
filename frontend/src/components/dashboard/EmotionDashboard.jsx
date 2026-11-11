import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BarChart3,
  Compass,
  PieChart,
  FileDown,
  RotateCcw,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Brain,
  Music2,
  FileText,
  AlertTriangle
} from "lucide-react";
import EmotionSummaryCards from "./EmotionSummaryCards";
import EmotionDonutChart from "./EmotionDonutChart";
import EmotionalJourneyTimeline from "./EmotionalJourneyTimeline";
import PdfDownloadButton from "./PdfDownloadButton";

export default function EmotionDashboard({
  data,
  lyrics = "",
  title = "",
  artist = "",
  loading = false,
  error = "",
  onReanalyze
}) {
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLineIndex, setExpandedLineIndex] = useState(null);

  // Extract primary & secondary data safely
  const primaryEmotion = data?.primaryEmotion || "Happiness";
  const primaryMeta = data?.primaryEmotionMeta || {};
  const secondaryEmotions = data?.secondaryEmotions || [];
  const emotionDistribution = data?.emotionDistribution || {};
  const lines = data?.lines || [];
  const aiInterpretation = data?.aiInterpretation || {};
  const metadata = data?.metadata || {};

  // Filter lines for the lyric explorer table based on selected emotion & search query
  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      if (line.isSectionHeader) return selectedEmotionFilter === "All";
      const matchesEmotion =
        selectedEmotionFilter === "All" || line.emotion === selectedEmotionFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        line.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        line.explanation?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesEmotion && matchesSearch;
    });
  }, [lines, selectedEmotionFilter, searchQuery]);

  // Unique emotions present in the lyrics lines for filter chips
  const presentEmotions = useMemo(() => {
    const counts = {};
    lines.forEach((l) => {
      if (!l.isSectionHeader && l.emotion) {
        counts[l.emotion] = (counts[l.emotion] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [lines]);

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6 sm:p-8 rounded-3xl bg-neutral-900/50 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-white/10 rounded-lg" />
            <div className="h-3.5 w-80 bg-white/5 rounded-lg" />
          </div>
          <div className="h-9 w-36 bg-white/10 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 rounded-3xl bg-white/5" />
          <div className="h-80 rounded-3xl bg-white/5" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h4 className="text-lg font-bold text-white">Dashboard Visualization Unavailable</h4>
        <p className="text-xs text-neutral-300 max-w-md mx-auto">{error}</p>
        {onReanalyze && (
          <button
            type="button"
            onClick={onReanalyze}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
          >
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  // Empty State
  if (!data) {
    return (
      <div className="p-10 rounded-3xl bg-neutral-900/40 border border-white/5 text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-neutral-500">
          <Music2 className="w-7 h-7" />
        </div>
        <h4 className="font-display font-bold text-base text-white">
          Awaiting Emotion Analysis Data
        </h4>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          Run standard or deep AI analysis on your song lyrics to unlock the interactive visualization dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ============================================================ */}
      {/* 1. DASHBOARD TOP BAR: TITLE, STATS & PDF DOWNLOAD */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-neutral-900/90 to-indigo-950/40 border border-purple-500/20 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20 shrink-0">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-extrabold text-lg sm:text-xl text-white tracking-tight">
                Emotion Visualization Dashboard
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                Phase 2
              </span>
              {metadata.isCodeSwitched && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  🔀 {metadata.codeSwitchType ? metadata.codeSwitchType.toUpperCase() : "Code-Switched"}
                </span>
              )}
              {metadata.isUncertain && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                  <span>Calibrated Margin</span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              {metadata.title || title || "Analyzed Song"} • {metadata.artist || artist || "Independent Artist"}
              {metadata.language && ` • ${metadata.language}`}
            </p>
          </div>
        </div>

        {/* Action Button: PDF Download */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <PdfDownloadButton
            data={data}
            lyrics={lyrics}
            title={metadata.title || title}
            artist={metadata.artist || artist}
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FEATURE 3: EMOTION SUMMARY CARDS (6 METRICS) */}
      {/* ============================================================ */}
      <EmotionSummaryCards
        data={data}
        onSelectEmotionFilter={(emo) => setSelectedEmotionFilter(emo)}
      />

      {/* ============================================================ */}
      {/* 3. INTERACTIVE EMOTION FILTER BAR */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/60 border border-white/5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1 shrink-0 px-2">
            <Filter className="w-3 h-3 text-purple-400" />
            <span>Filter:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedEmotionFilter("All")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
              selectedEmotionFilter === "All"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white/5 text-neutral-400 hover:text-white"
            }`}
          >
            All Emotions ({lines.filter((l) => !l.isSectionHeader).length})
          </button>

          {presentEmotions.map(([emoKey, count]) => {
            const isSelected = selectedEmotionFilter === emoKey;
            return (
              <button
                key={emoKey}
                type="button"
                onClick={() => setSelectedEmotionFilter(isSelected ? "All" : emoKey)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white/5 text-neutral-400 hover:text-white"
                }`}
              >
                <span>{emoKey}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {selectedEmotionFilter !== "All" && (
          <button
            type="button"
            onClick={() => setSelectedEmotionFilter("All")}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold shrink-0 px-2 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. VISUALIZATION GRID: DONUT CHART (FEATURE 1) & JOURNEY TIMELINE (FEATURE 2) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Feature 1: Emotion Donut Chart (5 cols on lg) */}
        <div className="lg:col-span-5">
          <EmotionDonutChart
            distribution={emotionDistribution}
            primaryEmotion={primaryEmotion}
            primaryMeta={primaryMeta}
            lines={lines}
            selectedFilter={selectedEmotionFilter}
            onSelectFilter={(emo) => setSelectedEmotionFilter(emo)}
          />
        </div>

        {/* Feature 2: Emotional Journey Timeline (7 cols on lg) */}
        <div className="lg:col-span-7">
          <EmotionalJourneyTimeline
            lines={lines}
            sections={data?.sections || []}
            emotionalJourney={data?.emotionalJourney || null}
            emotionalProgression={aiInterpretation.emotionalProgression || []}
            primaryEmotion={primaryEmotion}
            selectedFilter={selectedEmotionFilter}
            onSelectFilter={(emo) => setSelectedEmotionFilter(emo)}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. INTERACTIVE LINE-BY-LINE LYRICS EXPLORER */}
      {/* ============================================================ */}
      <div className="rounded-3xl p-5 sm:p-6 bg-neutral-900/70 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Interactive Lyrics & Sentiment Explorer</span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Explore emotional classifications and matched cues line by line
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search lyrics or cues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Lines Container */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredLines.length > 0 ? (
            filteredLines.map((line) => {
              if (line.isSectionHeader) {
                return (
                  <div
                    key={`header-${line.lineIndex}`}
                    className="py-2 px-3 text-xs font-bold font-mono text-purple-400 uppercase tracking-wider border-b border-white/5"
                  >
                    {line.text}
                  </div>
                );
              }

              const isExpanded = expandedLineIndex === line.lineIndex;

              return (
                <div
                  key={`line-${line.lineIndex}`}
                  className="rounded-2xl border transition-all overflow-hidden bg-white/5 border-white/5 hover:border-white/15"
                  style={{
                    borderLeftWidth: "4px",
                    borderLeftColor: line.color || "#a855f7"
                  }}
                >
                  <div
                    onClick={() =>
                      setExpandedLineIndex(isExpanded ? null : line.lineIndex)
                    }
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-[11px] font-mono text-neutral-500 w-5 text-right shrink-0">
                        {line.lineIndex}
                      </span>
                      {line.sectionName && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-purple-300 shrink-0">
                          {line.sectionName}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-medium text-neutral-100 truncate">
                        {line.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {line.isCodeSwitched && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-medium"
                          title="Code-switched line"
                        >
                          🔀 CS
                        </span>
                      )}

                      {line.isUncertain && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-mono flex items-center gap-0.5"
                          title="Narrow decision margin"
                        >
                          <AlertTriangle className="w-2.5 h-2.5 text-orange-400" />
                          <span className="hidden sm:inline">Margin</span>
                        </span>
                      )}

                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{
                          backgroundColor: `${line.color || "#a855f7"}20`,
                          color: line.color || "#a855f7"
                        }}
                      >
                        <span>{line.emoji}</span>
                        <span>{line.emotion}</span>
                      </span>

                      <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                        {line.confidence}%
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Line Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-3 pt-1 text-xs text-neutral-300 border-t border-white/5 bg-black/20 space-y-1.5"
                    >
                      <p className="font-sans leading-relaxed text-[11px] sm:text-xs">
                        {line.explanation}
                      </p>
                      {line.detectedKeywords?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-neutral-500">Keywords:</span>
                          {line.detectedKeywords.map((kw, ki) => (
                            <span
                              key={ki}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-neutral-400">
              No lines found matching "{selectedEmotionFilter}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

