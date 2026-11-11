import { Users, Music2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { getEmotionBadgeStyle, getEmotionToken } from "../../utils/emotionTheme";

export default function ArtistAnalyticsSection({
  topArtists = [],
  topSongs = []
}) {
  const { isDark } = useTheme();
  const maxArtistCount = topArtists.length > 0 ? Math.max(...topArtists.map((a) => a.count)) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Top Analyzed Artists (lg:col-span-6) */}
      <div className="lg:col-span-6 theme-card rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400 light:text-amber-600" />
              <h3 className="font-display font-bold text-lg text-ink-main">Top Analyzed Artists</h3>
            </div>
            <span className="text-xs text-ink-muted font-mono">
              {topArtists.length} Artists Ranked
            </span>
          </div>

          <p className="text-xs text-ink-muted mt-2">
            Most frequently submitted artists across lyrical mood analyses
          </p>

          {topArtists.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-dim">
              No artist data recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5 mt-4">
              {topArtists.map((item, idx) => {
                const pct = Math.round((item.count / maxArtistCount) * 100);
                const token = getEmotionToken(item.topMood);

                return (
                  <div key={item.artist || idx} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-ink-dim font-mono w-4 text-[11px]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-ink-main truncate max-w-[200px]">
                          {item.artist || "Independent / Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.topMood && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={getEmotionBadgeStyle(item.topMood, isDark)}
                          >
                            {token.emoji} {item.topMood}
                          </span>
                        )}
                        <span className="font-mono font-bold text-ink-main">
                          {item.count} {item.count === 1 ? "track" : "tracks"}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Progress Bar */}
                    <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "var(--chart-track)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: token.color || "#f59e0b"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Most Frequently Analyzed Songs (lg:col-span-6) */}
      <div className="lg:col-span-6 theme-card rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
              <h3 className="font-display font-bold text-lg text-ink-main">Top Analyzed Songs</h3>
            </div>
            <span className="text-xs text-ink-muted font-mono">Top Repeat Tracks</span>
          </div>

          <p className="text-xs text-ink-muted mt-2">
            Most analyzed song titles and their dominant emotional classification
          </p>

          {topSongs.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-dim">
              No song data recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {topSongs.map((song, idx) => {
                const token = getEmotionToken(song.mood);
                return (
                  <div
                    key={`${song.title}-${idx}`}
                    className="p-3 rounded-2xl theme-well hover:border-purple-500/30 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-ink-dim font-mono w-4 text-[11px]">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-ink-main truncate max-w-[220px]">
                          {song.title}
                        </div>
                        <div className="text-[11px] text-ink-muted truncate">
                          {song.artist || "Unknown Artist"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                        style={getEmotionBadgeStyle(song.mood, isDark)}
                      >
                        {token.emoji} {song.mood}
                      </span>
                      <span className="text-ink-muted font-mono text-[11px]">
                        {song.count} {song.count === 1 ? "run" : "runs"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

