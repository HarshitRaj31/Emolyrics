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
  Compass,
  Globe,
  Languages,
  AlertTriangle,
  Cpu,
  Split,
  GitCommit,
  Zap,
  Workflow,
  Gauge
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle, getEmotionToken } from "../../utils/emotionTheme";

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

function getLanguageBadge(languageCode = "", languageName = "") {
  const code = (languageCode || "").toLowerCase();
  const name = (languageName || "").toLowerCase();
  if (code === "hi" || name.includes("hindi") || name.includes("hinglish")) {
    return { flag: "🇮🇳", label: languageName || "Hindi", code: "hi" };
  }
  if (code === "bn" || name.includes("bengali") || name.includes("banglish")) {
    return { flag: "🇧🇩", label: languageName || "Bengali", code: "bn" };
  }
  if (code === "es" || name.includes("spanish")) {
    return { flag: "🇪🇸", label: languageName || "Spanish", code: "es" };
  }
  if (code === "fr" || name.includes("french")) {
    return { flag: "🇫🇷", label: languageName || "French", code: "fr" };
  }
  if (code === "en" || name.includes("english")) {
    return { flag: "🇬🇧", label: languageName || "English", code: "en" };
  }
  return { flag: "🌐", label: languageName || code.toUpperCase() || "Unknown", code };
}

function getCodeSwitchLabel(type = "") {
  switch ((type || "").toLowerCase()) {
    case "hinglish":
      return "🔀 Hinglish (Hindi + English)";
    case "banglish":
      return "🔀 Banglish (Bengali + English)";
    case "spanglish":
      return "🔀 Spanglish (Spanish + English)";
    case "franglish":
      return "🔀 Franglish (French + English)";
    case "mixed_script":
      return "🔀 Mixed Script";
    default:
      return "🔀 Code-Switched";
  }
}

export default function AdvancedMoodAnalysis({
  data,
  loading,
  error,
  onReanalyze
}) {
  const { isDark } = useTheme();
  const [lyricsViewMode, setLyricsViewMode] = useState("lines"); // "lines" | "sections" | "journey"
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState("All");
  const [lineSearchQuery, setLineSearchQuery] = useState("");
  const [expandedLineIndex, setExpandedLineIndex] = useState(null);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showConfidenceExplainer, setShowConfidenceExplainer] = useState(false);

  // Extract primary & secondary data safely
  const primaryEmotion = data?.primaryEmotion || "Happiness";
  const primaryMeta = data?.primaryEmotionMeta || {};
  const secondaryEmotions = data?.secondaryEmotions || [];
  const emotionDistribution = data?.emotionDistribution || {};
  const lines = data?.lines || [];
  const sections = data?.sections || [];
  const emotionalJourney = data?.emotionalJourney || null;
  const aiInterpretation = data?.aiInterpretation || {};
  const confidence = data?.confidence || 75.0;
  const langBadge = useMemo(
    () => getLanguageBadge(data?.metadata?.languageCode, data?.metadata?.language),
    [data?.metadata?.languageCode, data?.metadata?.language]
  );

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
      <div className="space-y-6 animate-pulse p-6 rounded-3xl theme-card">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 bg-white/10 light:bg-slate-900/10 rounded-lg" />
            <div className="h-3 w-64 bg-white/5 light:bg-slate-900/5 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-2xl theme-well" />
          <div className="h-44 rounded-2xl theme-well" />
        </div>
        <div className="h-60 rounded-2xl theme-well" />
      </div>
    );
  }

  if (error) {
    const isServiceOffline =
      typeof error === "string" &&
      (error.includes("503") ||
        error.includes("ERR_MULTILINGUAL_SERVICE_OFFLINE") ||
        error.includes("microservice") ||
        error.includes("offline"));

    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 light:bg-rose-50 border border-rose-500/20 light:border-rose-300 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 light:bg-rose-100 text-rose-400 light:text-rose-700 flex items-center justify-center mx-auto">
          {isServiceOffline ? <AlertTriangle className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
        </div>
        <h4 className="text-lg font-bold text-ink-main">
          {isServiceOffline ? "Multilingual ML Microservice Required" : "Advanced Analysis Failed"}
        </h4>
        <p className="text-xs text-ink-secondary max-w-lg mx-auto leading-relaxed">
          {error}
        </p>
        {isServiceOffline && (
          <div className="max-w-md mx-auto p-3.5 rounded-xl theme-well text-[11px] font-mono text-ink-secondary text-left space-y-1.5">
            <div className="text-purple-300 light:text-purple-700 font-bold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> Start Python ML Microservice:
            </div>
            <div className="text-emerald-400 light:text-emerald-700">cd ml-services</div>
            <div className="text-emerald-400 light:text-emerald-700">python -m src.api</div>
            <div className="text-ink-dim">Service listens on http://127.0.0.1:8001</div>
          </div>
        )}
        {onReanalyze && (
          <button
            onClick={onReanalyze}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all"
          >
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Multilingual Advisory Banner if warning present */}
      {data.metadata?.warning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 light:bg-amber-50 border border-amber-500/30 text-amber-200 light:text-amber-900 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-300 light:text-amber-800">Multilingual Model Advisory: </span>
            <span>{data.metadata.warning}</span>
          </div>
        </div>
      )}

      {/* Prediction Uncertainty Banner (Stage 6) */}
      {(data.metadata?.isUncertain || data.isUncertain) && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 light:from-amber-50 light:via-orange-50 light:to-amber-50 border border-amber-500/30 text-amber-200 light:text-amber-950 text-xs shadow-md">
          <AlertTriangle className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-300 light:text-amber-800">
                Calibrated Prediction Uncertainty Alert
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-500/30 font-semibold">
                Temperature Scaled ({data.metadata?.temperature ? `T=${data.metadata.temperature}` : "T=1.03"})
              </span>
              {data.metadata?.isCodeSwitched && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 light:bg-purple-100 text-purple-300 light:text-purple-800 border border-purple-500/30 font-semibold">
                  {getCodeSwitchLabel(data.metadata?.codeSwitchType || data.codeSwitchType)}
                </span>
              )}
            </div>
            <p className="text-ink-secondary leading-relaxed text-[11px] sm:text-xs">
              {data.metadata?.uncertaintyDetails?.warningReason ||
                data.uncertaintyDetails?.warningReason ||
                "Narrow probability margin between candidate emotions. Confidence values have been calibrated with post-hoc temperature scaling to prevent overconfidence."}
            </p>
            <div className="flex items-center gap-3 pt-0.5 text-[10px] sm:text-[11px] font-mono text-ink-muted flex-wrap">
              {(data.metadata?.uncertaintyDetails?.margin !== undefined || data.uncertaintyDetails?.margin !== undefined) && (
                <span>
                  Decision Margin:{" "}
                  <strong className="text-amber-300 light:text-amber-800">
                    {Math.round(((data.metadata?.uncertaintyDetails?.margin ?? data.uncertaintyDetails?.margin) || 0) * 100)}%
                  </strong>
                </span>
              )}
              {(data.metadata?.uncertaintyDetails?.entropy !== undefined || data.uncertaintyDetails?.entropy !== undefined) && (
                <>
                  <span>•</span>
                  <span>
                    Normalized Entropy:{" "}
                    <strong className="text-amber-300 light:text-amber-800">
                      {((data.metadata?.uncertaintyDetails?.entropy ?? data.uncertaintyDetails?.entropy) || 0).toFixed(2)}
                    </strong>
                  </span>
                </>
              )}
              {data.metadata?.uncertaintyDetails?.topTwo && (
                <>
                  <span>•</span>
                  <span>
                    Top Contenders:{" "}
                    <strong className="text-purple-300 light:text-purple-700">
                      {data.metadata.uncertaintyDetails.topTwo.map((c) => `${c.emotion} (${(c.probability * 100).toFixed(0)}%)`).join(" vs ")}
                    </strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. TOP HEADER BANNER & ACTIONS */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl theme-card bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-neutral-950 light:from-purple-50 light:via-indigo-50/60 light:to-white border-purple-500/20 light:border-purple-200 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 p-0.5 shadow-md shadow-purple-500/20">
            <div className="w-full h-full bg-neutral-950 light:bg-white rounded-[14px] flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-400 light:text-purple-600" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-ink-main tracking-tight">
                Advanced AI Mood Analysis
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 light:bg-purple-100 text-purple-300 light:text-purple-800 border border-purple-500/30 font-semibold flex items-center gap-1">
                <Cpu className="w-3 h-3 text-purple-400 light:text-purple-600" />
                {data.metadata?.modelVersion || "v1.2.0-production-calibrated"}
              </span>
              {(data.metadata?.mlDurationMs || data.metadata?.durationMs) && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 light:bg-indigo-100 text-indigo-300 light:text-indigo-800 border border-indigo-500/30 font-medium flex items-center gap-1" title="ML Inference Latency">
                  <Zap className="w-3 h-3 text-indigo-400 light:text-indigo-600" />
                  {data.metadata.mlDurationMs || data.metadata.durationMs}ms
                </span>
              )}
              {data.metadata?.mlServiceOnline ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 light:bg-emerald-50 text-emerald-300 light:text-emerald-700 border border-emerald-500/30 font-medium">
                  Neural ML Engine
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 light:bg-amber-50 text-amber-300 light:text-amber-700 border border-amber-500/30 font-medium">
                  Lexical Fallback
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              10-Class Multi-Emotion Detection • Line-by-Line Sentiment • Lyrical Narrative
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopySummary}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 light:bg-white light:hover:bg-slate-100 text-ink-secondary text-xs font-medium border border-white/10 light:border-slate-300 transition-colors shadow-sm"
            title="Copy full analysis summary"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                <span className="text-emerald-300 light:text-emerald-700 font-semibold">Copied</span>
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
          className="lg:col-span-7 rounded-3xl p-6 theme-card bg-gradient-to-br from-neutral-900/90 via-neutral-900/60 to-neutral-950 light:from-white light:via-white light:to-slate-50 shadow-xl relative overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div
            className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 light:opacity-15 pointer-events-none"
            style={{ backgroundColor: primaryMeta.color || "#a855f7" }}
          />

          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-ink-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                Primary Lyrical Mood
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full theme-well text-ink-secondary flex items-center gap-1.5 font-medium">
                  <span>{langBadge.flag}</span>
                  <span>{langBadge.label}</span>
                </span>
                {data.metadata?.isCodeSwitched && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 light:bg-amber-50 border border-amber-500/30 text-amber-300 light:text-amber-800 font-semibold flex items-center gap-1">
                    <span>{getCodeSwitchLabel(data.metadata?.codeSwitchType || data.codeSwitchType)}</span>
                  </span>
                )}
                {(data.metadata?.isUncertain || data.isUncertain) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 light:bg-orange-50 border border-orange-500/30 text-orange-300 light:text-orange-800 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-400 light:text-orange-600" />
                    <span>Uncertain Margin</span>
                  </span>
                )}
                {data.metadata?.isSupported === false && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 light:bg-rose-50 border border-rose-500/30 text-rose-300 light:text-rose-700 font-semibold">
                    Unsupported Language
                  </span>
                )}
              </div>
            </div>

            {/* Multi-Language Distribution Breakdown if multi-lingual */}
            {data.metadata?.languageDistribution && Object.keys(data.metadata.languageDistribution).length > 1 && (
              <div className="mb-3 p-2.5 rounded-xl theme-well flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider font-semibold">
                  Language Distribution:
                </span>
                {Object.entries(data.metadata.languageDistribution).map(([lCode, lPct]) => {
                  const pctVal = lPct <= 1 ? Math.round(lPct * 100) : Math.round(lPct);
                  const b = getLanguageBadge(lCode);
                  return (
                    <span
                      key={lCode}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 light:bg-white border border-white/10 light:border-slate-200 text-ink-secondary flex items-center gap-1"
                    >
                      <span>{b.flag}</span>
                      <span>{b.label}: {pctVal}%</span>
                    </span>
                  );
                })}
                {data.metadata?.scriptBreakdown && (
                  <span className="text-[10px] font-mono text-ink-muted ml-auto">
                    Scripts: {Object.entries(data.metadata.scriptBreakdown).map(([s, p]) => `${s} ${p <= 1 ? Math.round(p * 100) : Math.round(p)}%`).join(" • ")}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-5 my-2">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-inner border"
                style={{
                  backgroundColor: `${primaryMeta.color || getEmotionToken(primaryEmotion).color}18`,
                  borderColor: `${primaryMeta.color || getEmotionToken(primaryEmotion).color}40`
                }}
              >
                <span>{primaryMeta.emoji || getEmotionToken(primaryEmotion).emoji || "🎵"}</span>
              </div>

              <div className="space-y-1">
                <h4 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-main tracking-tight">
                  {primaryEmotion}
                </h4>
                <p className="text-xs text-ink-secondary leading-relaxed max-w-sm">
                  {primaryMeta.description || "The dominant emotional character identified across the lyrics."}
                </p>
              </div>
            </div>
          </div>

          {/* Model Statistical Confidence Bar */}
          <div className="mt-6 pt-4 border-t border-white/10 light:border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-ink-secondary">
                  Model Statistical Confidence
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfidenceExplainer(!showConfidenceExplainer)}
                  className="text-ink-muted hover:text-ink-main transition-colors"
                  title="Confidence Explanation"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span
                className="font-mono font-bold text-sm"
                style={{ color: isDark ? (primaryMeta.color || "#a855f7") : getEmotionToken(primaryEmotion).lightText }}
              >
                {confidence}%
              </span>
            </div>

            {/* Confidence Progress Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden relative" style={{ backgroundColor: "var(--chart-track)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  backgroundColor: primaryMeta.color || getEmotionToken(primaryEmotion).color || "#a855f7"
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
                  className="text-[11px] text-ink-muted theme-well p-2.5 rounded-xl leading-relaxed font-sans"
                >
                  <span className="font-semibold text-ink-main">Note: </span>
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
          className="lg:col-span-5 rounded-3xl p-6 theme-card shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wider font-bold text-ink-muted flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
                Co-Occurring Emotions
              </span>
              <span className="text-[10px] text-ink-muted font-mono">Ranked</span>
            </div>
            <p className="text-xs text-ink-muted mb-4">
              Secondary emotional currents interweaving with the primary mood.
            </p>

            <div className="space-y-3">
              {secondaryEmotions.length > 0 ? (
                secondaryEmotions.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl theme-well space-y-1.5 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base select-none">{sec.emoji || "🎵"}</span>
                        <span className="font-bold text-ink-main">{sec.emotion}</span>
                      </div>
                      <span className="font-mono text-xs text-ink-secondary font-semibold">
                        {sec.percentage}%
                      </span>
                    </div>

                    {/* Relative Bar */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--chart-track)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(sec.percentage, 8)}%`,
                          backgroundColor: sec.color || getEmotionToken(sec.emotion).color || "#8b5cf6"
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl theme-well text-center text-xs text-ink-muted">
                  Single dominant emotion observed throughout the lyrical phrasing.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 light:border-slate-200 text-[11px] text-ink-dim">
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
        className="rounded-3xl p-6 theme-card shadow-xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-400 light:text-sky-600" />
            <h4 className="text-sm font-bold text-ink-main">
              10-Emotion Lyrical Spectrum Distribution
            </h4>
          </div>
          <span className="text-[11px] text-ink-muted">
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
                    ? "bg-purple-500/10 light:bg-purple-50 border-purple-500/40 shadow-sm"
                    : "theme-well hover:border-purple-500/25"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className={`font-semibold truncate ${isPrimary ? "text-purple-300 light:text-purple-700 font-bold" : "text-ink-secondary"}`}>
                    {emoKey}
                  </span>
                  <span className="font-mono text-[11px] text-ink-muted">{pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--chart-track)" }}>
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
        className="rounded-3xl p-6 sm:p-7 theme-card bg-gradient-to-br from-indigo-950/40 via-neutral-900/80 to-purple-950/40 light:from-indigo-50/70 light:via-white light:to-purple-50/70 border-purple-500/30 light:border-purple-200 shadow-2xl space-y-6 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 light:border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 light:bg-purple-100 border border-purple-500/30 flex items-center justify-center text-purple-300 light:text-purple-700">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-base font-bold text-ink-main">
                  Overall Song Interpretation
                </h4>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 light:bg-emerald-500 animate-pulse" />
                  {aiInterpretation.provider || "Ollama (qwen2.5:3b)"}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                AI Deep Lyrical Synthesis & Narrative Breakdown
              </p>
            </div>
          </div>

          {/* Fallback Notice if Ollama was unreachable */}
          {aiInterpretation.fallbackReason && (
            <div className="text-[11px] text-amber-300/90 light:text-amber-800 bg-amber-500/10 light:bg-amber-50 px-3 py-1 rounded-xl border border-amber-500/20">
              {aiInterpretation.fallbackReason}
            </div>
          )}
        </div>

        {/* Meaning & Why Primary Detected (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lyrical Meaning */}
          <div className="p-4 sm:p-5 rounded-2xl theme-well space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
              <span>Overall Emotional Meaning</span>
            </div>
            <p className="text-xs sm:text-sm text-ink-main leading-relaxed font-sans">
              {aiInterpretation.overallMeaning}
            </p>
          </div>

          {/* Why Primary Detected */}
          <div className="p-4 sm:p-5 rounded-2xl theme-well space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
              <span>Why {primaryEmotion} Was Detected</span>
            </div>
            <p className="text-xs sm:text-sm text-ink-main leading-relaxed font-sans">
              {aiInterpretation.whyPrimaryEmotion}
            </p>
          </div>
        </div>

        {/* Lyrical Themes Pills */}
        {aiInterpretation.mainThemes?.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Main Lyrical Themes
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {aiInterpretation.mainThemes.map((theme, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 light:bg-purple-50 text-purple-200 light:text-purple-700 border border-purple-500/30 shadow-sm"
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
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Emotional Progression
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {aiInterpretation.emotionalProgression.map((prog, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl theme-well space-y-1 relative"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-purple-300 light:text-purple-700">{prog.stage}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/10 light:bg-slate-200/80 text-ink-secondary">
                      {prog.emotion}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-relaxed font-sans">
                    {prog.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Concise Interpretation Quote Box */}
        {aiInterpretation.conciseInterpretation && (
          <div className="p-4 rounded-2xl theme-well border-purple-500/30 light:border-purple-200 flex items-center gap-3">
            <span className="text-2xl select-none">💬</span>
            <p className="text-xs sm:text-sm italic font-serif text-ink-main leading-relaxed">
              "{aiInterpretation.conciseInterpretation}"
            </p>
          </div>
        )}
      </motion.div>

      {/* ============================================================ */}
      {/* 5. MULTILINGUAL LINE-BY-LINE & SECTION EMOTION ANALYSIS */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-3xl p-6 theme-card shadow-xl space-y-5"
      >
        {/* Top Header & View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10 light:border-slate-200">
          <div>
            <h4 className="text-base font-bold text-ink-main flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-purple-400 light:text-purple-600" />
              <span>Multilingual Lyrical Emotion Analysis</span>
            </h4>
            <p className="text-xs text-ink-muted mt-0.5">
              Context-aware neural classification across lines, structural sections, and emotional trajectory
            </p>
          </div>

          {/* View Mode Toggle Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl theme-well self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setLyricsViewMode("lines")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                lyricsViewMode === "lines"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-ink-muted hover:text-ink-main hover:bg-white/5 light:hover:bg-slate-200/60"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Line-by-Line</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${lyricsViewMode === "lines" ? "bg-white/20" : "bg-white/10 light:bg-slate-200 text-ink-secondary"}`}>
                {lines.filter((l) => !l.isSectionHeader).length}
              </span>
            </button>

            {sections.length > 0 && (
              <button
                type="button"
                onClick={() => setLyricsViewMode("sections")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  lyricsViewMode === "sections"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-ink-muted hover:text-ink-main hover:bg-white/5 light:hover:bg-slate-200/60"
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Sections</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${lyricsViewMode === "sections" ? "bg-white/20" : "bg-white/10 light:bg-slate-200 text-ink-secondary"}`}>
                  {sections.length}
                </span>
              </button>
            )}

            {emotionalJourney && (
              <button
                type="button"
                onClick={() => setLyricsViewMode("journey")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  lyricsViewMode === "journey"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-ink-muted hover:text-ink-main hover:bg-white/5 light:hover:bg-slate-200/60"
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                <span>Journey Arc</span>
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* VIEW 1: LINE-BY-LINE VIEW */}
        {/* ------------------------------------------------------------ */}
        {lyricsViewMode === "lines" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedEmotionFilter("All")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    selectedEmotionFilter === "All"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "theme-well text-ink-muted hover:text-ink-main"
                  }`}
                >
                  All Lines ({lines.filter((l) => !l.isSectionHeader).length})
                </button>

                {presentEmotions.map(([emoKey, count]) => (
                  <button
                    key={emoKey}
                    type="button"
                    onClick={() => setSelectedEmotionFilter(emoKey)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                      selectedEmotionFilter === emoKey
                        ? "bg-purple-600 text-white shadow-sm"
                        : "theme-well text-ink-muted hover:text-ink-main"
                    }`}
                  >
                    <span>{emoKey}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                ))}
              </div>

              {/* Search Input within Lines */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search lyrics or cues..."
                  value={lineSearchQuery}
                  onChange={(e) => setLineSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl glass-input text-xs text-ink-main placeholder-neutral-500 light:placeholder-slate-400"
                />
              </div>
            </div>

            {/* Lines List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredLines.length > 0 ? (
                filteredLines.map((line) => {
                  if (line.isSectionHeader) {
                    return (
                      <div
                        key={`header-${line.lineIndex}`}
                        className="py-2.5 px-3 rounded-xl bg-purple-500/10 light:bg-purple-50 border border-purple-500/20 text-xs font-bold font-mono text-purple-300 light:text-purple-800 uppercase tracking-wider flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1.5">
                          <Split className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
                          {line.text}
                        </span>
                        <span className="text-[10px] text-purple-400/80 light:text-purple-600 font-sans font-normal">
                          Section Marker
                        </span>
                      </div>
                    );
                  }

                  const isExpanded = expandedLineIndex === line.lineIndex;
                  const probDist = line.emotionProbabilities || {};
                  const lineEmotionMeta = EMOTIONS_METADATA[line.emotion] || primaryMeta;
                  const lineToken = getEmotionToken(line.emotion);
                  const lineBadge = getEmotionBadgeStyle(line.emotion, isDark);

                  return (
                    <div
                      key={`line-${line.lineIndex}`}
                      className="rounded-2xl theme-well transition-all overflow-hidden hover:border-purple-500/30"
                      style={{
                        borderLeftWidth: "4px",
                        borderLeftColor: line.color || lineEmotionMeta.color || lineToken.color || "#a855f7"
                      }}
                    >
                      <div
                        onClick={() =>
                          setExpandedLineIndex(isExpanded ? null : line.lineIndex)
                        }
                        className="p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-[11px] font-mono text-ink-dim w-5 text-right shrink-0">
                            {line.lineIndex}
                          </span>

                          {line.sectionName && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 light:bg-slate-200 text-ink-muted shrink-0">
                              {line.sectionName}
                            </span>
                          )}

                          <span className="text-xs sm:text-sm font-medium text-ink-main truncate">
                            {line.text}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Code-switched line badge */}
                          {line.isCodeSwitched && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 light:bg-amber-50 border border-amber-500/30 text-amber-300 light:text-amber-800 font-mono font-medium"
                              title={`Code-switched line (${line.codeSwitchType || "mixed"})`}
                            >
                              🔀 CS
                            </span>
                          )}

                          {/* Line Uncertainty Warning */}
                          {line.isUncertain && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 light:bg-orange-50 border border-orange-500/30 text-orange-300 light:text-orange-800 font-mono flex items-center gap-0.5"
                              title={line.uncertaintyDetails?.warningReason || "Narrow decision margin between emotions"}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-orange-400 light:text-orange-600" />
                              <span className="hidden sm:inline">Margin</span>
                            </span>
                          )}

                          {/* Secondary Emotion Chips */}
                          {line.secondaryEmotions && line.secondaryEmotions.length > 0 && (
                            <div className="hidden md:flex items-center gap-1">
                              {line.secondaryEmotions.slice(0, 2).map((sec, sidx) => {
                                const secMeta = EMOTIONS_METADATA[sec] || {};
                                return (
                                  <span
                                    key={sidx}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 light:bg-white border border-white/10 light:border-slate-200 text-ink-secondary font-medium flex items-center gap-1"
                                    title={`Secondary emotion: ${sec}`}
                                  >
                                    <span className="text-[10px]">{secMeta.emoji || "•"}</span>
                                    <span>{sec}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Primary Emotion Pill */}
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 border"
                            style={lineBadge}
                          >
                            <span>{line.emoji || lineEmotionMeta.emoji || lineToken.emoji || "🎵"}</span>
                            <span>{line.emotion}</span>
                          </span>

                          <span className="text-[10px] font-mono text-ink-muted hidden sm:inline">
                            {line.confidence}%
                          </span>

                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-ink-muted" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-ink-muted" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Line Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-3.5 pt-2 text-xs text-ink-secondary border-t border-white/10 light:border-slate-200 bg-black/25 light:bg-slate-100/70 space-y-3"
                        >
                          <p className="font-sans leading-relaxed text-[11px] sm:text-xs text-ink-main">
                            {line.explanation}
                          </p>

                          {/* Keywords */}
                          {line.detectedKeywords?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-ink-dim font-mono">
                                Matched Cues:
                              </span>
                              {line.detectedKeywords.map((kw, ki) => (
                                <span
                                  key={ki}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 light:bg-white border border-transparent light:border-slate-200 text-ink-main"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Code-Switching & Uncertainty Line Attributes (Stage 6) */}
                          {(line.isCodeSwitched || line.isUncertain || (line.language && line.language !== "en")) && (
                            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                              {line.language && (
                                <span className="px-2 py-0.5 rounded bg-white/5 light:bg-white border border-white/10 light:border-slate-200 text-ink-secondary">
                                  Lang: {line.language.toUpperCase()}
                                </span>
                              )}
                              {line.isCodeSwitched && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 light:bg-amber-50 border border-amber-500/30 text-amber-300 light:text-amber-800">
                                  {getCodeSwitchLabel(line.codeSwitchType)}
                                </span>
                              )}
                              {line.isUncertain && (
                                <span className="px-2 py-0.5 rounded bg-orange-500/15 light:bg-orange-50 border border-orange-500/30 text-orange-300 light:text-orange-800">
                                  ⚠️ {line.uncertaintyDetails?.warningReason || "High uncertainty / Narrow margin"}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Line 10-Emotion Probabilities Mini Bars */}
                          {Object.keys(probDist).length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-white/10 light:border-slate-200">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">
                                Line Emotion Probability Distribution:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {Object.entries(probDist).map(([emoKey, pct]) => {
                                  const isDom = emoKey === line.emotion;
                                  const meta = EMOTIONS_METADATA[emoKey] || {};
                                  return (
                                    <div
                                      key={emoKey}
                                      className={`p-1.5 rounded-lg border text-[10px] space-y-1 ${
                                        isDom
                                          ? "bg-purple-500/15 light:bg-purple-50 border-purple-500/40"
                                          : "bg-white/5 light:bg-white border-white/10 light:border-slate-200"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className={`truncate ${isDom ? "font-bold text-purple-300 light:text-purple-700" : "text-ink-muted"}`}>
                                          {emoKey}
                                        </span>
                                        <span className="font-mono text-ink-secondary">
                                          {pct}%
                                        </span>
                                      </div>
                                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--chart-track)" }}>
                                        <div
                                          className="h-full rounded-full transition-all"
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
                        </motion.div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-xs text-ink-muted">
                  No lines found matching the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* VIEW 2: SONG SECTIONS BREAKDOWN VIEW */}
        {/* ------------------------------------------------------------ */}
        {lyricsViewMode === "sections" && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl theme-well flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-ink-secondary">
              <span className="flex items-center gap-2">
                <Split className="w-4 h-4 text-purple-400 light:text-purple-600" />
                <span>
                  <strong>{sections.length} Structural Sections</strong> detected via explicit lyric headers and stanza refrain repetition.
                </span>
              </span>
              <span className="text-[11px] text-ink-muted font-mono">
                Shannon Entropy & Intensity Calculated
              </span>
            </div>

            <div className="space-y-3">
              {sections.map((section, sidx) => {
                const isExpanded = expandedSectionIndex === sidx;
                const domMeta = EMOTIONS_METADATA[section.dominantEmotion] || primaryMeta;
                const domBadge = getEmotionBadgeStyle(section.dominantEmotion, isDark);

                return (
                  <div
                    key={`sec-${sidx}`}
                    className="rounded-2xl theme-well overflow-hidden transition-all hover:border-purple-500/30"
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: domMeta.color || getEmotionToken(section.dominantEmotion).color || "#a855f7"
                    }}
                  >
                    {/* Section Card Header */}
                    <div
                      onClick={() => setExpandedSectionIndex(isExpanded ? null : sidx)}
                      className="p-4 cursor-pointer select-none space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 light:bg-purple-50 text-purple-300 light:text-purple-700 border border-purple-500/30 font-bold font-mono text-xs">
                            {section.sectionName}
                          </span>
                          <span className="text-xs text-ink-muted">
                            Lines {section.startLine} - {section.endLine} ({section.lineCount} lines)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm border"
                            style={domBadge}
                          >
                            <span>{domMeta.emoji}</span>
                            <span>{section.dominantEmotion}</span>
                            <span className="text-[10px] font-mono opacity-80">
                              ({section.dominantPercentage}%)
                            </span>
                          </span>

                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-ink-muted" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-ink-muted" />
                          )}
                        </div>
                      </div>

                      {/* Section Metrics Row */}
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="p-2 rounded-xl bg-black/30 light:bg-white border border-white/5 light:border-slate-200">
                          <div className="text-[10px] text-ink-muted font-medium">Confidence</div>
                          <div className="text-xs font-mono font-bold text-ink-main">
                            {section.avgConfidence}%
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/30 light:bg-white border border-white/5 light:border-slate-200">
                          <div className="text-[10px] text-ink-muted font-medium">Intensity</div>
                          <div className="text-xs font-mono font-bold text-amber-300 light:text-amber-700">
                            {section.emotionalIntensity}/100
                          </div>
                        </div>

                        <div className="p-2 rounded-xl bg-black/30 light:bg-white border border-white/5 light:border-slate-200">
                          <div className="text-[10px] text-ink-muted font-medium">Diversity (H)</div>
                          <div className="text-xs font-mono font-bold text-sky-300 light:text-sky-700">
                            {section.emotionalDiversityScore}
                          </div>
                        </div>
                      </div>

                      {/* Section Mini Distribution Bar */}
                      {section.emotionProbabilities && (
                        <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: "var(--chart-track)" }}>
                          {Object.entries(section.emotionProbabilities)
                            .filter(([_, pct]) => pct > 0)
                            .map(([emo, pct]) => {
                              const meta = EMOTIONS_METADATA[emo] || {};
                              return (
                                <div
                                  key={emo}
                                  title={`${emo}: ${pct}%`}
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: meta.color || "#8b5cf6"
                                  }}
                                  className="h-full"
                                />
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* Section Collapsible Lines */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 pt-1 border-t border-white/10 light:border-slate-200 bg-black/30 light:bg-slate-100/70 space-y-2"
                      >
                        <div className="text-[11px] font-semibold text-ink-muted mb-2">
                          Lyrical Lines in this section:
                        </div>
                        {section.lines?.map((line, lidx) => {
                          const lineMeta = EMOTIONS_METADATA[line.emotion] || {};
                          return (
                            <div
                              key={lidx}
                              className="p-2.5 rounded-xl theme-card flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-[10px] font-mono text-ink-dim w-5">
                                  #{line.lineIndex}
                                </span>
                                <span className="text-ink-main truncate">
                                  {line.text}
                                </span>
                              </div>
                              <span
                                className="text-[11px] px-2 py-0.5 rounded-md font-semibold shrink-0 flex items-center gap-1 border"
                                style={getEmotionBadgeStyle(line.emotion, isDark)}
                              >
                                <span>{lineMeta.emoji}</span>
                                <span>{line.emotion}</span>
                              </span>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* VIEW 3: EMOTIONAL JOURNEY ARC VIEW */}
        {/* ------------------------------------------------------------ */}
        {lyricsViewMode === "journey" && emotionalJourney && (
          <div className="space-y-5">
            {/* Summary Text Callout */}
            {emotionalJourney.summaryText && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-neutral-900 to-indigo-950/40 light:from-purple-50 light:via-white light:to-indigo-50 border border-purple-500/30 light:border-purple-200 space-y-1">
                <div className="text-xs font-bold text-purple-300 light:text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Workflow className="w-4 h-4 text-purple-400 light:text-purple-600" />
                  <span>Emotional Journey Synthesis</span>
                </div>
                <p className="text-xs sm:text-sm text-ink-main leading-relaxed font-sans">
                  {emotionalJourney.summaryText}
                </p>
              </div>
            )}

            {/* Trajectory Card */}
            {emotionalJourney.beginningToEndingTrajectory && (
              <div className="p-5 rounded-2xl theme-well space-y-3">
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-sky-400 light:text-sky-600" />
                  <span>Beginning-to-Ending Trajectory Arc</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-black/40 light:bg-white border border-white/5 light:border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-ink-secondary">
                      {emotionalJourney.beginningToEndingTrajectory.startSection}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 light:bg-purple-50 text-purple-300 light:text-purple-700 font-semibold">
                      {emotionalJourney.beginningToEndingTrajectory.startEmotion}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-ink-muted text-xs font-mono">
                    <ArrowRight className="w-4 h-4 text-purple-400 light:text-purple-600 animate-pulse" />
                    <span>Progression</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-ink-secondary">
                      {emotionalJourney.beginningToEndingTrajectory.endSection}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 light:bg-emerald-50 text-emerald-300 light:text-emerald-700 font-semibold">
                      {emotionalJourney.beginningToEndingTrajectory.endEmotion}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-ink-secondary leading-relaxed font-sans">
                  {emotionalJourney.beginningToEndingTrajectory.arcDescription}
                </p>
              </div>
            )}

            {/* Strongest & Most Diverse Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strongest Section */}
              {emotionalJourney.strongestSection && (
                <div className="p-4 rounded-2xl bg-amber-500/10 light:bg-amber-50 border border-amber-500/20 light:border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300 light:text-amber-800 uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-400 light:text-amber-600" />
                    <span>Peak Emotional Section</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink-main font-mono">
                      {emotionalJourney.strongestSection.sectionName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 light:bg-amber-100 text-amber-300 light:text-amber-800 font-semibold">
                      {emotionalJourney.strongestSection.dominantEmotion}
                    </span>
                  </div>
                  <div className="text-xs text-ink-secondary">
                    Highest emotional intensity score across the lyrical composition:{" "}
                    <strong className="text-amber-300 light:text-amber-800 font-mono">
                      {emotionalJourney.strongestSection.emotionalIntensity}/100
                    </strong>
                  </div>
                </div>
              )}

              {/* Most Diverse Section */}
              {emotionalJourney.mostDiverseSection && (
                <div className="p-4 rounded-2xl bg-sky-500/10 light:bg-sky-50 border border-sky-500/20 light:border-sky-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-300 light:text-sky-800 uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-sky-400 light:text-sky-600" />
                    <span>Most Emotionally Diverse</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink-main font-mono">
                      {emotionalJourney.mostDiverseSection.sectionName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 light:bg-sky-100 text-sky-300 light:text-sky-800 font-semibold">
                      {emotionalJourney.mostDiverseSection.dominantEmotion}
                    </span>
                  </div>
                  <div className="text-xs text-ink-secondary">
                    Highest emotional complexity (Shannon Entropy H):{" "}
                    <strong className="text-sky-300 light:text-sky-800 font-mono">
                      {emotionalJourney.mostDiverseSection.diversityScore}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Significant Emotional Transitions */}
            {emotionalJourney.significantTransitions?.length > 0 && (
              <div className="p-5 rounded-2xl theme-well space-y-3">
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-2">
                  <GitCommit className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
                  <span>Significant Section Transitions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {emotionalJourney.significantTransitions.map((trans, tidx) => (
                    <div
                      key={tidx}
                      className="p-3 rounded-xl bg-black/40 light:bg-white border border-white/5 light:border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="font-mono font-bold text-ink-secondary truncate">
                          {trans.fromSection}
                        </span>
                        <span className="text-[10px] text-ink-muted">({trans.fromEmotion})</span>
                        <ArrowRight className="w-3 h-3 text-purple-400 light:text-purple-600 shrink-0" />
                        <span className="font-mono font-bold text-ink-main truncate">
                          {trans.toSection}
                        </span>
                        <span className="text-[10px] text-purple-300 light:text-purple-700">({trans.toEmotion})</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 light:bg-purple-50 text-purple-300 light:text-purple-700 font-semibold shrink-0">
                        Δ {trans.magnitude}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

