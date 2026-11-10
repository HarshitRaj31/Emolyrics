import { Filter, RotateCcw, Calendar, User, Globe, Disc3 } from "lucide-react";

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
  isAuthenticated = false
}) {
  const isFiltered =
    timeframe !== "all" ||
    mood !== "All" ||
    artist !== "All" ||
    (isAuthenticated && scope !== "mine");

  return (
    <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Scope Selector (if authenticated) & Title */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <span>Analytics Filters</span>
          </div>

          {isAuthenticated ? (
            <div className="flex p-1 bg-neutral-900 border border-white/10 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => onScopeChange("mine")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  scope === "mine"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <User className="w-3 h-3" />
                <span>My History</span>
              </button>
              <button
                type="button"
                onClick={() => onScopeChange("community")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  scope === "community"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>Global Dataset</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-neutral-400 font-medium px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-sky-400" />
              <span>Global Dataset Analysis</span>
            </span>
          )}
        </div>

        {/* Right: Reset Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold self-start lg:self-auto transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      {/* Filter Selectors Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Timeframe Selector */}
        <div className="space-y-1">
          <label className="block text-[11px] text-neutral-400 font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-neutral-500" />
            <span>Date Range</span>
          </label>
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Time History</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Emotion Filter */}
        <div className="space-y-1">
          <label className="block text-[11px] text-neutral-400 font-semibold flex items-center gap-1">
            <Disc3 className="w-3 h-3 text-neutral-500" />
            <span>Emotion Category</span>
          </label>
          <select
            value={mood}
            onChange={(e) => onMoodChange(e.target.value)}
            className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="All">All 9 Emotions</option>
            {availableMoods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Artist Filter */}
        <div className="space-y-1">
          <label className="block text-[11px] text-neutral-400 font-semibold flex items-center gap-1">
            <User className="w-3 h-3 text-neutral-500" />
            <span>Artist Filter</span>
          </label>
          <select
            value={artist}
            onChange={(e) => onArtistChange(e.target.value)}
            className="w-full bg-neutral-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
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
    </div>
  );
}

