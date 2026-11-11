import { useState, useEffect } from "react";
import {
  X,
  Disc3,
  FileText,
  BrainCircuit,
  Headphones,
  Video,
  Languages,
  Puzzle,
  ShieldCheck,
  Star,
  CheckCircle2,
  Download,
  Trash2,
  Settings,
  ExternalLink,
  Lock,
  Layers,
  Sparkles
} from "lucide-react";

const ICON_MAP = {
  Disc3,
  FileText,
  BrainCircuit,
  Headphones,
  Video,
  Languages
};

export default function PluginDetailsModal({
  plugin,
  isOpen,
  onClose,
  onOpenSettings,
  onInstall,
  onUninstall,
  onToggle
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "features" | "permissions"

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !plugin) return null;

  const IconComponent = ICON_MAP[plugin.icon] || Puzzle;
  const isInstalled = Boolean(plugin.isInstalled);
  const isEnabled = Boolean(plugin.isEnabled);
  const isActive = isInstalled && isEnabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 light:bg-slate-900/50 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl theme-modal rounded-3xl shadow-2xl shadow-purple-950/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Ambient Accent */}
        <div
          className="absolute top-0 left-0 right-0 h-32 opacity-25 light:opacity-15 pointer-events-none -z-10"
          style={{
            background: `radial-gradient(ellipse at 50% -20%, ${plugin.color} 0%, transparent 70%)`
          }}
        />

        {/* Header Section */}
        <div className="p-6 md:p-8 pb-4 border-b border-white/10 light:border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center p-3 shadow-lg border shrink-0"
              style={{
                backgroundColor: `${plugin.color}20`,
                borderColor: `${plugin.color}40`,
                color: plugin.color
              }}
            >
              <IconComponent className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="font-display font-bold text-2xl text-ink-main">{plugin.name}</h2>
                <span className="text-xs font-mono text-ink-muted bg-white/5 light:bg-slate-100 px-2 py-0.5 rounded border border-white/10 light:border-slate-200">
                  v{plugin.version}
                </span>
                {plugin.featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 light:bg-amber-50 text-amber-300 light:text-amber-700 border border-amber-500/30">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-muted font-sans">{plugin.tagline}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-ink-muted flex-wrap">
                <span>By <strong className="text-ink-secondary">{plugin.author}</strong></span>
                <span>•</span>
                <span className="bg-white/5 light:bg-slate-100 px-2 py-0.5 rounded text-ink-secondary text-[11px] border border-white/10 light:border-slate-200">
                  {plugin.category}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1 text-amber-400 light:text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-400 light:fill-amber-500" />
                  <span>{plugin.rating}</span>
                  <span className="text-ink-dim">({plugin.reviewsCount} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full theme-well text-ink-muted hover:text-ink-main transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 light:border-slate-200 px-6 md:px-8 bg-neutral-900/40 light:bg-slate-50/90">
          {[
            { id: "overview", label: "Overview" },
            { id: "features", label: "Features & Output" },
            { id: "permissions", label: "Permissions & Security" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-amber-400 light:border-purple-600 text-amber-300 light:text-purple-700"
                  : "border-transparent text-ink-muted hover:text-ink-main"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-sm font-sans">
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
                  Description
                </h4>
                <p className="text-ink-secondary leading-relaxed text-sm">{plugin.description}</p>
              </div>

              {/* Status Alert */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isActive
                    ? "bg-emerald-950/20 light:bg-emerald-50 border-emerald-500/30 text-emerald-300 light:text-emerald-800"
                    : isInstalled
                    ? "bg-amber-950/20 light:bg-amber-50 border-amber-500/30 text-amber-300 light:text-amber-800"
                    : "theme-well text-ink-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isActive ? "bg-emerald-400 light:bg-emerald-500 animate-pulse" : isInstalled ? "bg-amber-400 light:bg-amber-500" : "bg-neutral-600 light:bg-slate-400"
                    }`}
                  />
                  <div>
                    <strong className="block text-ink-main text-xs font-semibold">
                      {isActive
                        ? "Integration Active & Ready"
                        : isInstalled
                        ? "Installed (Currently Disabled)"
                        : "Ready for Installation"}
                    </strong>
                    <span className="text-[11px] opacity-80">
                      {isActive
                        ? "Hooks are connected to the lyrics analysis pipeline."
                        : isInstalled
                        ? "Enable this integration below to start using its capabilities."
                        : "Safe one-click activation. No system restart needed."}
                    </span>
                  </div>
                </div>

                {isInstalled && (
                  <button
                    type="button"
                    onClick={() => onToggle(plugin.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isEnabled
                        ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white light:bg-slate-200 light:text-slate-700 light:hover:bg-slate-300 light:hover:text-slate-900"
                        : "bg-emerald-500 text-black light:text-white hover:bg-emerald-400"
                    }`}
                  >
                    {isEnabled ? "Disable" : "Enable"}
                  </button>
                )}
              </div>

              {/* Compliance & Legal Guarantee */}
              {plugin.complianceNotice && (
                <div className="p-4 rounded-2xl theme-well">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
                    <span>Licensing & Content Compliance</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {plugin.complianceNotice}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
                Capabilities Included
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {plugin.features?.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl theme-well"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-xs text-ink-secondary leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
                Scope & Security Controls
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                EmoLyrics uses a sandboxed adapter architecture. Plugins are strictly restricted to predefined data structures and cannot execute untrusted code.
              </p>
              <div className="space-y-2">
                {plugin.permissions?.map((perm, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl theme-well"
                  >
                    <Lock className="w-3.5 h-3.5 text-ink-muted" />
                    <span className="text-xs text-ink-secondary font-mono">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 pt-4 border-t border-white/10 light:border-slate-200 bg-neutral-900/60 light:bg-slate-50/90 flex items-center justify-between gap-3">
          {/* Settings Shortcut */}
          {isInstalled && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings(plugin);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl theme-well text-ink-secondary hover:text-ink-main text-xs font-semibold transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Settings</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl theme-well text-ink-muted hover:text-ink-main text-xs font-semibold transition-colors"
            >
              Close
            </button>

            {isInstalled ? (
              <button
                type="button"
                onClick={() => {
                  onUninstall(plugin.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/15 light:bg-red-50 hover:bg-red-500/25 light:hover:bg-red-100 text-red-400 light:text-red-700 border border-red-500/30 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Uninstall Plugin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onInstall(plugin.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black hover:bg-amber-300 light:bg-purple-600 light:text-white light:hover:bg-purple-700 font-semibold text-xs transition-transform hover:scale-102 shadow-lg"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Integration</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
