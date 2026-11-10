import { Users, Music2, Disc3 } from "lucide-react";
import { MOOD_DEFINITIONS } from "../../data/examples";

export default function ArtistAnalyticsSection({
  topArtists = [],
  topSongs = [],
  totalAnalyses = 0
}) {
  const maxArtistCount = topArtists.length > 0 ? Math.max(...topArtists.map((a) => a.count)) : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Top Analyzed Artists (lg:col-span-6) */}
      <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="font-display font-bold text-lg text-white">Top Analyzed Artists</h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">
              {topArtists.length} Artists Ranked
            </span>
          </div>

          <p className="text-xs text-neutral-400 mt-2">
            Most frequently submitted artists across lyrical mood analyses
          </p>

          {topArtists.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No artist data recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5 mt-4">
              {topArtists.map((item, idx) => {
                const pct = Math.round((item.count / maxArtistCount) * 100);
                const moodDef = MOOD_DEFINITIONS[item.topMood];

                return (
                  <div key={item.artist || idx} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-neutral-500 font-mono w-4 text-[11px]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-white truncate max-w-[200px]">
                          {item.artist || "Independent / Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.topMood && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${moodDef?.color}20`,
                              color: moodDef?.color
                            }}
                          >
                            {moodDef?.emoji} {item.topMood}
                          </span>
                        )}
                        <span className="font-mono font-bold text-white">
                          {item.count} {item.count === 1 ? "track" : "tracks"}
                        </span>
                      </div>
                    </div>

                    {/* Horizontal Progress Bar */}
                    <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: moodDef?.color || "#f59e0b"
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
      <div className="lg:col-span-6 glass-panel rounded-3xl p-6 border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-display font-bold text-lg text-white">Top Analyzed Songs</h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Top Repeat Tracks</span>
          </div>

          <p className="text-xs text-neutral-400 mt-2">
            Most analyzed song titles and their dominant emotional classification
          </p>

          {topSongs.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No song data recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {topSongs.map((song, idx) => {
                const moodDef = MOOD_DEFINITIONS[song.mood];
                return (
                  <div
                    key={`${song.title}-${idx}`}
                    className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-neutral-500 font-mono w-4 text-[11px]">
                        #{idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-white truncate max-w-[220px]">
                          {song.title}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {song.artist || "Unknown Artist"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${moodDef?.color}20`,
                          color: moodDef?.color
                        }}
                      >
                        {moodDef?.emoji} {song.mood}
                      </span>
                      <span className="text-neutral-400 font-mono text-[11px]">
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

