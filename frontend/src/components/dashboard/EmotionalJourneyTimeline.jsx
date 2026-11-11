import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  Info,
  Split,
  GitCommit,
  Flame,
  Workflow,
  AlertTriangle
} from "lucide-react";

const EMOTIONS_METADATA = {
  Happiness: { emoji: "😊", color: "#eab308" },
  Sadness: { emoji: "😢", color: "#3b82f6" },
  Love: { emoji: "❤️", color: "#ec4899" },
  Anger: { emoji: "😡", color: "#ef4444" },
  Nostalgia: { emoji: "🕰️", color: "#f97316" },
  Fear: { emoji: "😨", color: "#8b5cf6" },
  Excitement: { emoji: "🎉", color: "#06b6d4" },
  Hope: { emoji: "🌱", color: "#10b981" },
  Loneliness: { emoji: "🥀", color: "#64748b" },
  Calmness: { emoji: "🌊", color: "#14b8a6" }
};

export default function EmotionalJourneyTimeline({
  lines = [],
  sections = [],
  emotionalJourney = null,
  emotionalProgression = [],
  primaryEmotion = "Happiness",
  selectedFilter = "All",
  onSelectFilter,
  onSelectLine
}) {
  // Filter out structural headers for the sequential timeline nodes
  const playableLines = useMemo(() => {
    return lines.filter((l) => !l.isSectionHeader);
  }, [lines]);

  // Currently selected line index in playableLines
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-align selected index if filter changes
  const activeLine = playableLines[selectedIndex] || playableLines[0] || null;

  const handleSelectLine = (idx) => {
    setSelectedIndex(idx);
    if (onSelectLine && playableLines[idx]) {
      onSelectLine(playableLines[idx]);
    }
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      handleSelectLine(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < playableLines.length - 1) {
      handleSelectLine(selectedIndex + 1);
    }
  };

  // Jump to start of section
  const handleJumpToSection = (section) => {
    const targetIdx = playableLines.findIndex(
      (l) => l.lineIndex >= section.startLine && l.lineIndex <= section.endLine
    );
    if (targetIdx !== -1) {
      handleSelectLine(targetIdx);
    }
  };

  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-neutral-900/80 border border-white/10 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Emotional Journey Timeline
            </h3>
            <p className="text-xs text-neutral-400">
              Contextual emotional trajectory across structural sections and line flow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-neutral-400 font-mono">
          {sections.length > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-purple-300">
              {sections.length} Sections
            </span>
          )}
          <span>{playableLines.length} Lyric Segments</span>
        </div>
      </div>

      {/* 1. SONG SECTION TRACK (IF DETECTED) */}
      {sections.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Split className="w-3 h-3 text-purple-400" />
              <span>Section Navigation Track</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">Click to jump</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {sections.map((sec, sidx) => {
              const domMeta = EMOTIONS_METADATA[sec.dominantEmotion] || {};
              const isActiveSection =
                activeLine &&
                activeLine.lineIndex >= sec.startLine &&
                activeLine.lineIndex <= sec.endLine;

              return (
                <button
                  key={sidx}
                  type="button"
                  onClick={() => handleJumpToSection(sec)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 border ${
                    isActiveSection
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-md ring-1 ring-purple-500/50"
                      : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <span className="font-mono text-[11px] text-purple-300 font-bold">
                    {sec.sectionName}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: `${domMeta.color || "#a855f7"}20`,
                      color: domMeta.color || "#a855f7"
                    }}
                  >
                    <span>{domMeta.emoji || "🎵"}</span>
                    <span>{sec.dominantEmotion}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. NARRATIVE PROGRESSION STAGES (Opening -> Climax -> Resolution) */}
      {emotionalProgression?.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Narrative Arc Stages</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {emotionalProgression.map((stage, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 relative group hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-200">{stage.stage}</span>
                  <span
                    onClick={() => onSelectFilter && onSelectFilter(stage.emotion)}
                    className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold cursor-pointer hover:bg-purple-500/30 transition-colors"
                  >
                    {stage.emotion}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans line-clamp-2">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE TIMELINE SCRUBBER / NODE TRACK */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>Lyrical Flow & Emotion Points (Click any point)</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            Segment {selectedIndex + 1} of {playableLines.length}
          </span>
        </div>

        {/* Scrollable Node Track */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 min-w-max py-2 px-1">
            {playableLines.map((line, idx) => {
              const isSelected = selectedIndex === idx;
              const matchesFilter =
                selectedFilter === "All" || line.emotion === selectedFilter;
              const meta = EMOTIONS_METADATA[line.emotion] || {};

              return (
                <div
                  key={`track-${idx}`}
                  onClick={() => handleSelectLine(idx)}
                  className={`flex flex-col items-center gap-1.5 cursor-pointer group transition-all duration-200 ${
                    isSelected ? "scale-110" : "hover:scale-105"
                  } ${!matchesFilter ? "opacity-30" : "opacity-100"}`}
                  title={`Line ${line.lineIndex}: ${line.text}`}
                >
                  {/* Timeline Node Dot */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs transition-all ${
                      isSelected
                        ? "ring-2 ring-white ring-offset-2 ring-offset-neutral-900 shadow-lg"
                        : "group-hover:ring-1 group-hover:ring-white/40"
                    }`}
                    style={{
                      backgroundColor: `${line.color || meta.color || "#a855f7"}30`,
                      border: `1.5px solid ${line.color || meta.color || "#a855f7"}`
                    }}
                  >
                    <span className="select-none text-[11px]">
                      {line.emoji || meta.emoji || "🎵"}
                    </span>
                  </div>

                  {/* Line Number */}
                  <span
                    className={`text-[9px] font-mono font-bold ${
                      isSelected ? "text-white" : "text-neutral-500"
                    }`}
                  >
                    {line.lineIndex}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. SELECTED SEGMENT INSPECTOR CARD */}
      <AnimatePresence mode="wait">
        {activeLine && (
          <motion.div
            key={`detail-${activeLine.lineIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-white/10 shadow-xl space-y-3 relative overflow-hidden"
            style={{
              borderLeftWidth: "4px",
              borderLeftColor: activeLine.color || "#a855f7"
            }}
          >
            {/* Top row: Line index, section badge, emotion badge, confidence & Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-neutral-400">
                  Segment #{activeLine.lineIndex}
                </span>

                {activeLine.sectionName && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                    {activeLine.sectionName}
                  </span>
                )}

                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm"
                  style={{
                    backgroundColor: `${activeLine.color || "#a855f7"}25`,
                    color: activeLine.color || "#a855f7"
                  }}
                >
                  <span>{activeLine.emoji || "🎵"}</span>
                  <span>{activeLine.emotion}</span>
                </span>

                <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md">
                  {activeLine.confidence}% match
                </span>

                {/* Stage 6 Code-Switching Badge */}
                {activeLine.isCodeSwitched && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-semibold"
                    title={`Code-switched line (${activeLine.codeSwitchType || "mixed"})`}
                  >
                    🔀 {activeLine.codeSwitchType ? activeLine.codeSwitchType.toUpperCase() : "CS"}
                  </span>
                )}

                {/* Stage 6 Uncertainty Badge */}
                {activeLine.isUncertain && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 font-mono font-semibold flex items-center gap-1"
                    title={activeLine.uncertaintyDetails?.warningReason || "Narrow decision margin between emotions"}
                  >
                    <AlertTriangle className="w-3 h-3 text-orange-400" />
                    <span>Margin Alert</span>
                  </span>
                )}
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={selectedIndex === 0}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous lyric segment"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedIndex === playableLines.length - 1}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next lyric segment"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lyric Line Text */}
            <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
              <p className="font-serif italic text-sm sm:text-base text-neutral-100 leading-relaxed">
                "{activeLine.text}"
              </p>
            </div>

            {/* Secondary Emotions & Explanation */}
            <div className="space-y-2 pt-1 text-xs text-neutral-400">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-sans text-[11px] sm:text-xs text-neutral-300 leading-relaxed">
                  {activeLine.explanation || `Exhibits ${activeLine.emotion} tonal characteristics.`}
                </p>

                {activeLine.detectedKeywords?.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    <span className="text-[10px] text-neutral-500 font-mono">Matched:</span>
                    {activeLine.detectedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Line 10-Emotion Horizontal Probabilities */}
              {activeLine.emotionProbabilities && Object.keys(activeLine.emotionProbabilities).length > 0 && (
                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                    Segment Emotion Probabilities:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {Object.entries(activeLine.emotionProbabilities).map(([emoKey, pct]) => {
                      const isDom = emoKey === activeLine.emotion;
                      const meta = EMOTIONS_METADATA[emoKey] || {};
                      return (
                        <div
                          key={emoKey}
                          className={`p-1.5 rounded-lg border text-[10px] ${
                            isDom
                              ? "bg-purple-500/15 border-purple-500/40"
                              : "bg-white/5 border-white/5"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={isDom ? "font-bold text-purple-300 truncate" : "text-neutral-400 truncate"}>
                              {emoKey}
                            </span>
                            <span className="font-mono text-neutral-300">{pct}%</span>
                          </div>
                          <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: meta.color || "#8b5cf6"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. SIGNIFICANT EMOTIONAL TRANSITIONS & JOURNEY INSIGHTS */}
      {emotionalJourney && (
        <div className="pt-2 border-t border-white/10 space-y-3">
          {/* Significant Transitions */}
          {emotionalJourney.significantTransitions?.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                <span>Significant Emotional Shifts Between Sections</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {emotionalJourney.significantTransitions.map((t, tidx) => (
                  <div
                    key={tidx}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-mono font-bold text-neutral-300">{t.fromSection}</span>
                      <span className="text-[10px] text-neutral-400">({t.fromEmotion})</span>
                      <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="font-mono font-bold text-white">{t.toSection}</span>
                      <span className="text-[10px] text-purple-300">({t.toEmotion})</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold shrink-0">
                      Δ {t.magnitude}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peak Intensity & Diversity Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {emotionalJourney.strongestSection && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  <span>Peak Intensity Section</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">
                    {emotionalJourney.strongestSection.sectionName}
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {emotionalJourney.strongestSection.emotionalIntensity}/100
                  </span>
                </div>
              </div>
            )}

            {emotionalJourney.mostDiverseSection && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>Most Emotionally Diverse Section</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">
                    {emotionalJourney.mostDiverseSection.sectionName}
                  </span>
                  <span className="font-mono text-sky-300 font-bold">
                    Entropy H: {emotionalJourney.mostDiverseSection.diversityScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

