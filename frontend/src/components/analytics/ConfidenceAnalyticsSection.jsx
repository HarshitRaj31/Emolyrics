import { ShieldCheck, AlertCircle, Info, Sparkles, Activity } from "lucide-react";
import { MOOD_DEFINITIONS } from "../../data/examples";

export default function ConfidenceAnalyticsSection({ confidenceAnalytics = {} }) {
  const {
    averageConfidence = 0,
    distribution = [],
    individualPoints = [],
    disclaimer = ""
  } = confidenceAnalytics;

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-bold text-lg text-white">Model Confidence Analytics</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Statistical certainty and keyword density metrics across natural language classifications
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold self-start sm:self-auto">
          <span>Average Confidence:</span>
          <span className="font-mono font-bold text-white text-sm">{averageConfidence}%</span>
        </div>
      </div>

      {/* Critical Confidence vs Accuracy Disclaimer */}
      <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 flex items-start gap-3 text-xs text-sky-200 leading-relaxed">
        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-300 block mb-0.5">
            Model Confidence vs. Prediction Accuracy
          </span>
          {disclaimer ||
            "Model confidence measures the statistical density and valence alignment of emotional keywords detected in lyrics by our NLP classification algorithm. High confidence indicates strong presence of emotional cues in the text—it is not an assertion of human ground-truth correctness or psychological accuracy."}
        </div>
      </div>

      {/* Grid: Distribution Buckets & Individual Points */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confidence Distribution Buckets (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Confidence Range Distribution</span>
          </h4>

          <div className="space-y-3 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            {distribution.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-300 font-medium">{item.range}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-neutral-400">{item.count} songs</span>
                    <span className="font-bold" style={{ color: item.color || "#10b981" }}>
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color || "#10b981"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Song Prediction Confidence (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Individual Song Prediction Confidence (Recent Sample)</span>
          </h4>

          {individualPoints.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No individual confidence data available.
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {individualPoints.map((song) => {
                const moodDef = MOOD_DEFINITIONS[song.mood];
                return (
                  <div
                    key={song.id}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[280px]">
                      <span className="text-sm select-none">{moodDef?.emoji}</span>
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{song.title}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{song.artist}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${moodDef?.color}20`,
                          color: moodDef?.color
                        }}
                      >
                        {song.mood}
                      </span>

                      <div className="w-16 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${song.confidence}%`,
                              backgroundColor: moodDef?.color || "#10b981"
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-white w-7 text-right">
                          {song.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

