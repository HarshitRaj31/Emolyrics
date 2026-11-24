import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  LayoutGrid,
  ListMusic,
  Plus,
  Sparkles,
  BarChart3,
  Bot,
  Blocks,
  Info,
  Music2,
  FolderPlus
} from "lucide-react";
import { api } from "../../services/api";
import { getEmotionBadgeStyle } from "../../utils/emotionTheme";

export default function LeftSidebar({ onOpenResearch, onNewPlaylist }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [libraryFilter, setLibraryFilter] = useState("All");
  const [playlists, setPlaylists] = useState([]);
  const [librarySearchOpen, setLibrarySearchOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadPlaylists() {
      try {
        const res = await api.getPlaylists();
        let serverList = [];
        if (res && res.playlists && Array.isArray(res.playlists)) {
          serverList = res.playlists;
        } else if (Array.isArray(res)) {
          serverList = res;
        }

        let localList = [];
        try {
          const raw = localStorage.getItem("emolyrics_guest_playlists");
          if (raw) localList = JSON.parse(raw);
        } catch {}

        if (isMounted) {
          // Merge local custom playlists with server presets
          const combined = [...localList, ...serverList];
          setPlaylists(combined);
        }
      } catch (err) {
        // Fallback to local guest playlists
        try {
          const raw = localStorage.getItem("emolyrics_guest_playlists");
          if (raw && isMounted) setPlaylists(JSON.parse(raw));
        } catch {}
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPlaylists();
    return () => {
      isMounted = false;
    };
  }, []);

  const mainNavItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/recommendations", label: "Search", icon: Search },
    { to: "/explore", label: "Explore", icon: LayoutGrid }
  ];

  const secondaryNavItems = [
    { to: "/playlists", label: "Playlists", icon: ListMusic },
    { to: "/assistant", label: "AI Assistant", icon: Bot, badge: "AI" },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/plugins", label: "Plugins", icon: Blocks }
  ];

  const filteredLibrary = playlists.filter((p) => {
    const title = p.name || p.title || p.mood || "Playlist";
    const matchesQuery = !libraryQuery.trim() || title.toLowerCase().includes(libraryQuery.toLowerCase());
    if (!matchesQuery) return false;

    if (libraryFilter === "Presets") {
      return p.isPreset === true || (!p.userId && p.mood);
    }
    if (libraryFilter === "Mine") {
      return p.userId || !p.isPreset;
    }
    return true;
  });

  return (
    <aside className="w-64 xl:w-72 flex-shrink-0 flex flex-col gap-3.5 select-none">
      {/* 1. Main Navigation Block (Rounded Glass Card) */}
      <div className="backdrop-blur-2xl bg-[#191a1f]/85 border border-white/[0.08] rounded-[24px] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-4 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white shadow-inner font-bold border border-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-white" : "text-zinc-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation Links */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-zinc-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={onOpenResearch}
            className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-colors text-left"
          >
            <Info className="w-4 h-4 text-zinc-400" />
            <span>Research & Docs</span>
          </button>
        </div>
      </div>

      {/* 2. Your Library Block (Real Playlists from Database & Guest Storage) */}
      <div className="backdrop-blur-2xl bg-[#191a1f]/85 border border-white/[0.08] rounded-[24px] p-4 flex-1 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
        <div>
          {/* Library Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <Link
              to="/playlists"
              className="flex items-center gap-2.5 text-zinc-300 hover:text-white transition-colors"
            >
              <ListMusic className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-bold tracking-tight">Your Library</span>
            </Link>
            <button
              onClick={() => setLibrarySearchOpen(!librarySearchOpen)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Search your library"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Library search input if toggled */}
          {librarySearchOpen && (
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search playlists..."
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                autoFocus
              />
            </div>
          )}

          {/* Meaningful Filter Pills */}
          <div className="flex items-center gap-1.5 mb-3.5">
            {["All", "Presets", "Mine"].map((filter) => {
              const isSelected = libraryFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setLibraryFilter(filter)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    isSelected
                      ? "bg-white/15 text-white border border-white/20"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-transparent"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Real Playlists List */}
          <div className="space-y-1.5 overflow-y-auto max-h-[260px] pr-1 custom-scrollbar">
            {filteredLibrary.length > 0 ? (
              filteredLibrary.map((item) => {
                const title = item.name || item.title || (item.mood ? `${item.mood} Playlist` : "Playlist");
                const songCount = item.songs ? item.songs.length : 0;
                const moodStyle = item.mood ? getEmotionBadgeStyle(item.mood) : null;

                return (
                  <Link
                    key={item._id || item.id}
                    to="/playlists"
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.05] transition-all group"
                  >
                    {/* Artwork / Mood Icon Tile */}
                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border border-white/10"
                      style={{
                        backgroundColor: moodStyle?.background || "rgba(255,255,255,0.08)"
                      }}
                    >
                      <Music2
                        className="w-4 h-4"
                        style={{ color: moodStyle?.color || "#ffffff" }}
                      />
                    </div>

                    {/* Playlist Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1">
                        <span>{item.mood || "Curated"}</span>
                        <span>•</span>
                        <span>{songCount} {songCount === 1 ? "song" : "songs"}</span>
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-8 px-2 text-zinc-400">
                <FolderPlus className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-zinc-400" />
                <p className="text-xs font-medium text-zinc-300">No Playlists Found</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Create or generate your first emotion playlist below.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* New Playlist Pill Button */}
        <div className="pt-3 border-t border-white/[0.06] mt-2">
          <button
            onClick={() => {
              if (onNewPlaylist) {
                onNewPlaylist();
              } else {
                navigate("/playlists");
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New playlist</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
