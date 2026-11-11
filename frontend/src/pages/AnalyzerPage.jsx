import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Music2,
  Play,
  RotateCcw,
  BookmarkPlus,
  Share2,
  Check,
  Disc3,
  Flame,
  Volume2,
  ListPlus,
  Search,
  FileText,
  Languages,
  Globe,
  AlertTriangle,
  Bot,
  ArrowRight,
  Headphones,
  Sliders,
  BarChart2,
  Shield,
  Layers,
  ChevronDown,
  Compass,
  CheckCircle2,
  Quote,
  PieChart,
  Brain
} from "lucide-react";
import confetti from "canvas-confetti";
import CircularProgress from "../components/CircularProgress";
import SongDiscovery from "../components/SongDiscovery";
import MoodRecommendations from "../components/MoodRecommendations";
import AdvancedMoodAnalysis from "../components/analysis/AdvancedMoodAnalysis";
import EmotionDashboard from "../components/dashboard/EmotionDashboard";
import PdfDownloadButton from "../components/dashboard/PdfDownloadButton";
import { MOOD_DEFINITIONS, EXAMPLE_LYRICS } from "../data/examples";
import { api } from "../services/api";
import { usePersonalization } from "../context/PersonalizationContext";
import { useTheme } from "../context/ThemeContext";
import { getEmotionBadgeStyle } from "../utils/emotionTheme";

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Select or Discover Lyrics",
    description:
      "Type or paste song lyrics in 5 supported languages, or search millions of songs instantly via authorized MusicBrainz and LRCLIB APIs.",
    icon: Search,
    color: "#a855f7"
  },
  {
    step: "02",
    title: "Multi-Layered NLP Processing",
    description:
      "Our native ML engine identifies script, evaluates semantic valence & arousal densities, and extracts subtle emotional nuances without machine translation distortion.",
    icon: Layers,
    color: "#3b82f6"
  },
  {
    step: "03",
    title: "Emotion Spectrum & Music Discovery",
    description:
      "Receive real-time confidence scores across 9 discrete mood classes, generated explanations, and personalized song recommendations matching that emotional vibe.",
    icon: Sparkles,
    color: "#f59e0b"
  }
];

const PLATFORM_FEATURES = [
  {
    icon: Globe,
    title: "Multilingual NLP Engine",
    description:
      "Native script recognition for English, Hindi, Bengali, Spanish, and French lyrics with language-aware emotion scoring.",
    tag: "Phase 6 NLP"
  },
  {
    icon: Bot,
    title: "Conversational AI Assistant",
    description:
      "Ask natural-language questions to discover mood-matched songs, explain lyrical classifications, and generate custom soundtracks.",
    tag: "Phase 8 AI"
  },
  {
    icon: Compass,
    title: "MusicBrainz Metadata",
    description:
      "Search songs by title, artist, or album with verified open metadata and direct Spotify & YouTube external listening links.",
    tag: "Open Source"
  },
  {
    icon: ListPlus,
    title: "Smart Mood Playlists",
    description:
      "Generate themed playlists by selecting single or blended emotions, customizing track lengths, and exporting to your library.",
    tag: "Phase 7 Smart"
  },
  {
    icon: BarChart2,
    title: "Interactive Analytics",
    description:
      "Monitor emotion distribution doughnuts, weekly mood timelines, artist frequencies, and average model confidence metrics.",
    tag: "Phase 5 Analytics"
  },
  {
    icon: Shield,
    title: "Authorized & Zero-Scraping",
    description:
      "100% compliant lyrics retrieval through official APIs (LRCLIB & MusicBrainz) with no scraping of copyrighted lyric sites.",
    tag: "Privacy & Ethics"
  }
];

export default function AnalyzerPage() {
  const { isDark } = useTheme();
  const { addAnalyzedSong } = usePersonalization();
  const [inputMode, setInputMode] = useState("discovery"); // "discovery" | "custom"
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentMood, setCurrentMood] = useState("neutral");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [curatedPlaylist, setCuratedPlaylist] = useState(null);

  // Multilingual State
  const [detectedLanguageInfo, setDetectedLanguageInfo] = useState(null);
  const [detectingLanguage, setDetectingLanguage] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  // Advanced AI Mood Analysis State
  const [advancedResult, setAdvancedResult] = useState(null);
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedError, setAdvancedError] = useState("");
  const [advancedTab, setAdvancedTab] = useState("dashboard"); // "dashboard" | "narrative"

  const workbenchRef = useRef(null);
  const advancedRef = useRef(null);
  const location = useLocation();

  const scrollToWorkbench = () => {
    workbenchRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAdvanced = () => {
    advancedRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Automatic Real-Time Language Detection as user types or pastes
  useEffect(() => {
    const trimmed = lyrics.trim();
    if (trimmed.length < 10) {
      setDetectedLanguageInfo(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setDetectingLanguage(true);
        const res = await api.detectLanguage(trimmed);
        if (res && res.success) {
          setDetectedLanguageInfo(res);
        }
      } catch (err) {
        // silent fallback
      } finally {
        setDetectingLanguage(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [lyrics]);

  // Optional Translation Handler
  const handleTranslate = async () => {
    if (!lyrics.trim()) return;
    if (translation) {
      setShowTranslation(!showTranslation);
      return;
    }

    setTranslating(true);
    try {
      const langCode = result?.languageCode || detectedLanguageInfo?.code || "auto";
      const res = await api.translateLyrics({
        text: lyrics,
        sourceLang: langCode,
        targetLang: "en"
      });
      if (res && res.success) {
        setTranslation(res);
        setShowTranslation(true);
      }
    } catch (err) {
      alert("Translation error: " + err.message);
    } finally {
      setTranslating(false);
    }
  };

  // Load Re-Analyzed song from Profile/Saved songs if passed
  useEffect(() => {
    if (location.state?.reanalyzeSong) {
      const { title: sTitle, artist: sArtist, lyrics: sLyrics } = location.state.reanalyzeSong;
      if (sTitle) setTitle(sTitle);
      if (sArtist) setArtist(sArtist);
      if (sLyrics && sLyrics.trim()) {
        setLyrics(sLyrics);
        setInputMode("custom");
        handleAnalyze(sLyrics);
      } else {
        setInputMode("discovery");
      }
      scrollToWorkbench();
    }
  }, [location.state]);

  // Trigger celebration confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleAnalyze = async (textToAnalyze = lyrics) => {
    const trimmed = textToAnalyze.trim();
    if (!trimmed) return;

    setLoading(true);
    setSaved(false);
    setTranslation(null);
    setShowTranslation(false);

    try {
      const data = await api.analyzeLyrics({
        lyrics: trimmed,
        title: title || undefined,
        artist: artist || undefined
      });

      setResult(data);
      setCurrentMood(data.mood);

      // Track into personal analyzed history
      addAnalyzedSong({
        title: title || "Custom Lyrics",
        artist: artist || "Unknown Artist",
        mood: data.mood,
        confidence: data.confidence,
        emoji: data.emoji,
        color: data.color
      });

      if (data.mood === "Happy" || data.mood === "Exciting") {
        triggerConfetti();
      }

      // Fetch curated songs for this mood
      try {
        const plRes = await api.getPlaylistByMood(data.mood);
        if (plRes && plRes.playlist) {
          setCuratedPlaylist(plRes.playlist);
        }
      } catch (e) {
        // Silent playlist fallback
      }
    } catch (err) {
      console.error("Classification error:", err);
      alert(err.message || "Failed to analyze lyrics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedAnalyze = async (textToAnalyze = lyrics) => {
    const trimmed = textToAnalyze.trim();
    if (!trimmed) return;

    setAdvancedLoading(true);
    setAdvancedError("");

    setTimeout(() => {
      scrollToAdvanced();
    }, 150);

    try {
      const data = await api.analyzeLyricsAdvanced({
        lyrics: trimmed,
        title: title || undefined,
        artist: artist || undefined
      });

      setAdvancedResult(data);
      setCurrentMood(data.primaryEmotion);

      // Track into personal analyzed history
      addAnalyzedSong({
        title: title || "Custom Lyrics",
        artist: artist || "Unknown Artist",
        mood: data.primaryEmotion,
        confidence: data.confidence,
        emoji: data.primaryEmotionMeta?.emoji || "🎵",
        color: data.primaryEmotionMeta?.color || "#a855f7"
      });

      if (data.primaryEmotion === "Happiness" || data.primaryEmotion === "Excitement") {
        triggerConfetti();
      }

      // Fetch curated songs for primary mood
      try {
        const plRes = await api.getPlaylistByMood(data.primaryEmotion);
        if (plRes && plRes.playlist) {
          setCuratedPlaylist(plRes.playlist);
        }
      } catch (e) {
        // silent fallback
      }
    } catch (err) {
      console.error("Advanced AI Analysis error:", err);
      setAdvancedError(err.message || "Failed to complete advanced AI analysis. Please try again.");
    } finally {
      setAdvancedLoading(false);
    }
  };

  const handleDiscoveryAnalysis = (analysisData, songData) => {
    setResult(analysisData);
    setCurrentMood(analysisData.mood);
    setTitle(songData.title || "");
    setArtist(songData.artist || "");
    setLyrics(songData.lyrics || "");
    setSaved(false);

    // Track into personal analyzed history
    addAnalyzedSong({
      title: songData.title || "Discovered Song",
      artist: songData.artist || "Unknown Artist",
      mood: analysisData.mood,
      confidence: analysisData.confidence,
      emoji: analysisData.emoji,
      color: analysisData.color
    });

    if (analysisData.mood === "Happy" || analysisData.mood === "Exciting") {
      triggerConfetti();
    }

    api.getPlaylistByMood(analysisData.mood)
      .then((plRes) => {
        if (plRes && plRes.playlist) {
          setCuratedPlaylist(plRes.playlist);
        }
      })
      .catch(() => {});
  };

  const loadExample = (item) => {
    setInputMode("custom");
    setLyrics(item.lyrics);
    setTitle(item.title);
    setArtist(item.artist);
    setResult(null);
    setCurrentMood("neutral");
    scrollToWorkbench();
    handleAnalyze(item.lyrics);
  };

  const clearForm = () => {
    setLyrics("");
    setTitle("");
    setArtist("");
    setResult(null);
    setCurrentMood("neutral");
    setCuratedPlaylist(null);
    setTranslation(null);
    setShowTranslation(false);
    setDetectedLanguageInfo(null);
    setAdvancedResult(null);
    setAdvancedError("");
    setAdvancedLoading(false);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await api.saveAnalysis({
        title: title || "Analyzed Song",
        artist: artist || "Unknown Artist",
        lyrics,
        mood: result.mood,
        confidence: result.confidence,
        explanation: result.explanation,
        language: result.language
      });

      try {
        await api.saveFavoriteSong({
          title: title || "Analyzed Song",
          artist: artist || "Unknown Artist",
          mood: result.mood,
          confidence: result.confidence,
          lyrics
        });
      } catch {
        // Ignore duplicate save
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Failed to save analysis: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `EmoLyrics Analysis:\nMood: ${result.mood} ${result.emoji}\nConfidence: ${result.confidence}%\nExplanation: ${result.explanation}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = lyrics.trim() ? lyrics.trim().split(/\s+/).length : 0;
  const activeMoodInfo = MOOD_DEFINITIONS[currentMood];

  return (
    <div className="relative min-h-[calc(100vh-65px)] overflow-hidden pb-16">
      {/* Dynamic Ambient Background Glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMood}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className={`fixed inset-0 pointer-events-none -z-10 bg-gradient-to-br ${
            isDark
              ? activeMoodInfo
                ? activeMoodInfo.bgClass
                : "from-neutral-950 via-neutral-950 to-neutral-950"
              : "from-[#f3f4f8] via-purple-50/40 to-indigo-50/35"
          }`}
        />
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. PREMIUM LANDING HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Animated Header Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 dark:bg-white/5 light:bg-purple-100/80 border border-white/10 dark:border-white/10 light:border-purple-200 text-xs font-semibold text-neutral-300 dark:text-neutral-300 light:text-purple-800 shadow-sm backdrop-blur-md">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-3 bg-purple-500 rounded-full soundwave-bar" />
              <span className="w-1.5 h-4 bg-amber-400 rounded-full soundwave-bar [animation-delay:-0.2s]" />
              <span className="w-1.5 h-2 bg-emerald-400 rounded-full soundwave-bar [animation-delay:-0.4s]" />
            </span>
            <span>Next-Generation Multilingual Music Emotion Intelligence</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 light:bg-purple-200/80 text-purple-300 light:text-purple-800 font-mono">
              9-Emotion NLP
            </span>
          </div>

          {/* Hero Main Heading */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink-main leading-[1.1]">
            Decode the Emotion Behind{" "}
            <span className="gradient-text-purple">Every Lyric</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto leading-relaxed font-sans">
            Explore how song lyrics evoke joy, sorrow, adrenaline, or tranquility. Powered by a
            fine-tuned 9-mood lexical NLP model, MusicBrainz song search, and an interactive AI Music Assistant.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={scrollToWorkbench}
              className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base flex items-center gap-2 shadow-xl shadow-purple-600/25 hover:shadow-purple-600/40 hover:scale-102 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Analyze Lyrics Now</span>
            </button>

            <Link
              to="/assistant"
              className="py-3.5 px-6 rounded-2xl bg-white/10 light:bg-white hover:bg-white/15 light:hover:bg-slate-100 text-ink-main font-bold text-sm sm:text-base flex items-center gap-2 border border-white/15 light:border-slate-300 hover:scale-102 transition-all shadow-md"
            >
              <Bot className="w-4 h-4 text-purple-400 light:text-purple-600" />
              <span>Ask AI Music Assistant</span>
            </Link>

            <Link
              to="/explore"
              className="py-3.5 px-5 rounded-2xl bg-white/5 light:bg-white hover:bg-white/10 light:hover:bg-slate-100 text-ink-secondary font-semibold text-sm flex items-center gap-1.5 border border-white/10 light:border-slate-200 transition-colors"
            >
              <Compass className="w-4 h-4 text-sky-400 light:text-sky-600" />
              <span>Explore Songs</span>
            </Link>
          </div>

          {/* Proof Badges Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-ink-muted font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              <span>9 Trained Emotion Classes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              <span>5 Languages & Native Scripts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              <span>MusicBrainz Live Search</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
              <span>Zero-Scraping Policy</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. HOW IT WORKS 3-STEP SECTION */}
      {/* ============================================================ */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-y border-white/5 light:border-slate-200/80">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400 light:text-purple-600 mb-1.5">
            Architecture Workflow
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-main">
            How EmoLyrics Analyzes Music Emotion
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS_STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-3xl theme-card shadow-lg group hover:border-purple-500/40 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                    style={{ backgroundColor: `${s.color}20`, border: `1px solid ${s.color}40` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: s.color }} />
                  </div>
                  <span className="font-mono text-2xl font-black text-neutral-700 light:text-slate-300">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-ink-main mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {s.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. MAIN INTERACTIVE ANALYZER WORKBENCH */}
      {/* ============================================================ */}
      <section
        id="analyzer-workbench"
        ref={workbenchRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16"
      >
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 light:bg-purple-50 border border-white/10 light:border-purple-200 text-xs font-semibold text-ink-secondary light:text-purple-800 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>Interactive Classification Studio</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-main">
            Submit Lyrics or Search a Song
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Analyze lyrical sentiment in English, Hindi, Bengali, Spanish, or French with instant confidence scoring.
          </p>
        </div>

        {/* Main Grid: Input Panel & Results Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel: Mode Switcher & (Song Discovery OR Custom Input) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-7 space-y-4"
          >
            {/* Mode Switcher Tabs */}
            <div className="flex p-1.5 theme-card rounded-2xl shadow-lg">
              <button
                type="button"
                onClick={() => setInputMode("discovery")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  inputMode === "discovery"
                    ? "bg-sky-500/20 light:bg-sky-50 text-sky-300 light:text-sky-700 border border-sky-500/30 shadow-md"
                    : "text-ink-muted hover:text-ink-main hover:bg-white/5 light:hover:bg-slate-100"
                }`}
              >
                <Search className="w-4 h-4 text-sky-400 light:text-sky-600" />
                <span>Song Discovery</span>
                <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 light:bg-sky-100 text-sky-200 light:text-sky-700 border border-sky-500/30">
                  MusicBrainz + LRCLIB
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode("custom")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  inputMode === "custom"
                    ? "bg-purple-500/20 light:bg-purple-50 text-purple-300 light:text-purple-700 border border-purple-500/30 shadow-md"
                    : "text-ink-muted hover:text-ink-main hover:bg-white/5 light:hover:bg-slate-100"
                }`}
              >
                <FileText className="w-4 h-4 text-purple-400 light:text-purple-600" />
                <span>Custom Lyrics Input</span>
              </button>
            </div>

            {/* View Mode 1: Song Discovery */}
            {inputMode === "discovery" ? (
              <SongDiscovery onAnalysisComplete={handleDiscoveryAnalysis} />
            ) : (
              /* View Mode 2: Custom Lyrics Form */
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl relative">
                {/* Optional Metadata Row (Title & Artist) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <input
                    type="text"
                    placeholder="Song Title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="glass-input px-4 py-2 rounded-xl text-sm text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Artist / Band (optional)"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="glass-input px-4 py-2 rounded-xl text-sm text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400"
                  />
                </div>

                {/* Multilingual Automatic Language Detection Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 mb-3.5 rounded-2xl theme-well text-xs">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-sky-400 light:text-sky-600" />
                    <span className="text-ink-muted font-medium">Automatic Script & Language:</span>
                    {detectingLanguage ? (
                      <span className="text-ink-secondary animate-pulse">Detecting language...</span>
                    ) : detectedLanguageInfo ? (
                      <span className="flex items-center gap-1.5 font-semibold text-ink-main">
                        <span>{detectedLanguageInfo.flag}</span>
                        <span>{detectedLanguageInfo.language}</span>
                        {detectedLanguageInfo.script && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 light:bg-white border border-transparent light:border-slate-200 text-ink-secondary font-normal">
                            {detectedLanguageInfo.script} script
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-400 light:text-emerald-700 font-mono">
                          {detectedLanguageInfo.confidence}% certainty
                        </span>
                      </span>
                    ) : (
                      <span className="text-ink-dim">English, Hindi, Bengali, Spanish, French supported</span>
                    )}
                  </div>
                  {detectedLanguageInfo && detectedLanguageInfo.supported && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 light:bg-emerald-50 text-emerald-300 light:text-emerald-700 border border-emerald-500/30 font-semibold">
                      Native Model Ready
                    </span>
                  )}
                </div>

                {/* Unsupported Language Alert Banner */}
                {detectedLanguageInfo && !detectedLanguageInfo.supported && (
                  <div className="flex items-start gap-2.5 p-3 mb-3.5 rounded-2xl bg-amber-500/10 light:bg-amber-50 border border-amber-500/30 text-amber-200 light:text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 light:text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Language Notice: </span>
                      {detectedLanguageInfo.message}
                    </div>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    rows={10}
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Paste song lyrics in English, Hindi, Bengali, Spanish, French...&#10;&#10;e.g.&#10;• English: Walking on sunshine, smiles all around me, feeling alive&#10;• Hindi: केसरिया तेरा इश्क़ है पिया, दिल की चाहत सनम&#10;• Bengali: আনন্দধারা বহিছে ভুবনে, হাসিমুখ উল্লাস আর সুখের গান&#10;• Spanish: Qué alegría y felicidad bailar bajo el sol brillante&#10;• French: C'est l'amour de ma vie et la tendresse de mon cœur"
                    className="w-full bg-transparent border-0 text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400 text-lg sm:text-xl font-sans leading-relaxed resize-none focus:outline-none focus:ring-0 min-h-[260px]"
                  />
                </div>

                {/* Footer row inside input box */}
                <div className="pt-4 mt-2 border-t border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
                  <div className="flex items-center gap-3">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{lyrics.length} characters</span>
                  </div>
                  {lyrics && (
                    <button
                      onClick={clearForm}
                      className="flex items-center gap-1 text-ink-muted hover:text-ink-main transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAnalyze()}
                    disabled={loading || advancedLoading || !lyrics.trim()}
                    className="w-full py-3.5 px-4 rounded-2xl font-display font-bold text-sm sm:text-base bg-white light:bg-slate-900 text-black light:text-white hover:bg-neutral-200 light:hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-neutral-400 border-t-black light:border-t-white rounded-full animate-spin" />
                        <span>Classifying...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-600 light:text-amber-300 group-hover:rotate-12 transition-transform" />
                        <span>Analyze Mood</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleAdvancedAnalyze()}
                    disabled={loading || advancedLoading || !lyrics.trim()}
                    className="w-full py-3.5 px-4 rounded-2xl font-display font-bold text-sm sm:text-base bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white hover:opacity-95 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 group"
                  >
                    {advancedLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Analyzing Multi-Emotions...</span>
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                        <span>Deep AI Mood Analysis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Panel: Results & Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-5 space-y-4"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl min-h-[460px] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="result-content"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    {/* Top Result Header */}
                    <div className="text-center">
                      <div className="text-6xl mb-2 animate-bounce-short select-none">
                        {result.emoji}
                      </div>
                      <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-main tracking-tight">
                        {result.mood}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full theme-well text-ink-secondary font-medium flex items-center gap-1.5">
                          <span>{result.detectedLanguage?.flag || "🌐"}</span>
                          <span>{result.language}</span>
                          {result.script && (
                            <span className="text-[10px] text-ink-muted">({result.script} script)</span>
                          )}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 light:bg-purple-50 text-purple-300 light:text-purple-700 border border-purple-500/30 font-semibold">
                          Multilingual NLP v2
                        </span>
                      </div>
                    </div>

                    {/* Circular Progress Gauge */}
                    <div className="flex justify-center py-2">
                      <CircularProgress
                        value={result.confidence}
                        color={activeMoodInfo?.color || "#a855f7"}
                        size={170}
                      />
                    </div>

                    {/* Explanation Card */}
                    <div className="p-4 rounded-2xl theme-well space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                          NLP Linguistic Analysis
                        </span>
                        <Disc3 className="w-4 h-4 text-ink-muted animate-spin-slow" />
                      </div>
                      <p className="text-sm text-ink-secondary leading-relaxed font-sans">
                        {result.explanation}
                      </p>
                      {result.detectedKeywords?.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[11px] text-ink-muted font-medium">Matched cues:</span>
                          {result.detectedKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 light:bg-white border border-transparent light:border-slate-200 text-ink-main"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Optional Translation Action & Card */}
                    {result.languageCode && result.languageCode !== "en" && (
                      <div className="space-y-3 pt-1">
                        <button
                          type="button"
                          onClick={handleTranslate}
                          disabled={translating}
                          className="w-full py-2.5 px-3 rounded-xl theme-well hover:border-purple-500/30 text-ink-main text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                          <Languages className="w-4 h-4 text-sky-400 light:text-sky-600" />
                          <span>
                            {translating
                              ? "Translating with authorized service..."
                              : showTranslation
                              ? "Hide English Translation"
                              : "View Optional English Translation"}
                          </span>
                        </button>

                        {showTranslation && translation && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 rounded-2xl theme-card border-sky-500/30 space-y-2 text-left shadow-lg"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-sky-300 light:text-sky-700 flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                English Translation (Reading Reference)
                              </span>
                              <span className="text-[10px] text-ink-muted font-mono">
                                Provider: {translation.provider}
                              </span>
                            </div>
                            <p className="text-xs text-ink-secondary whitespace-pre-line leading-relaxed font-sans theme-well p-3 rounded-xl max-h-48 overflow-y-auto">
                              {translation.translatedText}
                            </p>
                            <div className="text-[10px] text-amber-300/80 light:text-amber-800 bg-amber-500/10 light:bg-amber-50 p-2.5 rounded-lg border border-amber-500/20 leading-normal">
                              {translation.disclaimer}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons: Save & Share */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="py-2.5 px-3 rounded-xl theme-well hover:border-purple-500/40 text-ink-main text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {saved ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                            <span>Saved to Library</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5 text-purple-400 light:text-purple-600" />
                            <span>{saving ? "Saving..." : "Save Analysis"}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCopy}
                        className="py-2.5 px-3 rounded-xl theme-well hover:border-purple-500/40 text-ink-main text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-indigo-400 light:text-indigo-600" />
                            <span>Copy Summary</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Deep AI Analysis Quick Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        if (advancedResult) {
                          scrollToAdvanced();
                        } else {
                          handleAdvancedAnalyze();
                        }
                      }}
                      disabled={advancedLoading || !lyrics.trim()}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-purple-600/20 light:from-purple-50 light:via-indigo-50 light:to-purple-50 hover:from-purple-600/35 hover:to-indigo-600/35 light:hover:from-purple-100 light:hover:to-indigo-100 text-purple-200 light:text-purple-800 text-xs font-semibold flex items-center justify-center gap-2 border border-purple-500/30 transition-all shadow-md group disabled:opacity-40"
                    >
                      <Bot className="w-4 h-4 text-purple-400 light:text-purple-600 group-hover:scale-110 transition-transform" />
                      <span>
                        {advancedLoading
                          ? "Running Deep AI Multi-Emotion Analysis..."
                          : advancedResult
                          ? "View Emotion Visualization Dashboard & Report"
                          : "Run Deep AI Multi-Emotion & Line-by-Line Analysis"}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400 light:text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center my-auto py-12"
                  >
                    <div className="w-20 h-20 rounded-full theme-well flex items-center justify-center mb-5 text-ink-dim">
                      <Music2 className="w-10 h-10" />
                    </div>
                    <h3 className="font-display font-bold text-xl text-ink-main mb-2">
                      Awaiting Song Lyrics
                    </h3>
                    <p className="text-sm text-ink-muted max-w-xs leading-relaxed">
                      Type or paste lyrics on the left, or pick one of the sample tracks below to view real-time emotion metrics.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Curated Playlist Suggestion Card (if mood analyzed) */}
            {curatedPlaylist && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-3xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400 light:text-amber-600" />
                    <span className="font-display text-sm font-bold text-ink-main">
                      Recommended Track Matches
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold">
                    {curatedPlaylist.mood} Vibes
                  </span>
                </div>
                <div className="space-y-1.5">
                  {curatedPlaylist.songs?.slice(0, 3).map((song, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl theme-well transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-ink-dim font-mono w-4">{idx + 1}</span>
                        <div>
                          <div className="font-semibold text-ink-main">{song.title}</div>
                          <div className="text-[11px] text-ink-muted">{song.artist}</div>
                        </div>
                      </div>
                      <span className="text-ink-muted font-mono text-[11px]">{song.duration}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* ADVANCED AI MOOD ANALYSIS & EMOTION VISUALIZATION DASHBOARD */}
        {/* ============================================================ */}
        {(advancedResult || advancedLoading || advancedError) && (
          <div ref={advancedRef} className="pt-10 scroll-mt-24 space-y-6">
            {/* View Switcher Tabs Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl theme-card shadow-xl">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl theme-well self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAdvancedTab("dashboard")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    advancedTab === "dashboard"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-ink-muted hover:text-ink-main"
                  }`}
                >
                  <PieChart className="w-4 h-4" />
                  <span>Emotion Dashboard</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${advancedTab === "dashboard" ? "bg-white/20" : "bg-white/10 light:bg-slate-200"}`}>
                    Phase 2
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdvancedTab("narrative")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    advancedTab === "narrative"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-ink-muted hover:text-ink-main"
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  <span>Deep AI Narrative</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${advancedTab === "narrative" ? "bg-white/20" : "bg-white/10 light:bg-slate-200"}`}>
                    Phase 1
                  </span>
                </button>
              </div>

              {advancedResult && (
                <div className="flex items-center gap-3">
                  <PdfDownloadButton
                    data={advancedResult}
                    lyrics={lyrics}
                    title={title}
                    artist={artist}
                  />
                </div>
              )}
            </div>

            {/* Active Tab View */}
            <AnimatePresence mode="wait">
              {advancedTab === "dashboard" ? (
                <motion.div
                  key="dashboard-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <EmotionDashboard
                    data={advancedResult}
                    lyrics={lyrics}
                    title={title}
                    artist={artist}
                    loading={advancedLoading}
                    error={advancedError}
                    onReanalyze={() => handleAdvancedAnalyze()}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="narrative-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <AdvancedMoodAnalysis
                    data={advancedResult}
                    loading={advancedLoading}
                    error={advancedError}
                    onReanalyze={() => handleAdvancedAnalyze()}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Phase 3: Personalized Mood-Based Music Recommendations */}
        <MoodRecommendations
          detectedMood={
            advancedResult
              ? advancedResult.primaryEmotion
              : result
              ? result.mood
              : currentMood !== "neutral"
              ? currentMood
              : "Happiness"
          }
          seedSong={
            result
              ? { title, artist }
              : advancedResult
              ? {
                  title: advancedResult.metadata?.title || title,
                  artist: advancedResult.metadata?.artist || artist
                }
              : null
          }
          secondaryEmotions={advancedResult?.secondaryEmotions || []}
          lyricalThemes={advancedResult?.aiInterpretation?.mainThemes || []}
          overallTone={advancedResult?.aiInterpretation?.conciseInterpretation || ""}
          onSelectSongForAnalysis={(recSong) => {
            setTitle(recSong.title);
            setArtist(recSong.artist);
            setInputMode("discovery");
            scrollToWorkbench();
          }}
        />
      </section>

      {/* ============================================================ */}
      {/* 4. FEATURED 9-EMOTION SPECTRUM SHOWCASE */}
      {/* ============================================================ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400 light:text-purple-600 mb-1.5">
            Lyrical Taxonomy
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-main">
            The 9 Core Emotion Spectrums
          </h2>
          <p className="text-sm text-ink-muted mt-2">
            Derived from empirical music emotion research datasets. Click any mood to preview its
            emotional character.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(MOOD_DEFINITIONS).map(([moodKey, moodVal], idx) => {
            return (
              <div
                key={idx}
                className="p-5 rounded-3xl theme-card hover:border-purple-500/40 transition-all hover:-translate-y-1 group shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner border"
                    style={getEmotionBadgeStyle(moodKey, isDark)}
                  >
                    <span>{moodVal.emoji}</span>
                  </div>
                  <span
                    className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border"
                    style={getEmotionBadgeStyle(moodKey, isDark)}
                  >
                    {moodKey}
                  </span>
                </div>
                <h4 className="font-display font-bold text-base text-ink-main group-hover:text-purple-300 light:group-hover:text-purple-700 transition-colors">
                  {moodKey}
                </h4>
                <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                  {moodVal.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. AI MUSIC ASSISTANT SPOTLIGHT BANNER */}
      {/* ============================================================ */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-10 rounded-3xl theme-card bg-gradient-to-br from-purple-900/40 via-indigo-950/40 to-neutral-950 light:from-purple-50 light:via-indigo-50/70 light:to-white border-purple-500/30 light:border-purple-200 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow circle */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-purple-600/20 light:bg-purple-400/15 blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 light:bg-purple-100 border border-purple-500/30 text-purple-300 light:text-purple-800 text-xs font-semibold">
                <Bot className="w-3.5 h-3.5" />
                <span>Conversational Music Intelligence</span>
              </div>
              <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-ink-main">
                Meet Your AI Music Assistant
              </h2>
              <p className="text-sm text-ink-secondary leading-relaxed max-w-xl font-sans">
                Ask naturally for road trip anthems, Bollywood romance, study soundtracks, or detailed
                explanations of why certain lyrics trigger sad or calm classifications. Equipped with
                multi-turn context and direct Spotify links.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/assistant"
                  className="py-3 px-6 rounded-2xl bg-white text-black light:bg-purple-600 light:text-white font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-neutral-200 light:hover:bg-purple-700 transition-all hover:scale-102"
                >
                  <Bot className="w-4 h-4 text-purple-600 light:text-amber-300" />
                  <span>Start Chatting Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2 text-xs text-purple-200 light:text-purple-800 px-3 py-2 rounded-xl bg-purple-500/10 light:bg-purple-100/70 border border-purple-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 light:text-amber-600" />
                  <span>Powered by Gemini & Local NLU</span>
                </div>
              </div>
            </div>

            {/* Teaser chat bubbles */}
            <div className="lg:col-span-5 space-y-2.5 text-xs font-sans">
              <div className="p-3 rounded-2xl theme-well text-ink-secondary ml-8 text-right shadow-md">
                "Recommend high-energy happy songs for a scenic road trip"
              </div>
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 to-indigo-950/80 light:from-purple-600 light:to-indigo-600 border border-purple-500/30 text-purple-100 light:text-white mr-8 shadow-md">
                <span className="font-bold text-amber-300 light:text-amber-200 block mb-1">🤖 AI Assistant:</span>
                "Here are 5 hand-curated Happy & Exciting tracks including Katrina & The Waves and Pharrell Williams..."
              </div>
              <div className="p-3 rounded-2xl theme-well text-ink-secondary ml-8 text-right shadow-md">
                "Create a soothing playlist for a quiet rainy evening"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. KEY PLATFORM CAPABILITIES */}
      {/* ============================================================ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-400 light:text-purple-600 mb-1.5">
            Full-Stack Features
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink-main">
            Engineered for Modern Music Discovery
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PLATFORM_FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl theme-card hover:border-purple-500/30 transition-all shadow-md group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600/15 light:bg-purple-50 border border-purple-500/30 flex items-center justify-center text-purple-400 light:text-purple-600 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full theme-well text-ink-muted">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="font-display font-bold text-base text-ink-main mb-1.5">
                  {feat.title}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed font-sans">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. RESEARCH & DATASET FOUNDATION CITATIONS */}
      {/* ============================================================ */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 rounded-3xl theme-card">
          <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 light:text-amber-700 uppercase tracking-wider">
                <Quote className="w-4 h-4" />
                <span>Academic & Benchmark Provenance</span>
              </div>
              <h3 className="font-display font-bold text-xl text-ink-main">
                Ground-Truth Lyrical Emotion Benchmarks
              </h3>
              <p className="text-xs text-ink-muted max-w-2xl leading-relaxed">
                Emotion classes and sentiment polarities are modeled after the annotated IIIT Hyderabad
                Multilingual Lyrics Emotion Dataset and Stanford CoreNLP valence lexicons.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href="https://share.google/4KtdJSaRmEiQjCvHD"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl theme-well hover:border-purple-500/40 text-ink-main text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <span>View Dataset Archive</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. EXAMPLE LYRICS SHOWCASE GRID */}
      {/* ============================================================ */}
      <section className="mt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-2xl font-bold text-ink-main">
              Try an Example from Our Curated Dataset
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted">
              Click any mood card to instantly load its verse and run classification
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {EXAMPLE_LYRICS.map((item, idx) => {
            const moodDef = MOOD_DEFINITIONS[item.mood];
            return (
              <button
                key={idx}
                onClick={() => loadExample(item)}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 text-left transition-all hover:-translate-y-1 shadow-lg hover:shadow-2xl"
              >
                <img
                  src={item.image}
                  alt={item.mood}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3.5">
                  <div className="text-2xl mb-1">{moodDef?.emoji}</div>
                  <div className="font-display font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {item.mood}
                  </div>
                  <div className="text-[11px] text-neutral-300 truncate">{item.title}</div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] text-neutral-400">
                    <span>{item.language}</span>
                    <Play className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
