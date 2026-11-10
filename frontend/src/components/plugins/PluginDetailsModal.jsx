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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-2xl bg-neutral-950 border border-white/15 rounded-3xl shadow-2xl shadow-purple-950/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Ambient Accent */}
        <div
          className="absolute top-0 left-0 right-0 h-32 opacity-25 pointer-events-none -z-10"
          style={{
            background: `radial-gradient(ellipse at 50% -20%, ${plugin.color} 0%, transparent 70%)`
          }}
        />

        {/* Header Section */}
        <div className="p-6 md:p-8 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
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
                <h2 className="font-display font-bold text-2xl text-white">{plugin.name}</h2>
                <span className="text-xs font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  v{plugin.version}
                </span>
                {plugin.featured && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-sans">{plugin.tagline}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                <span>By <strong className="text-neutral-300">{plugin.author}</strong></span>
                <span>•</span>
                <span className="bg-white/5 px-2 py-0.5 rounded text-neutral-300 text-[11px] border border-white/5">
                  {plugin.category}
                </span>
                <span>•</span>
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{plugin.rating}</span>
                  <span className="text-neutral-500">({plugin.reviewsCount} reviews)</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-6 md:px-8 bg-neutral-900/40">
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
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-neutral-400 hover:text-white"
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  Description
                </h4>
                <p className="text-neutral-300 leading-relaxed text-sm">{plugin.description}</p>
              </div>

              {/* Status Alert */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isActive
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                    : isInstalled
                    ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                    : "bg-neutral-900/80 border-white/10 text-neutral-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isActive ? "bg-emerald-400 animate-pulse" : isInstalled ? "bg-amber-400" : "bg-neutral-600"
                    }`}
                  />
                  <div>
                    <strong className="block text-white text-xs font-semibold">
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
                        ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                    }`}
                  >
                    {isEnabled ? "Disable" : "Enable"}
                  </button>
                )}
              </div>

              {/* Compliance & Legal Guarantee */}
              {plugin.complianceNotice && (
                <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Licensing & Content Compliance</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {plugin.complianceNotice}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Capabilities Included
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {plugin.features?.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-neutral-200 leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Scope & Security Controls
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                EmoLyrics uses a sandboxed adapter architecture. Plugins are strictly restricted to predefined data structures and cannot execute untrusted code.
              </p>
              <div className="space-y-2">
                {plugin.permissions?.map((perm, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/40 border border-white/5"
                  >
                    <Lock className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-xs text-neutral-300 font-mono">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 pt-4 border-t border-white/10 bg-neutral-900/60 flex items-center justify-between gap-3">
          {/* Settings Shortcut */}
          {isInstalled && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings(plugin);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-200 text-xs font-semibold border border-white/10 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configure Settings</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
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
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black hover:bg-amber-300 font-semibold text-xs transition-transform hover:scale-102 shadow-lg"
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
