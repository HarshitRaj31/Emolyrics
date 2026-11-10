import { ExternalLink, Headphones, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { MOOD_DEFINITIONS } from "../../data/examples";

export default function SongRecommendationCard({ song }) {
  if (!song) return null;

  const moodDef = MOOD_DEFINITIONS[song.mood] || {};
  const isMLAnalyzed = song.source === "analyzed" || song.confidence > 0;

  return (
    <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-neutral-900/90 dark:bg-neutral-900/90 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-purple-500/40 transition-all shadow-md group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Mood Badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{
              backgroundColor: `${moodDef.color || "#8b5cf6"}20`,
              color: moodDef.color || "#c4b5fd",
              border: `1px solid ${moodDef.color || "#8b5cf6"}40`
            }}
          >
            <span>{moodDef.emoji || "🎵"}</span>
            <span>{song.mood || "Curated"}</span>
          </span>

          {/* Verification Status */}
          {isMLAnalyzed ? (
            <span
              className="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-300 dark:text-emerald-300 light:text-emerald-700 border border-emerald-500/30 flex items-center gap-1"
              title="Verified by EmoLyrics Multilingual NLP Model"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>ML {song.confidence ? `${song.confidence}%` : "Verified"}</span>
            </span>
          ) : (
            <span
              className="text-[9px] font-mono px-1.5 py-0.2 rounded text-neutral-400 bg-white/5 border border-white/10"
              title="Recommended based on musical & emotional metadata"
            >
              Mood Suggestion
            </span>
          )}
        </div>

        {/* Artwork & Details */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 dark:bg-neutral-800 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {song.coverArtUrl ? (
              <img
                src={song.coverArtUrl}
                alt={song.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-purple-600/30 to-amber-600/30 flex items-center justify-center">
                <span className="text-lg">{moodDef.emoji || "🎶"}</span>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs sm:text-sm text-white dark:text-white light:text-slate-900 truncate group-hover:text-amber-400 transition-colors">
              {song.title}
            </h4>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-slate-500 truncate">{song.artist}</p>
            {song.album && song.album !== "Single" && (
              <p className="text-[10px] text-neutral-500 truncate">{song.album}</p>
            )}
          </div>
        </div>

        {/* Short Recommendation Rationale */}
        {song.explanation && (
          <p className="text-[11px] text-neutral-300 dark:text-neutral-300 light:text-slate-600 leading-snug mt-2.5 p-2 rounded-xl bg-white/5 dark:bg-white/5 light:bg-slate-100 border border-white/5 dark:border-white/5 light:border-slate-200 font-sans">
            {song.explanation}
          </p>
        )}
      </div>

      {/* External Listening Action Links */}
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10 dark:border-white/10 light:border-slate-200">
        <a
          href={
            song.spotifyUrl ||
            `https://open.spotify.com/search/${encodeURIComponent(song.title + " " + song.artist)}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
          title="Open in Spotify Web Player"
        >
          <Headphones className="w-3 h-3" />
          <span>Spotify</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
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
          className="flex-1 py-1 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
          title="Open in YouTube"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>YouTube</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </a>
      </div>
    </div>
  );
}

