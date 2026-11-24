import { useState, useEffect, useCallback } from "react";
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
  ChevronRight,
  X,
  Globe
} from "lucide-react";
import { api } from "../services/api";
import { MOOD_DEFINITIONS } from "../data/examples";
import { useTheme } from "../context/ThemeContext";
import { getEmotionToken } from "../utils/emotionTheme";

export default function ExplorePage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [analyzingId, setAnalyzingId] = useState(null);

  const moodsList = ["All", ...Object.keys(MOOD_DEFINITIONS)];

  const fetchItems = useCallback(async (targetPage = page, querySearch = search, moodFilter = selectedMood) => {
    setLoading(true);
    try {
      const cleanQ = (querySearch || "").trim();
      const res = await api.getAnalyses({
        mood: moodFilter,
        search: cleanQ,
        page: targetPage,
        limit: 9
      });

      let items = res.items || [];
      let total = res.pagination?.total || items.length;
      let pages = res.pagination?.pages || Math.ceil(total / 9) || 1;

      // Client-side fallback: If user searched a song and 0 items returned from backend analyses,
      // query MusicBrainz search directly via api.searchMusic to ensure complete consistency with Song Discovery
      if (cleanQ && items.length === 0) {
        try {
          const musicRes = await api.searchMusic(cleanQ, 9);
          if (musicRes && Array.isArray(musicRes.recordings) && musicRes.recordings.length > 0) {
            items = musicRes.recordings.map((rec) => ({
              _id: `global-${rec.id || Math.random().toString(36).slice(2, 9)}`,
              title: rec.title,
              artist: rec.artist,
              album: rec.album || "Single",
              lyrics: `Global music catalog track from ${rec.provider || "MusicBrainz"}. Click "Analyze Lyrics" to retrieve lyrics and classify emotional sentiment.`,
              mood: "Catalog",
              confidence: null,
              language: "Multilingual",
              spotifyUrl: rec.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(rec.title + " " + rec.artist)}`,
              youtubeUrl: rec.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(rec.title + " " + rec.artist + " audio")}`,
              isGlobalCatalog: true,
              provider: rec.provider || "MusicBrainz",
              explanation: `Verified recording from ${rec.provider || "MusicBrainz"} open catalog${rec.album ? ` (${rec.album})` : ""}.`,
              createdAt: rec.releaseDate || new Date().toISOString()
            }));
            total = items.length;
            pages = 1;
          }
        } catch (searchErr) {
          console.warn("Client fallback search failed:", searchErr);
        }
      }

      setAnalyses(items);
      setPagination({ total, pages, page: targetPage });
    } catch (err) {
      console.error("Failed to fetch analyses:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedMood]);

  useEffect(() => {
    fetchItems(page, search, selectedMood);
  }, [selectedMood, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (page === 1) {
      fetchItems(1, search, selectedMood);
    } else {
      setPage(1);
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    if (page === 1) {
      fetchItems(1, "", selectedMood);
    } else {
      setPage(1);
    }
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

  const handleReanalyze = async (item) => {
    // If it already has analyzed lyrics and is not an unanalyzed catalog track
    if (item.lyrics && !item.isGlobalCatalog) {
      navigate("/", {
        state: {
          reanalyzeSong: {
            title: item.title,
            artist: item.artist,
            lyrics: item.lyrics
          }
        }
      });
      return;
    }

    // For catalog track: fetch lyrics from authorized provider first
    try {
      setAnalyzingId(item._id);
      const res = await api.getLyrics({
        title: item.title,
        artist: item.artist,
        album: item.album
      });

      if (res && res.success && res.lyrics) {
        navigate("/", {
          state: {
            reanalyzeSong: {
              title: item.title,
              artist: item.artist,
              lyrics: res.lyrics
            }
          }
        });
      } else {
        // Instrumental or lyrics not listed; send song title & artist to discovery mode
        navigate("/", {
          state: {
            reanalyzeSong: {
              title: item.title,
              artist: item.artist,
              album: item.album
            }
          }
        });
      }
    } catch (err) {
      console.warn("Unable to prefetch lyrics for catalog song:", err);
      navigate("/", {
        state: {
          reanalyzeSong: {
            title: item.title,
            artist: item.artist
          }
        }
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="w-full space-y-8 transition-colors duration-200">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="editorial-kicker text-[10px]">Song Archive & Global Catalog</span>
          <span className="text-[var(--border-strong)]">•</span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">Verified Lyrical Records</span>
        </div>
        <h1 className="editorial-title text-3xl sm:text-4xl lg:text-5xl text-[var(--text-main)]">
          Discover Songs by Emotional Profile
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 max-w-2xl font-sans leading-relaxed">
          Search the global catalog or browse analyzed lyrical records. Filter by emotional sentiment to find music that resonates with your current state of feeling.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search catalog by title, artist, or verse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-28 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-main)] text-sm placeholder:text-[var(--text-dim)] focus:border-[var(--accent-editorial)] focus:outline-none transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-lg bg-[var(--accent-editorial)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-sm"
          >
            Search
          </button>
        </form>

        {/* Mood Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-[var(--accent-editorial)] text-white shadow-sm font-bold"
                    : "bg-[var(--bg-well)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]"
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
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-editorial)] mb-3" />
          <p className="text-sm font-sans">Scanning lyrical archives & sentiment profiles...</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="text-center py-20 editorial-card rounded-2xl p-8 max-w-lg mx-auto">
          <Music className="w-10 h-10 text-[var(--text-dim)] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif font-bold text-lg text-[var(--text-main)] mb-1">
            No Records Found
          </h3>
          <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
            {search
              ? `No tracks found matching "${search}". Try verifying artist spelling or searching by a broader keyword.`
              : "No tracks match the active mood filter in the catalog."}
          </p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedMood("All");
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl bg-[var(--accent-editorial)] text-white text-xs font-bold hover:opacity-95 transition-opacity"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyses.map((item) => {
            const moodInfo = MOOD_DEFINITIONS[item.mood] || {};
            const moodToken = getEmotionToken(item.mood);
            const moodStyle = getEmotionBadgeStyle(item.mood);
            const spotifyUrl = item.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(
              (item.title || "") + " " + (item.artist || "")
            )}`;
            const youtubeUrl = item.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(
              (item.title || "") + " " + (item.artist || "") + " audio"
            )}`;

            return (
              <div
                key={item._id}
                className="editorial-card rounded-2xl p-6 flex flex-col justify-between relative group hover:border-[var(--accent-editorial)] transition-all"
              >
                <div>
                  {/* Top Row: Mood Badge & Confidence */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {item.isGlobalCatalog ? "🌐" : (moodInfo?.emoji || moodToken?.emoji || "🎵")}
                      </span>
                      <div>
                        <div
                          className="font-sans font-bold text-xs"
                          style={{ color: item.isGlobalCatalog ? "var(--accent-editorial)" : moodStyle.color }}
                        >
                          {item.isGlobalCatalog ? "Global Catalog" : item.mood}
                        </div>
                        <div className="text-[10px] text-[var(--text-dim)] font-mono">
                          {item.language || "English"}
                        </div>
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-[var(--bg-well)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
                      {item.confidence != null && !isNaN(item.confidence) && item.confidence > 0
                        ? `${Math.round(item.confidence)}% Conf`
                        : item.isGlobalCatalog
                        ? "Catalog Track"
                        : "Verified"}
                    </div>
                  </div>

                  {/* Title & Artist */}
                  <h3 className="font-serif font-bold text-lg text-[var(--text-main)] group-hover:text-[var(--accent-editorial)] transition-colors truncate">
                    {item.title || "Untitled Track"}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono mb-3">{item.artist || "Unknown Artist"}</p>

                  {/* Lyrics Snippet */}
                  <div className="p-3.5 rounded-xl editorial-well mb-4">
                    <p className="editorial-italic text-xs text-[var(--text-main)] line-clamp-3 leading-relaxed whitespace-pre-line">
                      "{item.lyrics || `Track from global music library (${item.album || 'Single'}). Click 'Deconstruct' to analyze lyrics.`}"
                    </p>
                  </div>

                  {/* Explanation summary */}
                  {item.explanation && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {item.explanation}
                    </p>
                  )}
                </div>

                {/* External Links & Actions */}
                <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <a
                      href={spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--bg-well)] hover:bg-emerald-500/10 text-[var(--text-muted)] hover:text-emerald-500 border border-[var(--border-subtle)] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Listen on Spotify"
                    >
                      <Headphones className="w-3 h-3" />
                      <span>Spotify</span>
                    </a>
                    <a
                      href={youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--bg-well)] hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 border border-[var(--border-subtle)] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                      title="Listen on YouTube"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>YouTube</span>
                    </a>
                    <button
                      onClick={() => handleReanalyze(item)}
                      disabled={analyzingId === item._id}
                      className="py-1.5 px-3 rounded-lg bg-[var(--accent-editorial)] text-white hover:opacity-90 text-[11px] font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm"
                      title="Deconstruct in Lyrics Lab"
                    >
                      {analyzingId === item._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>The Lab</span>
                    </button>
                  </div>

                  {/* Footer details */}
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-dim)] font-mono">
                    <span>
                      {item.isGlobalCatalog
                        ? (item.provider || "MusicBrainz")
                        : item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "Verified"}
                    </span>
                    {item.album && (
                      <span className="truncate max-w-[140px] text-right" title={item.album}>
                        {item.album}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-[var(--border-subtle)]">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-lg editorial-card text-xs font-semibold text-[var(--text-main)] disabled:opacity-40 flex items-center gap-1 hover:border-[var(--accent-editorial)] transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <span className="text-xs text-[var(--text-muted)] font-mono px-3">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-lg editorial-card text-xs font-semibold text-[var(--text-main)] disabled:opacity-40 flex items-center gap-1 hover:border-[var(--accent-editorial)] transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
