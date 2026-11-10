import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Bot,
  Brain,
  Layers,
  ListFilter,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Activity,
  Flame,
  Search,
  ArrowRight,
  Music2,
  FileText,
  TrendingUp,
  ShieldCheck,
  Compass
} from "lucide-react";

export default function AdvancedMoodAnalysis({
  data,
  loading,
  error,
  onReanalyze
}) {
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState("All");
  const [lineSearchQuery, setLineSearchQuery] = useState("");
  const [expandedLineIndex, setExpandedLineIndex] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showConfidenceExplainer, setShowConfidenceExplainer] = useState(false);

  // Extract primary & secondary data safely
  const primaryEmotion = data?.primaryEmotion || "Happiness";
  const primaryMeta = data?.primaryEmotionMeta || {};
  const secondaryEmotions = data?.secondaryEmotions || [];
  const emotionDistribution = data?.emotionDistribution || {};
  const lines = data?.lines || [];
  const aiInterpretation = data?.aiInterpretation || {};
  const confidence = data?.confidence || 75.0;

  // Filter lines based on selected emotion chip or search query
  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      if (line.isSectionHeader) return selectedEmotionFilter === "All";
      const matchesEmotion =
        selectedEmotionFilter === "All" || line.emotion === selectedEmotionFilter;
      const matchesSearch =
        !lineSearchQuery.trim() ||
        line.text.toLowerCase().includes(lineSearchQuery.toLowerCase()) ||
        line.explanation?.toLowerCase().includes(lineSearchQuery.toLowerCase());
      return matchesEmotion && matchesSearch;
    });
  }, [lines, selectedEmotionFilter, lineSearchQuery]);

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

  // Copy structured analysis summary to clipboard
  const handleCopySummary = async () => {
    if (!data) return;
    const text = `EmoLyrics Advanced AI Mood Analysis
Song: ${data.metadata?.title || "Lyrics Analysis"}
Primary Emotion: ${primaryEmotion} (${confidence}% Model Confidence)
Secondary Emotions: ${secondaryEmotions.map((s) => `${s.emotion} (${s.percentage}%)`).join(", ") || "None"}

AI Interpretation:
${aiInterpretation.overallMeaning || "N/A"}

Main Themes: ${aiInterpretation.mainThemes?.join(", ") || "N/A"}
Why Primary Detected: ${aiInterpretation.whyPrimaryEmotion || "N/A"}
Takeaway: ${aiInterpretation.conciseInterpretation || "N/A"}

Analyzed with EmoLyrics AI NLP & Ollama`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6 rounded-3xl bg-neutral-900/40 border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-white/10 rounded-lg" />
            <div className="h-3 w-64 bg-white/5 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-2xl bg-white/5" />
          <div className="h-44 rounded-2xl bg-white/5" />
        </div>
        <div className="h-60 rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Flame className="w-6 h-6" />
        </div>
        <h4 className="text-lg font-bold text-white">Advanced Analysis Failed</h4>
        <p className="text-xs text-neutral-300 max-w-md mx-auto">{error}</p>
        {onReanalyze && (
          <button
            onClick={onReanalyze}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. TOP HEADER BANNER & ACTIONS */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-neutral-950 border border-purple-500/20 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 p-0.5 shadow-md shadow-purple-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white dark:text-white light:text-slate-900 tracking-tight">
                Advanced AI Mood Analysis
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                Multi-Emotion & Ollama
              </span>
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-slate-500">
              10-Class Multi-Emotion Detection • Line-by-Line Sentiment • Lyrical Narrative
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopySummary}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-200 text-xs font-medium border border-white/10 transition-colors"
            title="Copy full analysis summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PRIMARY EMOTION & SECONDARY EMOTIONS CARDS (GRID) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Primary Emotion Hero Card (7 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 rounded-3xl p-6 bg-gradient-to-br from-neutral-900/90 via-neutral-900/60 to-neutral-950 border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: primaryMeta.color || "#a855f7" }}
          />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Primary Lyrical Mood
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300">
                {data.metadata?.language || "English"}
              </span>
            </div>

            <div className="flex items-center gap-5 my-2">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-inner border"
                style={{
                  backgroundColor: `${primaryMeta.color || "#a855f7"}18`,
                  borderColor: `${primaryMeta.color || "#a855f7"}40`
                }}
              >
                <span>{primaryMeta.emoji || "🎵"}</span>
              </div>

              <div className="space-y-1">
                <h4 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {primaryEmotion}
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-sm">
                  {primaryMeta.description || "The dominant emotional character identified across the lyrics."}
                </p>
              </div>
            </div>
          </div>

          {/* Model Statistical Confidence Bar */}
          <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-neutral-300">
                  Model Statistical Confidence
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfidenceExplainer(!showConfidenceExplainer)}
                  className="text-neutral-400 hover:text-white transition-colors"
                  title="Confidence Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span
                className="font-mono font-bold text-sm"
                style={{ color: primaryMeta.color || "#a855f7" }}
              >
                {confidence}%
              </span>
            </div>

            {/* Confidence Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: primaryMeta.color || "#a855f7"
                }}
              />
            </div>

            {/* Collapsible Confidence Explanation Tooltip */}
            <AnimatePresence>
              {showConfidenceExplainer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-neutral-400 bg-white/5 p-2.5 rounded-xl border border-white/10 leading-relaxed font-sans"
                >
                  <span className="font-semibold text-neutral-200">Note: </span>
                  {data.confidenceDisclaimer ||
                    "Model statistical confidence represents mathematical likelihood calculated from lexical density, valence, and semantic margin—distinct from factual human certainty."}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right: Secondary Emotions Badges Card (5 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 rounded-3xl p-6 bg-neutral-900/70 border border-white/10 shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Co-Occurring Emotions
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Ranked</span>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Secondary emotional currents interweaving with the primary mood.
            </p>

            <div className="space-y-3">
              {secondaryEmotions.length > 0 ? (
                secondaryEmotions.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1.5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">{sec.emoji || "🎵"}</span>
                        <span className="font-bold text-white">{sec.emotion}</span>
                      </div>
                      <span className="font-mono text-xs text-neutral-300 font-semibold">
                        {sec.percentage}%
                      </span>
                    </div>

                    {/* Relative Bar */}
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(sec.percentage, 8)}%`,
                          backgroundColor: sec.color || "#8b5cf6"
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-white/5 text-center text-xs text-neutral-400">
                  Single dominant emotion observed throughout the lyrical phrasing.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-neutral-500">
            Detected across {data.analyzedLines || lines.length} lyrical lines
          </div>
        </motion.div>
      </div>

      {/* ============================================================ */}
      {/* 3. MULTI-EMOTION SPECTRUM DISTRIBUTION CHART */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl p-6 bg-neutral-900/60 border border-white/10 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-bold text-white">
              10-Emotion Lyrical Spectrum Distribution
            </h4>
          </div>
          <span className="text-[11px] text-neutral-400">
            Relative presence of all 10 emotion categories
          </span>
        </div>

        {/* 10 Emotion Horizontal Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {Object.entries(emotionDistribution).map(([emoKey, pct]) => {
            const isPrimary = emoKey === primaryEmotion;
            return (
              <div
                key={emoKey}
                className={`p-3 rounded-2xl border transition-all ${
                  isPrimary
                    ? "bg-purple-500/10 border-purple-500/40 shadow-sm"
                    : "bg-white/5 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-semibold truncate ${isPrimary ? "text-purple-300 font-bold" : "text-neutral-300"}`}>
                    {emoKey}
                  </span>
                  <span className="font-mono text-[11px] text-neutral-400">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isPrimary ? (primaryMeta.color || "#a855f7") : "#94a3b8"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* 4. OVERALL SONG INTERPRETATION VIA OLLAMA */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-indigo-950/40 via-neutral-900/80 to-purple-950/40 border border-purple-500/30 shadow-2xl space-y-6 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">
                  Overall Song Interpretation
                </h4>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {aiInterpretation.provider || "Ollama (qwen2.5:3b)"}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                AI Deep Lyrical Synthesis & Narrative Breakdown
              </p>
            </div>
          </div>

          {/* Fallback Notice if Ollama was unreachable */}
          {aiInterpretation.fallbackReason && (
            <div className="text-[11px] text-amber-300/80 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
              {aiInterpretation.fallbackReason}
            </div>
          )}
        </div>

        {/* Meaning & Why Primary Detected (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lyrical Meaning */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Overall Emotional Meaning</span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
              {aiInterpretation.overallMeaning}
            </p>
          </div>

          {/* Why Primary Detected */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Why {primaryEmotion} Was Detected</span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">
              {aiInterpretation.whyPrimaryEmotion}
            </p>
          </div>
        </div>

        {/* Lyrical Themes Pills */}
        {aiInterpretation.mainThemes?.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Main Lyrical Themes
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {aiInterpretation.mainThemes.map((theme, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-200 border border-purple-500/30 shadow-sm"
                >
                  #{theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Emotional Progression Timeline */}
        {aiInterpretation.emotionalProgression?.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Emotional Progression
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {aiInterpretation.emotionalProgression.map((prog, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 relative"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300">{prog.stage}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                      {prog.emotion}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed font-sans">
                    {prog.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Concise Interpretation Quote Box */}
        {aiInterpretation.conciseInterpretation && (
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-purple-500/30 flex items-center gap-3">
            <span className="text-2xl select-none">💬</span>
            <p className="text-xs sm:text-sm italic font-serif text-neutral-200 leading-relaxed">
              "{aiInterpretation.conciseInterpretation}"
            </p>
          </div>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/* 5. LINE-BY-LINE LYRICS ANALYSIS EXPLORER */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-3xl p-6 bg-neutral-900/70 border border-white/10 shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-purple-400" />
              <span>Line-by-Line Emotion Analysis</span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              Emotional sentiment and keyword explanation for each lyrical line
            </p>
          </div>

          {/* Search Input within Lines */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search lines or cues..."
              value={lineSearchQuery}
              onChange={(e) => setLineSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Emotion Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedEmotionFilter("All")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedEmotionFilter === "All"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white/5 text-neutral-400 hover:text-white"
            }`}
          >
            All Lines ({lines.filter((l) => !l.isSectionHeader).length})
          </button>

          {presentEmotions.map(([emoKey, count]) => (
            <button
              key={emoKey}
              onClick={() => setSelectedEmotionFilter(emoKey)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                selectedEmotionFilter === emoKey
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white/5 text-neutral-400 hover:text-white"
              }`}
            >
              <span>{emoKey}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {/* Lines Container */}
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[11px] font-mono text-neutral-500 w-5 text-right shrink-0">
                        {line.lineIndex}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-neutral-100 truncate">
                        {line.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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
              No lines found matching the selected filter.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

