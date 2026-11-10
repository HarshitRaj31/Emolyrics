import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Compass,
  Music,
  Trash2,
  Sparkles,
  Loader2,
  Headphones,
  Play,
  RotateCcw,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { api } from "../services/api";
import { MOOD_DEFINITIONS } from "../data/examples";

export default function ExplorePage() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const moodsList = ["All", ...Object.keys(MOOD_DEFINITIONS)];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalyses({
        mood: selectedMood,
        search,
        page,
        limit: 9
      });
      setAnalyses(res.items || []);
      setPagination(res.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error("Failed to fetch analyses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedMood, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this analysis?")) return;
    try {
      await api.deleteAnalysis(id);
      setAnalyses(analyses.filter((a) => a._id !== id));
    } catch (err) {
      alert("Failed to delete analysis: " + err.message);
    }
  };

  const handleReanalyze = (item) => {
    navigate("/", {
      state: {
        reanalyzeSong: {
          title: item.title,
          artist: item.artist,
          lyrics: item.lyrics
        }
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-200">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
          <Compass className="w-4 h-4" />
          <span>Lyrical Emotion Database</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900">
          Explore Analyzed Song Lyrics
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 dark:text-neutral-400 light:text-slate-600 mt-1 max-w-2xl leading-relaxed">
          Browse community tracks, benchmark dataset classifications, and lyrical sentiment across
          all 9 discrete mood spectrums.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4 mb-8">
        <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by song title, artist, or lyrical phrase..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-24 py-3 rounded-2xl glass-panel text-white dark:text-white light:text-slate-900 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

        {/* Mood Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {moodsList.map((m) => {
            const isSelected = selectedMood === m;
            const moodDef = MOOD_DEFINITIONS[m] || {};
            const emoji = moodDef.emoji || "";
            return (
              <button
                key={m}
                onClick={() => {
                  setSelectedMood(m);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white shadow-md scale-105"
                    : "bg-white/5 dark:bg-white/5 light:bg-slate-200/80 hover:bg-white/10 text-neutral-300 dark:text-neutral-300 light:text-slate-700 border border-white/5 dark:border-white/5 light:border-slate-300"
                }`}
              >
                {emoji && <span>{emoji}</span>}
                <span>{m}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Analyses */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
          <p className="text-sm">Fetching lyric analyses...</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-20 glass-panel rounded-3xl p-8 border border-white/10 max-w-lg mx-auto">
          <Music className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-white dark:text-white light:text-slate-900 mb-1">
            No Analyses Found
          </h3>
          <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-slate-600 mb-4">
            Try adjusting your search keywords or mood filter to explore more tracks.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedMood("All");
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((item) => {
            const moodInfo = MOOD_DEFINITIONS[item.mood] || {};
            const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(
              (item.title || "") + " " + (item.artist || "")
            )}`;
            const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
              (item.title || "") + " " + (item.artist || "") + " audio"
            )}`;

            return (
              <div
                key={item._id}
                className="glass-panel glass-panel-hover rounded-3xl p-6 flex flex-col justify-between border border-white/10 dark:border-white/10 light:border-slate-200 relative group"
              >
                <div>
                  {/* Top Row: Mood Badge & Confidence */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{moodInfo?.emoji || "🎵"}</span>
                      <div>
                        <div
                          className="font-display font-bold text-sm"
                          style={{ color: moodInfo?.color || "#c4b5fd" }}
                        >
                          {item.mood}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {item.language || "English"}
                        </div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-white/10 dark:bg-white/10 light:bg-slate-200 text-xs font-bold text-white dark:text-white light:text-slate-900 font-mono">
                      {Math.round(item.confidence)}% Conf
                    </div>
                  </div>

                  {/* Title & Artist */}
                  <h3 className="font-display font-bold text-base text-white dark:text-white light:text-slate-900 group-hover:text-purple-400 transition-colors">
                    {item.title || "Untitled Track"}
                  </h3>
                  <p className="text-xs text-neutral-400 mb-3">{item.artist || "Unknown Artist"}</p>

                  {/* Lyrics Snippet */}
                  <div className="p-3 rounded-xl bg-black/40 dark:bg-black/40 light:bg-slate-100 border border-white/5 dark:border-white/5 light:border-slate-200 mb-4">
                    <p className="text-xs text-neutral-300 dark:text-neutral-300 light:text-slate-700 italic line-clamp-3 leading-relaxed whitespace-pre-line font-sans">
                      "{item.lyrics}"
                    </p>
                  </div>

                  {/* Explanation summary */}
                  {item.explanation && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-400 light:text-slate-600 line-clamp-2 leading-relaxed">
                      {item.explanation}
                    </p>
                  )}
                </div>

                {/* External Links & Actions */}
                <div className="pt-4 mt-4 border-t border-white/10 dark:border-white/10 light:border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <a
                      href={spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Search on Spotify"
                    >
                      <Headphones className="w-3 h-3" />
                      <span>Spotify</span>
                    </a>
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Search on YouTube"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>YouTube</span>
                    </a>
                    <button
                      onClick={() => handleReanalyze(item)}
                      className="py-1 px-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      title="Re-analyze in Studio"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Studio</span>
                    </button>
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Verified"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-white dark:text-white light:text-slate-900 disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <span className="text-xs text-neutral-400 px-3">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-xl glass-panel text-xs font-semibold text-white dark:text-white light:text-slate-900 disabled:opacity-40 flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
