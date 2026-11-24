import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Compass,
  ListMusic,
  ExternalLink,
  Music2,
  Quote,
  Flame,
  Search,
  ChevronRight
} from "lucide-react";
import { api } from "../../services/api";
import { usePersonalization } from "../../context/PersonalizationContext";
import { usePlayer } from "../../context/PlayerContext";
import { MOOD_DEFINITIONS } from "../../data/examples";
import { getEmotionBadgeStyle } from "../../utils/emotionTheme";

function SpotifyIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.502 17.307a.75.75 0 0 1-1.03.248c-2.82-1.723-6.37-2.113-10.55-1.158a.751.751 0 1 1-.336-1.464c4.572-1.044 8.508-.598 11.668 1.344.348.214.46.66.248 1.03zm1.468-3.266a.938.938 0 0 1-1.29.31c-3.226-1.984-8.145-2.557-11.96-1.398a.938.938 0 1 1-.546-1.794c4.364-1.325 9.787-.68 13.486 1.593.414.254.544.79.31 1.289zm.126-3.41c-3.868-2.297-10.25-2.508-13.935-1.39a1.125 1.125 0 0 1-.65-2.155c4.238-1.286 11.287-1.037 15.727 1.597a1.125 1.125 0 0 1-1.142 1.948z" />
    </svg>
  );
}

export default function EditorialJournalHome({ onSelectTrackForAnalysis }) {
  const navigate = useNavigate();
  const { recentlyAnalyzed } = usePersonalization();
  const { selectTrack } = usePlayer();

  const [leadTrack, setLeadTrack] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [curatedPlaylists, setCuratedPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadJournalData() {
      try {
        setLoading(true);
        // 1. Load real analyses
        const analysesRes = await api.getAnalyses({ limit: 8 });
        let serverTracks = [];
        if (analysesRes && analysesRes.items && Array.isArray(analysesRes.items)) {
          serverTracks = analysesRes.items;
        }

        const combined = [...(recentlyAnalyzed || []), ...serverTracks];
        const seen = new Set();
        const unique = [];
        for (const item of combined) {
          const key = `${(item.title || "").toLowerCase()}::${(item.artist || "").toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        if (isMounted) {
          setRecentAnalyses(unique);
          if (unique.length > 0) {
            setLeadTrack(unique[0]);
          }
        }

        // 2. Load real curated playlists
        const playlistsRes = await api.getPlaylists();
        if (isMounted) {
          let list = [];
          if (playlistsRes && playlistsRes.playlists && Array.isArray(playlistsRes.playlists)) {
            list = playlistsRes.playlists;
          } else if (Array.isArray(playlistsRes)) {
            list = playlistsRes;
          }
          setCuratedPlaylists(list.slice(0, 3));
        }
      } catch (err) {
        // silent fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadJournalData();
    return () => {
      isMounted = false;
    };
  }, [recentlyAnalyzed]);

  const emotionList = Object.keys(MOOD_DEFINITIONS);

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* 1. EDITORIAL HERO INTRO (Asymmetric Lead Article) */}
      <section className="border-b border-[var(--border-subtle)] pb-12 sm:pb-16">
        <div className="flex flex-col gap-2 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <span className="editorial-kicker">Critical Essay & Intelligence</span>
            <span className="text-[var(--border-strong)]">•</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">Vol. 4 • Edition 2026</span>
          </div>
          <h1 className="editorial-title text-3xl sm:text-5xl lg:text-6xl text-[var(--text-main)] max-w-4xl">
            The Architecture of Human Feeling in Verse & Sound.
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-2xl font-sans leading-relaxed mt-1">
            Song lyrics carry the emotional fingerprint of their authors. EmoLyrics dissects valence, poetic nuance,
            and sentiment across 9 calibrated emotion classes and 5 languages using trained natural language models.
          </p>
        </div>

        {/* Asymmetrical 2-Column Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Feature Column: Lead Track Dissection */}
          <div className="lg:col-span-8 editorial-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="editorial-kicker text-[10px]">Featured Lyrical Dissection</span>
              {leadTrack?.mood && (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                  style={{
                    backgroundColor: getEmotionBadgeStyle(leadTrack.mood).background,
                    color: getEmotionBadgeStyle(leadTrack.mood).color,
                    borderColor: getEmotionBadgeStyle(leadTrack.mood).border
                  }}
                >
                  {leadTrack.mood}
                  {leadTrack.confidence ? ` • ${Math.round(leadTrack.confidence)}% Confidence` : ""}
                </span>
              )}
            </div>

            <div className="space-y-3 my-2">
              <h2 className="editorial-title text-2xl sm:text-4xl text-[var(--text-main)]">
                {leadTrack?.title || "Coldplay — Fix You"}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] font-mono">
                By {leadTrack?.artist || "Coldplay"} • Natural Language Emotion Modeling
              </p>

              {/* Lyrical Quote Block */}
              <div className="editorial-well rounded-xl p-5 my-4 relative">
                <Quote className="w-6 h-6 text-[var(--accent-editorial)] opacity-30 absolute top-3 right-3" />
                <p className="editorial-italic text-sm sm:text-base text-[var(--text-main)] leading-relaxed">
                  "{leadTrack?.lyrics ? leadTrack.lyrics.slice(0, 240) + "..." : "Tears stream down your face when you lose something you cannot replace..."}"
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-3 text-xs">
                {leadTrack?.spotifyUrl && (
                  <a
                    href={leadTrack.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-emerald-500 transition-colors"
                  >
                    <SpotifyIcon className="w-3.5 h-3.5 fill-current" />
                    <span>Open in Spotify</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                )}
              </div>

              <button
                onClick={() => {
                  if (onSelectTrackForAnalysis && leadTrack) {
                    onSelectTrackForAnalysis(leadTrack);
                  } else {
                    const wb = document.getElementById("analyzer-workbench");
                    if (wb) wb.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent-editorial)] text-white hover:opacity-95 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deconstruct in The Lab</span>
              </button>
            </div>
          </div>

          {/* Right Column: Mood Spectrums & System Telemetry */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4">
            {/* Spectrums Box */}
            <div className="editorial-card rounded-2xl p-6 flex-1">
              <span className="editorial-kicker text-[10px] block mb-3">9 Calibrated Emotion Spectrums</span>
              <div className="flex flex-wrap gap-1.5">
                {emotionList.map((m) => {
                  const style = getEmotionBadgeStyle(m);
                  return (
                    <button
                      key={m}
                      onClick={() => navigate(`/explore?mood=${encodeURIComponent(m)}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                      style={{
                        backgroundColor: style.background,
                        color: style.color,
                        borderColor: style.border
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] space-y-2">
                <div className="flex justify-between">
                  <span>Languages Supported</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">EN, HI, BN, ES, FR</span>
                </div>
                <div className="flex justify-between">
                  <span>Inference Checkpoint</span>
                  <span className="font-mono font-bold text-[var(--text-main)]">Multilingual BiLSTM</span>
                </div>
                <div className="flex justify-between">
                  <span>Guest Access Mode</span>
                  <span className="font-mono font-bold text-emerald-500">Unrestricted</span>
                </div>
              </div>
            </div>

            {/* Quick Workbench Jump Card */}
            <div className="editorial-card rounded-2xl p-5 bg-[var(--bg-well)] flex items-center justify-between">
              <div>
                <h4 className="font-serif font-bold text-sm text-[var(--text-main)]">
                  Analyze Custom Lyrics
                </h4>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Paste any verses or lines directly
                </p>
              </div>
              <button
                onClick={() => {
                  const wb = document.getElementById("analyzer-workbench");
                  if (wb) wb.scrollIntoView({ behavior: "smooth" });
                }}
                className="p-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-page)] hover:opacity-90 transition-opacity"
                title="Scroll to Lyrics Lab"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RECENT LYRICAL INQUIRIES (Real Analyses from Database) */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <span className="editorial-kicker text-[10px]">Archive & Real-Time Record</span>
            <h3 className="editorial-title text-2xl text-[var(--text-main)]">
              Recent Lyrical Inquiries
            </h3>
          </div>
          <Link
            to="/explore"
            className="text-xs font-semibold text-[var(--accent-editorial)] hover:underline inline-flex items-center gap-1"
          >
            <span>Complete Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentAnalyses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentAnalyses.slice(0, 4).map((item) => {
              const style = item.mood ? getEmotionBadgeStyle(item.mood) : null;
              return (
                <div
                  key={item._id || item.id}
                  onClick={() => {
                    if (onSelectTrackForAnalysis) onSelectTrackForAnalysis(item);
                  }}
                  className="editorial-card rounded-xl p-4 flex flex-col justify-between hover:border-[var(--accent-editorial)] transition-all cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                      <span>{item.artist || "Unknown Artist"}</span>
                      {item.mood && (
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-semibold border"
                          style={{
                            color: style?.color,
                            borderColor: style?.border
                          }}
                        >
                          {item.mood}
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif font-bold text-base text-[var(--text-main)] group-hover:text-[var(--accent-editorial)] transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 italic">
                      "{item.lyrics ? item.lyrics.slice(0, 100) + "..." : "No lyrics stored."}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-subtle)] mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-dim)] font-mono">
                      {item.confidence ? `${Math.round(item.confidence)}% confidence` : "Analyzed"}
                    </span>
                    <span className="text-[var(--accent-editorial)] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Deconstruct <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-[var(--text-muted)]">
            Loading recent analyses from the catalog...
          </div>
        )}
      </section>

      {/* 3. CURATED ANTHOLOGIES (Real Playlists from Database) */}
      {curatedPlaylists.length > 0 && (
        <section className="space-y-6 border-t border-[var(--border-subtle)] pt-12">
          <div className="flex items-end justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <span className="editorial-kicker text-[10px]">Curated Soundscapes</span>
              <h3 className="editorial-title text-2xl text-[var(--text-main)]">
                Anthologies of Emotion
              </h3>
            </div>
            <Link
              to="/playlists"
              className="text-xs font-semibold text-[var(--accent-editorial)] hover:underline inline-flex items-center gap-1"
            >
              <span>All Anthologies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {curatedPlaylists.map((pl) => (
              <div
                key={pl._id || pl.id}
                onClick={() => navigate("/playlists")}
                className="editorial-card rounded-2xl p-5 flex flex-col justify-between hover:border-[var(--accent-editorial)] transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)] mb-2">
                    <span className="uppercase tracking-wider">{pl.mood || "Curated"}</span>
                    <span>{pl.songs ? pl.songs.length : 0} songs</span>
                  </div>
                  <h4 className="font-serif font-bold text-xl text-[var(--text-main)] group-hover:text-[var(--accent-editorial)] transition-colors">
                    {pl.name || `${pl.mood} Playlist`}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2">
                    Harmonized selection of tracks resonating with {pl.mood ? pl.mood.toLowerCase() : "emotional"} lyrical themes.
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] mt-4 flex items-center justify-between text-xs">
                  <span className="text-[var(--text-dim)] font-mono">Curated Collection</span>
                  <span className="text-[var(--accent-editorial)] font-semibold inline-flex items-center gap-1">
                    Open Collection <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
