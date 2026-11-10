import { memo } from "react";
import {
  Disc3,
  FileText,
  BrainCircuit,
  Headphones,
  Video,
  Languages,
  Puzzle,
  Settings,
  Download,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Star,
  Sparkles,
  ArrowRight
} from "lucide-react";

// Dynamic icon mapper
const ICON_MAP = {
  Disc3,
  FileText,
  BrainCircuit,
  Headphones,
  Video,
  Languages
};

function PluginCardComponent({
  plugin,
  onOpenDetails,
  onOpenSettings,
  onInstall,
  onUninstall,
  onToggle
}) {
  const IconComponent = ICON_MAP[plugin.icon] || Puzzle;
  const isInstalled = Boolean(plugin.isInstalled);
  const isEnabled = Boolean(plugin.isEnabled);
  const isActive = isInstalled && isEnabled;

  return (
    <div
      className={`group relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between ${
        isActive
          ? "bg-neutral-900/80 border border-white/15 shadow-xl shadow-purple-950/10 hover:border-white/25 hover:shadow-2xl hover:-translate-y-1"
          : isInstalled
          ? "bg-neutral-900/40 border border-white/10 opacity-80 hover:opacity-100 hover:border-white/20 hover:-translate-y-0.5"
          : "bg-neutral-950/60 border border-white/5 hover:border-white/15 hover:bg-neutral-900/40 hover:-translate-y-0.5"
      }`}
    >
      {/* Subtle Ambient Hover Glow */}
      <div
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${plugin.color}15 0%, transparent 70%)`
        }}
      />

      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Logo / Icon */}
          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center p-3 shadow-md border transition-transform duration-300 group-hover:scale-105"
            style={{
              backgroundColor: `${plugin.color}15`,
              borderColor: `${plugin.color}35`,
              color: plugin.color
            }}
          >
            <IconComponent className="w-7 h-7" />
          </div>

          {/* Status Badges */}
          <div className="flex flex-col items-end gap-1.5">
            {plugin.featured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-2.5 h-2.5" /> Featured
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isActive
                    ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"
                    : isInstalled
                    ? "bg-neutral-500"
                    : "bg-neutral-700"
                }`}
              />
              <span className="text-[11px] font-semibold text-neutral-400">
                {isActive ? "Active" : isInstalled ? "Disabled" : "Not Installed"}
              </span>
            </div>
          </div>
        </div>

        {/* Plugin Title & Category */}
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <h3
              onClick={() => onOpenDetails(plugin)}
              className="font-display font-bold text-lg text-white group-hover:text-amber-300 cursor-pointer transition-colors"
            >
              {plugin.name}
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">v{plugin.version}</span>
          </div>
          <span className="inline-block text-[11px] font-medium text-neutral-400 bg-white/5 px-2.5 py-0.5 rounded-md mt-1 border border-white/5">
            {plugin.category}
          </span>
        </div>

        {/* Short Tagline / Description */}
        <p className="text-xs leading-relaxed text-neutral-400 line-clamp-2 mb-4 font-sans">
          {plugin.tagline || plugin.description}
        </p>

        {/* Author & Rating Metrics */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 pb-4 mb-4 border-b border-white/5">
          <span className="truncate max-w-[150px]">By {plugin.author}</span>
          <div className="flex items-center gap-1 text-amber-400/90 font-medium">
            <Star className="w-3 h-3 fill-amber-400/90" />
            <span>{plugin.rating}</span>
            <span className="text-neutral-600">({plugin.downloads})</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-2 pt-2">
        {/* Enable / Disable Switch (only if installed) */}
        {isInstalled ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggle(plugin.id)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEnabled ? "bg-emerald-500" : "bg-neutral-700"
              }`}
              title={isEnabled ? "Click to Disable" : "Click to Enable"}
              aria-label={`Toggle ${plugin.name}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs font-medium text-neutral-400">
              {isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
            <span>Verified Integration</span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Settings Button (visible if installed) */}
          {isInstalled && (
            <button
              type="button"
              onClick={() => onOpenSettings(plugin)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors border border-white/5"
              title="Configure Plugin Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Details Button */}
          <button
            type="button"
            onClick={() => onOpenDetails(plugin)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors border border-white/5 text-xs font-medium px-2.5"
            title="View Details"
          >
            Details
          </button>

          {/* Install / Uninstall Button */}
          {isInstalled ? (
            <button
              type="button"
              onClick={() => onUninstall(plugin.id)}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
              title="Uninstall Plugin"
              aria-label="Uninstall"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onInstall(plugin.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-amber-300 text-xs font-semibold shadow-md transition-all hover:scale-102"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// React.memo optimization to avoid re-renders of cards when filter text changes
export const PluginCard = memo(PluginCardComponent);
export default PluginCard;
