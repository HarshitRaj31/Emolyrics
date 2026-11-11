import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Layers,
  Activity,
  FileText,
  HelpCircle,
  TrendingUp,
  Zap
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle, getEmotionToken } from "../../utils/emotionTheme";

// Synthesize an evocative emotional tone descriptor from primary & secondary emotions
function getEmotionalTone(primaryEmotion, secondaryEmotions = []) {
  const toneMap = {
    Happiness: "Euphoric & Radiant",
    Sadness: "Melancholic & Vulnerable",
    Love: "Tender & Passionate",
    Anger: "Intense & Fiery",
    Nostalgia: "Bittersweet & Sentimental",
    Fear: "Apprehensive & Chilling",
    Excitement: "Kinetic & High-Octane",
    Hope: "Aspirational & Uplifting",
    Loneliness: "Solitary & Introspective",
    Calmness: "Tranquil & Serene"
  };

  const baseTone = toneMap[primaryEmotion] || "Reflective & Expressive";
  if (secondaryEmotions.length > 0) {
    const secName = secondaryEmotions[0]?.emotion;
    if (secName && secName !== primaryEmotion) {
      return `${baseTone} (with ${secName} undertones)`;
    }
  }
  return baseTone;
}

export default function EmotionSummaryCards({ data, onSelectEmotionFilter }) {
  const { isDark } = useTheme();
  const [showConfidenceHelp, setShowConfidenceHelp] = useState(false);

  const primaryEmotion = data?.primaryEmotion || "Happiness";
  const primaryMeta = data?.primaryEmotionMeta || {};
  const primaryToken = getEmotionToken(primaryEmotion);
  const secondaryEmotions = data?.secondaryEmotions || [];
  const emotionDistribution = data?.emotionDistribution || {};
  const confidence = data?.confidence !== undefined ? data.confidence : null;
  const aiInterpretation = data?.aiInterpretation || {};

  // Count how many emotions have > 0% in distribution or scored
  const activeEmotionCount = Object.values(emotionDistribution).filter(
    (pct) => pct > 0
  ).length || (1 + secondaryEmotions.length);

  const overallTone = getEmotionalTone(primaryEmotion, secondaryEmotions);
  const primaryTheme =
    aiInterpretation.mainThemes?.[0] ||
    primaryMeta.description?.split(",")[0] ||
    "Emotional Expression";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. PRIMARY EMOTION CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 theme-card relative overflow-hidden flex flex-col justify-between group hover:border-white/20 light:hover:border-slate-900/20 transition-all cursor-pointer"
        onClick={() => onSelectEmotionFilter && onSelectEmotionFilter(primaryEmotion)}
        title={`Click to filter by ${primaryEmotion}`}
      >
        <div
          className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-25 pointer-events-none"
          style={{ backgroundColor: primaryMeta.color || primaryToken.color }}
        />
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
            <span>Primary Emotion</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
          </div>
          <div className="flex items-center gap-3 my-1">
            <span className="text-3xl select-none">{primaryMeta.emoji || primaryToken.emoji}</span>
            <div>
              <div className="font-display font-black text-lg text-ink-main leading-tight">
                {primaryEmotion}
              </div>
              <span
                className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border"
                style={getEmotionBadgeStyle(primaryEmotion, isDark)}
              >
                Dominant Mood
              </span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-ink-muted line-clamp-2 mt-2 pt-2 border-t border-white/5 light:border-slate-900/10">
          {primaryMeta.description || "The central affective mood of the lyrics."}
        </p>
      </motion.div>

      {/* 2. SECONDARY EMOTIONS CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl p-4 theme-card flex flex-col justify-between hover:border-white/20 light:hover:border-slate-900/20 transition-all"
      >
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
            <span>Secondary Cues</span>
            <Layers className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
          </div>

          {secondaryEmotions.length > 0 ? (
            <div className="space-y-1.5 mt-1">
              {secondaryEmotions.slice(0, 2).map((sec, i) => (
                <div
                  key={i}
                  onClick={() => onSelectEmotionFilter && onSelectEmotionFilter(sec.emotion)}
                  className="flex items-center justify-between p-1.5 rounded-lg theme-well hover:border-white/20 light:hover:border-slate-900/20 transition-colors text-xs cursor-pointer"
                  title={`Filter by ${sec.emotion}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-sm select-none">{sec.emoji || getEmotionToken(sec.emotion).emoji}</span>
                    <span className="font-semibold text-ink-main truncate">{sec.emotion}</span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-muted font-bold shrink-0">
                    {sec.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-ink-muted py-2">
              Single dominant emotional voice
            </div>
          )}
        </div>
        <div className="text-[10px] text-ink-dim mt-2 pt-2 border-t border-white/5 light:border-slate-900/10">
          {secondaryEmotions.length > 2 ? `+${secondaryEmotions.length - 2} other co-occurring tones` : "Ranked secondary presence"}
        </div>
      </motion.div>

      {/* 3. MODEL CONFIDENCE SCORE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-4 theme-card flex flex-col justify-between hover:border-white/20 light:hover:border-slate-900/20 transition-all"
      >
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              Confidence
              <button
                type="button"
                onClick={() => setShowConfidenceHelp(!showConfidenceHelp)}
                className="text-ink-dim hover:text-ink-main transition-colors"
                aria-label="Toggle confidence explanation"
                title="Model Confidence Explanation"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </span>
            <Activity className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="font-display font-black text-2xl text-ink-main">
              {confidence !== null ? `${confidence}%` : "Estimated"}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 light:text-emerald-700 font-semibold">
              {confidence >= 80 ? "High Match" : "Calibrated"}
            </span>
          </div>

          {/* Meter */}
          <div className="w-full h-1.5 rounded-full bg-white/10 light:bg-slate-900/10 overflow-hidden my-1.5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${confidence !== null ? confidence : 75}%`,
                backgroundColor: primaryMeta.color || primaryToken.color
              }}
            />
          </div>
        </div>

        <div className="text-[10px] text-ink-dim pt-2 border-t border-white/5 light:border-slate-900/10">
          {showConfidenceHelp ? (
            <span className="text-purple-300 light:text-purple-700">
              Statistical model match probability, distinct from human subjective certainty.
            </span>
          ) : (
            "Model statistical probability"
          )}
        </div>
      </motion.div>

      {/* 4. EMOTION COUNT & DIVERSITY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl p-4 theme-card flex flex-col justify-between hover:border-white/20 light:hover:border-slate-900/20 transition-all"
      >
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
            <span>Spectrum Range</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-400 light:text-sky-600" />
          </div>

          <div className="flex items-baseline gap-1 my-1">
            <span className="font-display font-black text-2xl text-ink-main">
              {activeEmotionCount}
            </span>
            <span className="text-xs text-ink-muted font-semibold">/ 10 emotions</span>
          </div>

          <span className="inline-block text-[10px] font-medium text-sky-300 light:text-sky-700 bg-sky-500/15 light:bg-sky-100 px-2 py-0.5 rounded-full border border-sky-500/30 light:border-sky-300">
            {activeEmotionCount >= 4 ? "Multifaceted Spectrum" : "Focused Valence"}
          </span>
        </div>

        <div className="text-[10px] text-ink-dim mt-2 pt-2 border-t border-white/5 light:border-slate-900/10">
          Across {data?.totalLines || data?.lines?.length || 0} song lines
        </div>
      </motion.div>

      {/* 5. OVERALL EMOTIONAL TONE CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-4 theme-card flex flex-col justify-between hover:border-white/20 light:hover:border-slate-900/20 transition-all"
      >
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
            <span>Overall Tone</span>
            <Zap className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
          </div>

          <div className="font-display font-bold text-sm text-ink-main my-1 leading-snug">
            {overallTone}
          </div>
        </div>

        <div className="text-[10px] text-ink-dim mt-2 pt-2 border-t border-white/5 light:border-slate-900/10 truncate">
          Aesthetic lyrical valence
        </div>
      </motion.div>

      {/* 6. DOMINANT LYRICAL THEME CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl p-4 theme-card flex flex-col justify-between hover:border-white/20 light:hover:border-slate-900/20 transition-all"
      >
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-2">
            <span>Dominant Theme</span>
            <FileText className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
          </div>

          <div className="font-display font-bold text-sm text-purple-300 light:text-purple-700 my-1 truncate">
            #{primaryTheme}
          </div>

          {aiInterpretation.mainThemes?.length > 1 && (
            <div className="flex items-center gap-1 overflow-hidden mt-1">
              {aiInterpretation.mainThemes.slice(1, 3).map((th, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-1.5 py-0.2 rounded theme-well text-ink-muted truncate max-w-[80px]"
                >
                  #{th}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-[10px] text-ink-dim mt-2 pt-2 border-t border-white/5 light:border-slate-900/10 truncate">
          Synthesized narrative motif
        </div>
      </motion.div>
    </div>
  );
}

