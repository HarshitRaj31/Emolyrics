import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Music2,
  Disc3,
  ExternalLink,
  Sparkles,
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Headphones
} from "lucide-react";
import { api } from "../services/api";

const PRESET_QUERIES = [
  { label: "Coldplay - Yellow (EN)", query: "Coldplay Yellow" },
  { label: "Arijit Singh - Kesariya (HI)", query: "Arijit Singh Kesariya" },
  { label: "Enrique Iglesias - Bailando (ES)", query: "Enrique Iglesias Bailando" },
  { label: "Édith Piaf - La Vie En Rose (FR)", query: "Edith Piaf La Vie En Rose" },
  { label: "Tagore - Ekla Cholo Re (BN)", query: "Rabindranath Tagore Ekla Cholo" },
  { label: "Queen - Bohemian Rhapsody", query: "Queen Bohemian Rhapsody" }
];

export default function SongDiscovery({ onAnalysisComplete }) {
  // Search state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState("");

  // Selected song & lyrics state
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsData, setLyricsData] = useState(null);
  const [lyricsError, setLyricsError] = useState("");

  // ML Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    let isMounted = true;
    async function doSearch() {
      setSearching(true);
      setSearchError("");

      try {
        const res = await api.searchMusic(debouncedQuery, 8);
        if (isMounted) {
          if (res.recordings && res.recordings.length > 0) {
            setSearchResults(res.recordings);
          } else {
            setSearchResults([]);
            setSearchError(`No tracks found matching "${debouncedQuery}" on MusicBrainz.`);
          }
        }
      } catch (err) {
        if (isMounted) {
          setSearchResults([]);
          setSearchError(err.message || "Failed to query MusicBrainz.");
        }
      } finally {
        if (isMounted) {
          setSearching(false);
        }
      }
    }

    doSearch();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Handle Song Selection: Fetch Lyrics from Authorized Provider
  const handleSelectSong = async (song) => {
    setSelectedSong(song);
    setLyricsLoading(true);
    setLyricsData(null);
    setLyricsError("");
    setAnalysisResult(null);

    try {
      const res = await api.getLyrics({
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.durationMs
      });

      if (res.success && res.lyrics) {
        setLyricsData(res);
      } else if (res.isInstrumental) {
        setLyricsData({
          isInstrumental: true,
          provider: res.provider || "LRCLIB",
          copyrightNotice: res.copyrightNotice || "Instrumental recording without lyrics."
        });
      } else {
        setLyricsError(
          res.error || `No authorized lyrics currently listed for "${song.title}".`
        );
      }
    } catch (err) {
      setLyricsError(err.message || "Unable to retrieve lyrics from authorized provider.");
    } finally {
      setLyricsLoading(false);
    }
  };

  // Run Existing ML Mood Prediction on Retrieved Lyrics
  const handleAnalyzeSelectedSong = async () => {
    if (!selectedSong || !lyricsData?.lyrics) return;

    setAnalyzing(true);
    try {
      const payload = {
        title: selectedSong.title,
        artist: selectedSong.artist,
        album: selectedSong.album,
        coverArtUrl: selectedSong.coverArtUrl,
        spotifyUrl: selectedSong.spotifyUrl,
        lyrics: lyricsData.lyrics,
        autoSave: true
      };

      const result = await api.analyzeSongWithMetadata(payload);
      setAnalysisResult(result);

      // Pass result up to parent AnalyzerPage to update ambient glow, circular gauge & curated playlists
      if (onAnalysisComplete) {
        onAnalysisComplete(result, {
          title: selectedSong.title,
          artist: selectedSong.artist,
          lyrics: lyricsData.lyrics
        });
      }
    } catch (err) {
      console.error("Analysis error:", err);
      alert(err.message || "Failed to classify lyrics mood.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedSong(null);
    setLyricsData(null);
    setLyricsError("");
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Search Box & Quick Chips */}
      <div className="theme-card rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Disc3 className="w-5 h-5 text-sky-400 light:text-sky-600" />
          <h2 className="font-display font-bold text-lg text-ink-main">
            MusicBrainz Song Discovery
          </h2>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/15 light:bg-sky-50 text-sky-300 light:text-sky-700 border border-sky-500/30 ml-auto">
            Open Metadata + LRCLIB
          </span>
        </div>

        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          Search the open MusicBrainz database by title, artist, or album. Select any track to retrieve legally authorized lyrics and run our 9-mood ML emotion model.
        </p>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-5 h-5 text-ink-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by song title, artist, or album (e.g. Coldplay, Bohemian Rhapsody)..."
            className="w-full glass-input rounded-2xl pl-12 pr-10 py-3.5 text-sm text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400 transition-all shadow-inner"
          />
          {searching ? (
            <Loader2 className="w-5 h-5 text-sky-400 light:text-sky-600 animate-spin absolute right-4 top-1/2 -translate-y-1/2" />
          ) : query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-main"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Preset Quick Chips */}
        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-white/10 light:border-slate-200">
          <span className="text-[11px] font-medium text-ink-muted">Popular:</span>
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setQuery(preset.query)}
              className="text-xs px-2.5 py-1 rounded-full theme-well text-ink-secondary hover:text-ink-main hover:border-purple-500/40 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Results Grid or Status */}
      {searchError && (
        <div className="p-4 rounded-2xl theme-well text-center text-xs text-ink-muted">
          <AlertCircle className="w-5 h-5 text-amber-400 light:text-amber-600 mx-auto mb-2" />
          {searchError}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-semibold text-sm text-ink-secondary">
              Select a Song from MusicBrainz
            </h3>
            <span className="text-xs text-ink-muted font-mono">
              {searchResults.length} matches found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {searchResults.map((song) => {
              const isCurrent = selectedSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  className={`group p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? "bg-sky-950/30 light:bg-sky-50 border-sky-500/50 shadow-md shadow-sky-500/10"
                      : "theme-card hover:border-purple-500/40"
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Artwork / Icon Thumbnail */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden theme-well shrink-0 flex items-center justify-center">
                      {song.coverArtUrl ? (
                        <img
                          src={song.coverArtUrl}
                          alt={song.album}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextElementSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full bg-gradient-to-tr from-sky-600/30 to-purple-600/30 flex items-center justify-center"
                        style={{ display: song.coverArtUrl ? "none" : "flex" }}
                      >
                        <Music2 className="w-5 h-5 text-sky-400/80 light:text-sky-600" />
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-ink-main truncate group-hover:text-sky-300 light:group-hover:text-sky-700 transition-colors">
                        {song.title}
                      </h4>
                      <p className="text-xs text-ink-muted truncate">{song.artist}</p>
                      <div className="flex items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                        <span className="truncate max-w-[140px]">{song.album}</span>
                        {song.releaseYear && <span>• {song.releaseYear}</span>}
                        {song.durationFormatted !== "--:--" && (
                          <span>• {song.durationFormatted}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* External Spotify Link (Requirement 1: external Spotify listening links where available) */}
                    {song.spotifyUrl && (
                      <a
                        href={song.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl theme-well hover:bg-emerald-500/20 text-ink-muted hover:text-emerald-400 light:hover:text-emerald-700 transition-colors"
                        title="Search and Listen on Spotify"
                      >
                        <Headphones className="w-4 h-4" />
                      </a>
                    )}

                    <div
                      className={`p-2 rounded-xl transition-colors ${
                        isCurrent
                          ? "bg-sky-500 text-black light:text-white font-bold"
                          : "theme-well text-ink-muted group-hover:text-ink-main"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Selected Song & Lyrics Preview Panel */}
      {selectedSong && (
        <div className="theme-card rounded-3xl p-6 shadow-2xl space-y-6 animate-fadeIn">
          {/* Header with Selected Track Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 light:border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl theme-well overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
                {selectedSong.coverArtUrl ? (
                  <img
                    src={selectedSong.coverArtUrl}
                    alt={selectedSong.album}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <Music2 className="w-7 h-7 text-sky-400 light:text-sky-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 light:text-sky-700">
                  Selected Recording
                </span>
                <h3 className="font-display font-bold text-xl text-ink-main">
                  {selectedSong.title}
                </h3>
                <p className="text-xs text-ink-secondary">
                  {selectedSong.artist} • <span className="text-ink-muted">{selectedSong.album}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedSong.spotifyUrl && (
                <a
                  href={selectedSong.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 light:bg-emerald-50 light:hover:bg-emerald-100 text-emerald-300 light:text-emerald-700 border border-emerald-500/30 text-xs font-semibold transition-colors"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Listen on Spotify</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
              <button
                type="button"
                onClick={handleClearSelection}
                className="p-1.5 rounded-xl theme-well text-ink-muted hover:text-ink-main"
                title="Clear Selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lyrics Loading State */}
          {lyricsLoading && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-sky-400 light:text-sky-600 animate-spin mx-auto" />
              <p className="text-xs text-ink-secondary font-medium">
                Retrieving authorized lyrics via LRCLIB REST provider...
              </p>
              <span className="text-[11px] text-ink-dim block">
                Verifying license and content without scraping
              </span>
            </div>
          )}

          {/* Lyrics Error State (Unavailable / Instrumental) */}
          {lyricsError && !lyricsLoading && (
            <div className="p-5 rounded-2xl bg-amber-950/20 light:bg-amber-50 border border-amber-500/30 text-amber-300 light:text-amber-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0" />
                <span>Lyrics Unavailable for this Track</span>
              </div>
              <p className="text-ink-muted leading-relaxed">{lyricsError}</p>
              <p className="text-[11px] text-ink-dim pt-1">
                Tip: You can switch to the &quot;Custom Lyrics&quot; tab above to paste lyrics manually.
              </p>
            </div>
          )}

          {lyricsData?.isInstrumental && !lyricsLoading && (
            <div className="p-5 rounded-2xl bg-sky-950/20 light:bg-sky-50 border border-sky-500/30 text-sky-300 light:text-sky-800 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Music2 className="w-4 h-4 text-sky-400 light:text-sky-600 shrink-0" />
                <span>Instrumental Track Verified</span>
              </div>
              <p className="text-ink-muted leading-relaxed">
                MusicBrainz and LRCLIB community records verify that this recording is instrumental. Emotion classification requires lyrical text content.
              </p>
            </div>
          )}

          {/* Lyrics Preview Container */}
          {lyricsData?.lyrics && !lyricsLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
                  <span className="text-xs font-semibold text-ink-main">Authorized Lyrics Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 light:text-emerald-700 bg-emerald-500/10 light:bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" /> {lyricsData.provider}
                  </span>
                  <span className="text-[11px] font-mono text-ink-dim">
                    {lyricsData.lyrics.split("\n").filter((l) => l.trim()).length} lines
                  </span>
                </div>
              </div>

              {/* Scrollable Lyrics Box */}
              <div className="theme-well rounded-2xl p-5 max-h-[260px] overflow-y-auto text-xs sm:text-sm text-ink-secondary leading-relaxed font-sans whitespace-pre-line shadow-inner">
                {lyricsData.lyrics}
              </div>

              {/* Action Button: Run Existing ML Model */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-ink-muted">
                  Ready to classify with 9-mood NLP dimensional model
                </span>
                <button
                  type="button"
                  onClick={handleAnalyzeSelectedSong}
                  disabled={analyzing}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-black hover:bg-amber-300 light:bg-purple-600 light:text-white light:hover:bg-purple-700 font-semibold text-xs sm:text-sm shadow-xl transition-transform hover:scale-102 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Classifying Mood...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-600 light:text-amber-300" />
                      <span>Analyze Mood with EmoLyrics ML</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

