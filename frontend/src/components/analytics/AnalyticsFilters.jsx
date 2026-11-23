import { Filter, RotateCcw, Calendar, User, Globe, Disc3, ShieldCheck, Trash2, Clock } from "lucide-react";

export default function AnalyticsFilters({
  scope = "community",
  onScopeChange,
  timeframe = "all",
  onTimeframeChange,
  mood = "All",
  onMoodChange,
  artist = "All",
  onArtistChange,
  onResetFilters,
  availableMoods = [],
  availableArtists = [],
  isAdmin = false,
  localCount = 0,
  onClearLocalHistory
}) {
  const isFiltered =
    timeframe !== "all" ||
    mood !== "All" ||
    artist !== "All";

  return (
    <div className="theme-card rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: View Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
            <Filter className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
            <span>View & Insights</span>
          </div>

          <div className="flex p-1 theme-well rounded-xl text-xs font-semibold gap-1">
            {/* Global Analytics Tab */}
            <button
              type="button"
              onClick={() => onScopeChange("community")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                scope === "community"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-ink-muted hover:text-ink-main"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global Analytics</span>
            </button>

            {/* My Activity Tab (Local Browser History) */}
            <button
              type="button"
              onClick={() => onScopeChange("local")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                scope === "local"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-ink-muted hover:text-ink-main"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Activity</span>
              {localCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  scope === "local" ? "bg-white/20 text-white" : "bg-purple-500/20 text-purple-300 light:text-purple-700"
                }`}>
                  {localCount}
                </span>
              )}
            </button>

            {/* Admin Analytics Tab (if user has admin role) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => onScopeChange("admin")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  scope === "admin"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-rose-400 hover:text-rose-300 light:text-rose-600"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Analytics</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {scope === "local" && localCount > 0 && onClearLocalHistory && (
            <button
              type="button"
              onClick={onClearLocalHistory}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 light:text-red-600 light:hover:text-red-700 font-semibold transition-colors px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/10"
              title="Clear your locally saved browser analysis history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear My Activity</span>
            </button>
          )}

          {isFiltered && scope !== "admin" && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 light:text-amber-700 light:hover:text-amber-800 font-semibold self-start lg:self-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Row (only for Global and My Activity views) */}
      {scope !== "admin" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Timeframe Selector */}
          <div className="space-y-1">
            <label className="text-[11px] text-ink-muted font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-ink-dim" />
              <span>Date Range</span>
            </label>
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-ink-main"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Emotion Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-ink-muted font-semibold flex items-center gap-1">
              <Disc3 className="w-3 h-3 text-ink-dim" />
              <span>Emotion Category</span>
            </label>
            <select
              value={mood}
              onChange={(e) => onMoodChange(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-ink-main"
            >
              <option value="All">All Emotions</option>
              {availableMoods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Artist Filter */}
          <div className="space-y-1">
            <label className="text-[11px] text-ink-muted font-semibold flex items-center gap-1">
              <User className="w-3 h-3 text-ink-dim" />
              <span>Artist</span>
            </label>
            <select
              value={artist}
              onChange={(e) => onArtistChange(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs text-ink-main"
            >
              <option value="All">All Artists</option>
              {availableArtists.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

