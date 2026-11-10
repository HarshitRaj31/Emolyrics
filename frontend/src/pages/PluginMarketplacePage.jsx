import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Blocks,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  Download,
  ShieldCheck,
  Puzzle,
  RotateCcw,
  Layers,
  ArrowRight,
  Info,
  X
} from "lucide-react";
import { PLUGIN_CATEGORIES } from "../data/pluginsData";
import { usePlugins } from "../context/PluginContext";
import PluginCard from "../components/plugins/PluginCard";
import PluginDetailsModal from "../components/plugins/PluginDetailsModal";
import PluginSettingsModal from "../components/plugins/PluginSettingsModal";

export default function PluginMarketplacePage() {
  const {
    plugins,
    stats,
    toast,
    dismissToast,
    installPlugin,
    uninstallPlugin,
    togglePlugin,
    updatePluginConfig
  } = usePlugins();

  // Search input state with debouncing
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "featured" | "installed" | "enabled"
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modals state
  const [selectedPluginForDetails, setSelectedPluginForDetails] = useState(null);
  const [selectedPluginForSettings, setSelectedPluginForSettings] = useState(null);

  // Debounce search input by 250ms for smooth 60fps typing without lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Memoized filtered plugins list
  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      // Category filter
      if (selectedCategory !== "All" && plugin.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === "featured" && !plugin.featured) return false;
      if (statusFilter === "installed" && !plugin.isInstalled) return false;
      if (statusFilter === "enabled" && !(plugin.isInstalled && plugin.isEnabled)) return false;

      // Debounced search query match
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase().trim();
        const inName = plugin.name.toLowerCase().includes(query);
        const inDesc = plugin.description.toLowerCase().includes(query);
        const inTagline = plugin.tagline?.toLowerCase().includes(query);
        const inAuthor = plugin.author.toLowerCase().includes(query);
        const inCategory = plugin.category.toLowerCase().includes(query);
        return inName || inDesc || inTagline || inAuthor || inCategory;
      }

      return true;
    });
  }, [plugins, selectedCategory, statusFilter, debouncedSearch]);

  // Featured plugins list
  const featuredPlugins = useMemo(() => {
    return plugins.filter((p) => p.featured);
  }, [plugins]);

  // Handlers for modal interactions
  const handleOpenDetails = useCallback((plugin) => {
    setSelectedPluginForDetails(plugin);
  }, []);

  const handleOpenSettings = useCallback((plugin) => {
    setSelectedPluginForSettings(plugin);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setSelectedCategory("All");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans pb-24">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className="bg-neutral-900 border border-white/20 shadow-2xl rounded-2xl p-4 flex items-center gap-3 max-w-md text-sm backdrop-blur-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-neutral-200 text-xs font-medium">{toast.message}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-10 px-4 sm:px-6 lg:px-8 border-b border-white/5">
        {/* Subtle Ambient Background Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px] bg-gradient-to-b from-purple-600/15 via-amber-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto text-center">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-4 shadow-sm">
            <Blocks className="w-3.5 h-3.5 text-purple-400" />
            <span>EmoLyrics Integration Ecosystem</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight text-white mb-3">
            Plugin Marketplace
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed font-sans">
            Extend your lyric emotion intelligence with verified open-source integrations, licensed lyrics providers, and audio-visual discovery plugins.
          </p>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-xl mx-auto mt-8">
            <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 text-center">
              <span className="block text-2xl font-display font-bold text-white">{stats.total}</span>
              <span className="text-[11px] text-neutral-400 font-medium">Catalog Plugins</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 text-center">
              <span className="block text-2xl font-display font-bold text-amber-400">{stats.installed}</span>
              <span className="text-[11px] text-neutral-400 font-medium">Installed</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 text-center">
              <span className="block text-2xl font-display font-bold text-emerald-400">{stats.active}</span>
              <span className="text-[11px] text-neutral-400 font-medium">Active Integrations</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Search & Status Tabs Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between mb-6">
          {/* Debounced Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search plugins by name, category, or capability..."
              className="w-full bg-neutral-900/90 border border-white/10 rounded-2xl pl-11 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-inner"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neutral-900/80 border border-white/10 self-start lg:self-auto overflow-x-auto max-w-full">
            {[
              { id: "all", label: "All Plugins", count: stats.total },
              { id: "featured", label: "Featured", count: featuredPlugins.length },
              { id: "installed", label: "Installed", count: stats.installed },
              { id: "enabled", label: "Enabled", count: stats.active }
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? "bg-white text-black shadow-md"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-black/10 text-neutral-800" : "bg-white/10 text-neutral-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Horizontal Scroll / Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 pr-2 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-medium">Category:</span>
          </div>
          {PLUGIN_CATEGORIES.map((cat) => {
            const isCurrent = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isCurrent
                    ? "bg-purple-600 text-white font-semibold shadow-sm"
                    : "bg-neutral-900/70 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-white/5"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Featured Plugins Spotlight (Visible on 'all' or 'featured' tabs when no search) */}
        {!debouncedSearch && (statusFilter === "all" || statusFilter === "featured") && selectedCategory === "All" && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="font-display font-bold text-lg text-white">Featured Integrations</h2>
              </div>
              <span className="text-xs text-neutral-400 font-sans">Handpicked verified plugins</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredPlugins.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onOpenDetails={handleOpenDetails}
                  onOpenSettings={handleOpenSettings}
                  onInstall={installPlugin}
                  onUninstall={uninstallPlugin}
                  onToggle={togglePlugin}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Filtered Plugins Section */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-white">
              {statusFilter === "featured"
                ? "Featured Plugins"
                : statusFilter === "installed"
                ? "Installed Plugins"
                : statusFilter === "enabled"
                ? "Active & Enabled Plugins"
                : selectedCategory !== "All"
                ? `${selectedCategory} Plugins`
                : "All Catalog Integrations"}
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              Showing {filteredPlugins.length} of {plugins.length}
            </span>
          </div>

          {filteredPlugins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlugins.map((plugin) => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  onOpenDetails={handleOpenDetails}
                  onOpenSettings={handleOpenSettings}
                  onInstall={installPlugin}
                  onUninstall={uninstallPlugin}
                  onToggle={togglePlugin}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 px-4 rounded-3xl bg-neutral-900/30 border border-white/5 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
                <Puzzle className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-lg text-white mb-2">No Matching Plugins Found</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                No integrations matched your current filter criteria &quot;{debouncedSearch || statusFilter}&quot;.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedPluginForDetails && (
        <PluginDetailsModal
          plugin={selectedPluginForDetails}
          isOpen={Boolean(selectedPluginForDetails)}
          onClose={() => setSelectedPluginForDetails(null)}
          onOpenSettings={handleOpenSettings}
          onInstall={installPlugin}
          onUninstall={uninstallPlugin}
          onToggle={togglePlugin}
        />
      )}

      {/* Settings Modal */}
      {selectedPluginForSettings && (
        <PluginSettingsModal
          plugin={selectedPluginForSettings}
          isOpen={Boolean(selectedPluginForSettings)}
          onClose={() => setSelectedPluginForSettings(null)}
          onSaveConfig={updatePluginConfig}
        />
      )}
    </div>
  );
}

