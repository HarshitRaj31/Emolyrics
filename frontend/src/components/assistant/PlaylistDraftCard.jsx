import { useState } from "react";
import { ListMusic, Bookmark, Check, Headphones, Play, ExternalLink, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { MOOD_DEFINITIONS } from "../../data/examples";
import { Link } from "react-router-dom";

export default function PlaylistDraftCard({ playlist, onSave, isSaved = false }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(isSaved);

  if (!playlist) return null;

  const tracks = playlist.songs || [];
  const primaryMood = playlist.mood || (playlist.emotions && playlist.emotions[0]) || "Curated";
  const moodDef = MOOD_DEFINITIONS[primaryMood] || {};

  const handleSave = async () => {
    if (savedSuccess || saving || !onSave) return;
    setSaving(true);
    try {
      await onSave(playlist);
      setSavedSuccess(true);
    } catch (err) {
      console.error("Failed to save playlist draft:", err);
    } finally {
      setSaving(false);
    }
  };

  const previewTracks = expanded ? tracks : tracks.slice(0, 3);

  return (
    <div className="w-full rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 dark:from-neutral-900 dark:to-neutral-950 light:from-white light:to-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 overflow-hidden shadow-lg hover:border-purple-500/40 transition-all">
      {/* Header bar */}
      <div className="p-4 bg-gradient-to-r from-purple-900/20 via-neutral-900 to-neutral-900 dark:from-purple-900/20 dark:via-neutral-900 dark:to-neutral-900 light:from-purple-50 light:via-white light:to-white border-b border-white/5 dark:border-white/5 light:border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
              style={{
                backgroundColor: `${moodDef.color || "#8b5cf6"}25`,
                border: `1px solid ${moodDef.color || "#8b5cf6"}50`
              }}
            >
              <ListMusic className="w-5 h-5" style={{ color: moodDef.color || "#c4b5fd" }} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: `${moodDef.color || "#8b5cf6"}20`,
                    color: moodDef.color || "#c4b5fd",
                    border: `1px solid ${moodDef.color || "#8b5cf6"}40`
                  }}
                >
                  <span>{moodDef.emoji || "🎵"}</span>
                  <span>{primaryMood}</span>
                </span>
                <span className="text-[10px] text-neutral-400 bg-white/5 dark:bg-white/5 light:bg-slate-200 px-2 py-0.5 rounded-full">
                  {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white dark:text-white light:text-slate-900 leading-tight">
                {playlist.name || "AI Generated Mood Playlist"}
              </h4>
            </div>
          </div>

          {/* Action button */}
          <div>
            {savedSuccess ? (
              <Link
                to="/playlists"
                className="py-1.5 px-3 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/25 transition-colors"
                title="View in your Playlists library"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </Link>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md hover:shadow-purple-500/25 disabled:opacity-50"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Playlist"}</span>
              </button>
            )}
          </div>
        </div>

        {playlist.description && (
          <p className="text-xs text-neutral-300 mt-2.5 leading-relaxed line-clamp-2">
            {playlist.description}
          </p>
        )}
      </div>

      {/* Tracks list preview */}
      <div className="p-3 space-y-1.5 bg-neutral-950/40">
        {previewTracks.map((song, idx) => {
          const trackMoodDef = MOOD_DEFINITIONS[song.mood] || moodDef;
          return (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 border border-white/5 hover:border-white/10 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span className="text-[11px] font-mono text-neutral-500 w-4 text-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm shrink-0">{trackMoodDef.emoji || "🎵"}</span>
                <div className="truncate">
                  <div className="text-neutral-200 font-medium truncate">{song.title}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{song.artist}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={
                    song.spotifyUrl ||
                    `https://open.spotify.com/search/${encodeURIComponent(
                      song.title + " " + song.artist
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  title="Spotify"
                >
                  <Headphones className="w-3.5 h-3.5" />
                </a>
                <a
                  href={
                    song.youtubeUrl ||
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(
                      song.title + " " + song.artist + " audio"
                    )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="YouTube"
                >
                  <Play className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}

        {tracks.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full pt-1 pb-0.5 text-center text-[11px] font-medium text-neutral-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>View all {tracks.length} songs</span>
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

