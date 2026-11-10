import { Sparkles, Brain, CheckCircle2, Globe, Music, Compass } from "lucide-react";
import { MOOD_DEFINITIONS } from "../../data/examples";

export default function AnalysisResultCard({ analysis, onFollowUp }) {
  if (!analysis) return null;

  const mood = analysis.mood || "Calm/Chill";
  const moodDef = MOOD_DEFINITIONS[mood] || {};
  const confidence = analysis.confidence ? Math.round(analysis.confidence) : 0;
  const language = analysis.language || "English";
  const scores = analysis.emotionScores || [];

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-purple-950/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-purple-950/30 light:from-white light:via-white light:to-purple-50/50 border border-white/10 dark:border-white/10 light:border-slate-200 overflow-hidden shadow-lg p-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0"
            style={{
              backgroundColor: `${moodDef.color || "#8b5cf6"}25`,
              border: `1px solid ${moodDef.color || "#8b5cf6"}50`
            }}
          >
            <span>{moodDef.emoji || "🎵"}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
                style={{
                  backgroundColor: `${moodDef.color || "#8b5cf6"}20`,
                  color: moodDef.color || "#c4b5fd",
                  border: `1px solid ${moodDef.color || "#8b5cf6"}40`
                }}
              >
                <span>{moodDef.emoji || "🎵"}</span>
                <span>{mood}</span>
              </span>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ML {confidence}% Conf</span>
              </span>

              {language && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  <span>{language}</span>
                </span>
              )}
            </div>

            {(analysis.title || analysis.artist) && (
              <h4 className="text-sm font-semibold text-white">
                {analysis.title || "Analyzed Song"} {analysis.artist && <span className="text-neutral-400 font-normal">by {analysis.artist}</span>}
              </h4>
            )}
          </div>
        </div>
      </div>

      {/* Rationale / Explanation */}
      {analysis.explanation && (
        <p className="text-xs text-neutral-300 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed mb-3">
          {analysis.explanation}
        </p>
      )}

      {/* Emotion Scores Breakdown (Top 3) */}
      {scores && scores.length > 0 && (
        <div className="space-y-1.5 mb-3 bg-neutral-950/50 p-2.5 rounded-xl border border-white/5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
            <Brain className="w-3 h-3 text-purple-400" />
            <span>Emotion Spectrum Breakdown</span>
          </div>
          {scores.slice(0, 3).map((item, idx) => {
            const scoreMoodDef = MOOD_DEFINITIONS[item.mood] || {};
            const pct = Math.round(item.score * 100);
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate text-neutral-300 text-[11px] flex items-center gap-1">
                  <span>{scoreMoodDef.emoji || "•"}</span>
                  <span className="truncate">{item.mood}</span>
                </span>
                <div className="flex-1 h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: scoreMoodDef.color || "#8b5cf6"
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up suggestions */}
      {onFollowUp && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            onClick={() => onFollowUp(`Recommend songs with ${mood} mood like this`)}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Compass className="w-3 h-3 text-purple-400" />
            <span>Find More {mood} Songs</span>
          </button>
          <button
            onClick={() => onFollowUp(`Create a playlist based on ${mood} mood`)}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Music className="w-3 h-3 text-amber-400" />
            <span>Generate Playlist</span>
          </button>
        </div>
      )}
    </div>
  );
}

