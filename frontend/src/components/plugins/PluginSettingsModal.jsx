import { useState, useEffect } from "react";
import { X, Settings, RotateCcw, Save, ShieldCheck, Check } from "lucide-react";

export default function PluginSettingsModal({
  plugin,
  isOpen,
  onClose,
  onSaveConfig
}) {
  const [formData, setFormData] = useState({});

  // Sync state when modal opens or plugin changes
  useEffect(() => {
    if (plugin) {
      setFormData(plugin.config || {});
    }
  }, [plugin, isOpen]);

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

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleResetDefaults = () => {
    const defaultVals = plugin.settingsFields?.reduce(
      (acc, field) => ({ ...acc, [field.key]: field.default }),
      {}
    );
    setFormData(defaultVals || {});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveConfig(plugin.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg bg-neutral-950 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: `${plugin.color}15`,
                borderColor: `${plugin.color}35`,
                color: plugin.color
              }}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                {plugin.name} Settings
              </h3>
              <p className="text-xs text-neutral-400">Configure parameters & user preferences</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm flex-1 font-sans">
          {plugin.settingsFields?.length > 0 ? (
            plugin.settingsFields.map((field) => (
              <div
                key={field.key}
                className="p-4 rounded-2xl bg-neutral-900/50 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white">
                      {field.label}
                    </label>
                    {field.description && (
                      <p className="text-[11px] text-neutral-400 leading-relaxed mt-0.5">
                        {field.description}
                      </p>
                    )}
                  </div>

                  {/* Boolean Toggle Control */}
                  {field.type === "boolean" && (
                    <button
                      type="button"
                      onClick={() => handleChange(field.key, !formData[field.key])}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData[field.key] ? "bg-amber-400" : "bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formData[field.key] ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Select Dropdown Control */}
                {field.type === "select" && (
                  <select
                    value={formData[field.key] ?? field.default}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50 transition-colors"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-neutral-900 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Number Input Control */}
                {field.type === "number" && (
                  <input
                    type="number"
                    value={formData[field.key] ?? field.default}
                    onChange={(e) => handleChange(field.key, Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-neutral-400 text-xs">
              This plugin does not require any additional user configuration.
            </div>
          )}

          <div className="p-3 rounded-xl bg-neutral-900/30 border border-white/5 flex items-center gap-2 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Settings are stored locally in your browser workspace.</span>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 pt-4 border-t border-white/10 bg-neutral-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black hover:bg-amber-300 font-semibold text-xs transition-transform hover:scale-102 shadow-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

