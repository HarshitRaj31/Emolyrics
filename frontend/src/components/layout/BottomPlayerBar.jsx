import { useState } from "react";
import { Link } from "react-router-dom";
import {
  SkipBack,
  SkipForward,
  Sparkles,
  ExternalLink,
  Music2,
  Heart
} from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { getEmotionBadgeStyle } from "../../utils/emotionTheme";

function SpotifyIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.307a.75.75 0 0 1-1.03.248c-2.82-1.723-6.37-2.113-10.55-1.158a.751.751 0 1 1-.336-1.464c4.572-1.044 8.508-.598 11.668 1.344.348.214.46.66.248 1.03zm1.468-3.266a.938.938 0 0 1-1.29.31c-3.226-1.984-8.145-2.557-11.96-1.398a.938.938 0 1 1-.546-1.794c4.364-1.325 9.787-.68 13.486 1.593.414.254.544.79.31 1.289zm.126-3.41c-3.868-2.297-10.25-2.508-13.935-1.39a1.125 1.125 0 0 1-.65-2.155c4.238-1.286 11.287-1.037 15.727 1.597a1.125 1.125 0 0 1-1.142 1.948z" />
    </svg>
  );
}

function YoutubeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function BottomPlayerBar({ onOpenAnalyze }) {
  const { currentTrack, nextTrack, prevTrack, queue } = usePlayer();
  const [liked, setLiked] = useState(false);

  if (!currentTrack) {
    return (
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center">
        <div className="w-full max-w-4xl backdrop-blur-2xl bg-[#1b1c22]/90 border border-white/[0.1] rounded-[22px] px-5 py-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)] pointer-events-auto flex items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
              <Music2 className="w-3.5 h-3.5" />
            </div>
            <span>Select any track from Explore, Discovery, or Playlists to inspect emotions & listen.</span>
          </div>
          <Link
            to="/explore"
            className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Explore Music
          </Link>
        </div>
      </div>
    );
  }

  const moodStyle = currentTrack.mood ? getEmotionBadgeStyle(currentTrack.mood) : null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none flex justify-center">
      <div className="w-full max-w-4xl backdrop-blur-2xl bg-[#1b1c22]/95 border border-white/[0.12] rounded-[22px] px-5 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto flex items-center justify-between gap-4 select-none transition-all">
        {/* Left: Selected Track Info */}
        <div className="flex items-center gap-3.5 min-w-0 max-w-[40%]">
          {currentTrack.coverArt ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm border border-white/5">
              <img
                src={currentTrack.coverArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-white">
              <Music2 className="w-4 h-4 text-zinc-400" />
            </div>
          )}

          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate">
              {currentTrack.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 truncate">
              <span className="truncate">{currentTrack.artist}</span>
              {currentTrack.mood && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold border"
                  style={{
                    backgroundColor: moodStyle?.background || "rgba(255,255,255,0.1)",
                    color: moodStyle?.color || "#ffffff",
                    borderColor: moodStyle?.border || "rgba(255,255,255,0.2)"
                  }}
                >
                  {currentTrack.mood}
                  {currentTrack.confidence ? ` • ${Math.round(currentTrack.confidence)}%` : ""}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setLiked(!liked)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors ml-1 hidden sm:block"
            title={liked ? "Liked" : "Like"}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                liked ? "text-rose-500 fill-rose-500" : "text-zinc-400"
              }`}
            />
          </button>
        </div>

        {/* Center: Queue Navigation & Analysis Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {queue && queue.length > 1 && (
            <button
              onClick={prevTrack}
              className="p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
          )}

          {/* Core Analysis Action Button */}
          {onOpenAnalyze && (
            <button
              onClick={onOpenAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 text-xs font-semibold transition-all shadow-sm active:scale-95"
              title="Analyze Lyrics in Studio Workbench"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Analyze Lyrics</span>
            </button>
          )}

          {queue && queue.length > 1 && (
            <button
              onClick={nextTrack}
              className="p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>

        {/* Right: Actual Audio Playback Links (Spotify & YouTube) */}
        <div className="flex items-center gap-2">
          {currentTrack.spotifyUrl && (
            <a
              href={currentTrack.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
              title="Listen full song audio on Spotify"
            >
              <SpotifyIcon className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Spotify</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}

          {currentTrack.youtubeUrl && (
            <a
              href={currentTrack.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-[11px] font-semibold transition-colors"
              title="Listen full song audio on YouTube"
            >
              <YoutubeIcon className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">YouTube</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
