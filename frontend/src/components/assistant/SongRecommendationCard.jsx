import { ExternalLink, Headphones, Play, CheckCircle2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle, getEmotionToken } from "../../utils/emotionTheme";

export default function SongRecommendationCard({ song }) {
  const { isDark } = useTheme();
  if (!song) return null;

  const token = getEmotionToken(song.mood);
  const isMLAnalyzed = song.source === "analyzed" || song.confidence > 0;

  return (
    <div className="flex flex-col justify-between p-3.5 rounded-2xl theme-card hover:border-purple-500/40 transition-all shadow-md group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Mood Badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border"
            style={getEmotionBadgeStyle(song.mood, isDark)}
          >
            <span>{token.emoji || "🎵"}</span>
            <span>{song.mood || "Curated"}</span>
          </span>

          {/* Verification Status */}
          {isMLAnalyzed ? (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 light:bg-emerald-50 text-emerald-300 light:text-emerald-700 border border-emerald-500/30 flex items-center gap-1"
              title="Verified by EmoLyrics Multilingual NLP Model"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>ML {song.confidence ? `${song.confidence}%` : "Verified"}</span>
            </span>
          ) : (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded text-ink-muted bg-white/5 light:bg-slate-100 border border-white/10 light:border-slate-200"
              title="Recommended based on musical & emotional metadata"
            >
              Mood Suggestion
            </span>
          )}
        </div>

        {/* Artwork & Details */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl theme-well overflow-hidden shrink-0 flex items-center justify-center">
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
                <span className="text-lg">{token.emoji || "🎶"}</span>
              </div>
            )}
          </div>

          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs sm:text-sm text-ink-main truncate group-hover:text-amber-400 light:group-hover:text-amber-600 transition-colors">
              {song.title}
            </h4>
            <p className="text-[11px] text-ink-muted truncate">{song.artist}</p>
            {song.album && song.album !== "Single" && (
              <p className="text-[10px] text-ink-dim truncate">{song.album}</p>
            )}
          </div>
        </div>

        {/* Short Recommendation Rationale */}
        {song.explanation && (
          <p className="text-[11px] text-ink-secondary leading-snug mt-2.5 p-2 rounded-xl theme-well font-sans">
            {song.explanation}
          </p>
        )}
      </div>

      {/* External Listening Action Links */}
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10 light:border-slate-200">
        <a
          href={
            song.spotifyUrl ||
            `https://open.spotify.com/search/${encodeURIComponent(song.title + " " + song.artist)}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 light:bg-emerald-50 light:hover:bg-emerald-100 text-emerald-300 light:text-emerald-700 border border-emerald-500/30 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
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
          className="flex-1 py-1 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 light:bg-rose-50 light:hover:bg-rose-100 text-rose-300 light:text-rose-700 border border-rose-500/30 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
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

