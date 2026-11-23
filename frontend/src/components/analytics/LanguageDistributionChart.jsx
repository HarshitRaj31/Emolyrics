import { Globe, Languages } from "lucide-react";
import { motion } from "framer-motion";

export default function LanguageDistributionChart({
  distribution = [],
  totalAnalyses = 0
}) {
  const activeItems = distribution.filter((item) => item.count > 0);
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="glass-panel rounded-3xl p-6 space-y-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 light:border-slate-900/10">
        <div>
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-sky-400 light:text-sky-600" />
            <h3 className="font-display font-bold text-lg text-ink-main">
              Language Distribution
            </h3>
          </div>
          <p className="text-xs text-ink-muted">
            Linguistic sentiment distribution across supported global languages
          </p>
        </div>

        <span className="text-xs font-mono text-sky-300 light:text-sky-700 bg-sky-500/15 light:bg-sky-100 border border-sky-500/30 light:border-sky-200 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
          {activeItems.length} Active Languages
        </span>
      </div>

      {/* Language Breakdown Cards */}
      {totalAnalyses === 0 || distribution.length === 0 ? (
        <div className="py-12 text-center text-xs text-ink-dim">
          No language data recorded for this view.
        </div>
      ) : (
        <div className="space-y-3.5 py-1">
          {distribution.map((item, idx) => {
            const barWidth = Math.round((item.count / maxCount) * 100);

            return (
              <div key={item.language || idx} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">{item.flag || "🌐"}</span>
                    <span className="font-semibold text-ink-main">{item.language}</span>
                  </div>

                  <div className="flex items-center gap-2.5 font-mono">
                    <span className="text-ink-muted">{item.count} tracks</span>
                    <span
                      className="font-bold px-2 py-0.5 rounded-md text-[11px]"
                      style={{
                        backgroundColor: `${item.color || "#3b82f6"}22`,
                        color: item.color || "#3b82f6"
                      }}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-white/5 light:bg-slate-200 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: item.color || "#3b82f6"
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend & Language Scope Footnote */}
      <div className="pt-2 border-t border-white/5 light:border-slate-100 flex items-center justify-between text-[11px] text-ink-dim">
        <span className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-sky-400" />
          <span>Multilingual Natural Language Processing</span>
        </span>
        <span>5 Core Languages Supported</span>
      </div>
    </div>
  );
}
