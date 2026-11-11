import { Brain, CheckCircle2, Globe, Music, Compass } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle, getEmotionToken } from "../../utils/emotionTheme";

export default function AnalysisResultCard({ analysis, onFollowUp }) {
  const { isDark } = useTheme();
  if (!analysis) return null;

  const mood = analysis.mood || "Calm/Chill";
  const token = getEmotionToken(mood);
  const confidence = analysis.confidence ? Math.round(analysis.confidence) : 0;
  const language = analysis.language || "English";
  const scores = analysis.emotionScores || [];

  return (
    <div className="w-full rounded-2xl theme-card bg-gradient-to-br from-neutral-900 via-neutral-900 to-purple-950/30 light:from-white light:via-white light:to-purple-50/70 overflow-hidden shadow-lg p-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 border"
            style={getEmotionBadgeStyle(mood, isDark)}
          >
            <span>{token.emoji || "🎵"}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border"
                style={getEmotionBadgeStyle(mood, isDark)}
              >
                <span>{token.emoji || "🎵"}</span>
                <span>{mood}</span>
              </span>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 light:text-emerald-700 light:bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>ML {confidence}% Conf</span>
              </span>

              {language && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 light:text-blue-700 light:bg-blue-500/10 border border-blue-500/30 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  <span>{language}</span>
                </span>
              )}
            </div>

            {(analysis.title || analysis.artist) && (
              <h4 className="text-sm font-semibold text-ink-main">
                {analysis.title || "Analyzed Song"} {analysis.artist && <span className="text-ink-muted font-normal">by {analysis.artist}</span>}
              </h4>
            )}
          </div>
        </div>
      </div>

      {/* Rationale / Explanation */}
      {analysis.explanation && (
        <p className="text-xs text-ink-secondary theme-well p-3 rounded-xl leading-relaxed mb-3">
          {analysis.explanation}
        </p>
      )}

      {/* Emotion Scores Breakdown (Top 3) */}
      {scores && scores.length > 0 && (
        <div className="space-y-1.5 mb-3 theme-well p-2.5 rounded-xl">
          <div className="text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1 flex items-center gap-1">
            <Brain className="w-3 h-3 text-purple-400 light:text-purple-600" />
            <span>Emotion Spectrum Breakdown</span>
          </div>
          {scores.slice(0, 3).map((item, idx) => {
            const scoreToken = getEmotionToken(item.mood);
            const pct = Math.round(item.score * 100);
            return (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate text-ink-secondary text-[11px] flex items-center gap-1">
                  <span>{scoreToken.emoji || "•"}</span>
                  <span className="truncate">{item.mood}</span>
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--chart-track)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: scoreToken.color || "#8b5cf6"
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-ink-muted w-8 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up suggestions */}
      {onFollowUp && (
        <div className="flex items-center gap-2 pt-2 border-t border-white/10 light:border-slate-200">
          <button
            onClick={() => onFollowUp(`Recommend songs with ${mood} mood like this`)}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 light:bg-purple-50 light:hover:bg-purple-100 light:text-purple-700 border border-purple-500/30 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Compass className="w-3 h-3 text-purple-400 light:text-purple-600" />
            <span>Find More {mood} Songs</span>
          </button>
          <button
            onClick={() => onFollowUp(`Create a playlist based on ${mood} mood`)}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 light:bg-slate-100 light:hover:bg-slate-200 text-ink-secondary border border-white/10 light:border-slate-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Music className="w-3 h-3 text-amber-400 light:text-amber-600" />
            <span>Generate Playlist</span>
          </button>
        </div>
      )}
    </div>
  );
}

