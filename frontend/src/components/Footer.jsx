import { Heart, ExternalLink, Music2, Code2, Sparkles, ShieldCheck, Database, Bot } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer({ onOpenResearch }) {
  return (
    <footer
      aria-label="Site Footer"
      className="border-t border-white/10 dark:border-white/10 light:border-slate-200 bg-neutral-950/90 dark:bg-neutral-950/90 light:bg-slate-100 text-neutral-400 dark:text-neutral-400 light:text-slate-600 transition-colors duration-200 pt-16 pb-12 px-4 sm:px-6 lg:px-8 mt-20"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10 dark:border-white/10 light:border-slate-200">
          {/* Brand & Platform Summary */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-md shadow-purple-500/20">
                <div className="w-full h-full bg-neutral-950 dark:bg-neutral-950 light:bg-slate-900 rounded-[10px] flex items-center justify-center">
                  <Music2 className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <span className="font-display font-extrabold text-xl text-white dark:text-white light:text-slate-900 tracking-tight">
                EmoLyrics
              </span>
            </Link>

            <p className="text-xs leading-relaxed max-w-sm text-neutral-400 dark:text-neutral-400 light:text-slate-600">
              A state-of-the-art music intelligence platform mapping the emotional valence, arousal,
              and sentiment of multilingual song lyrics across 9 core mood spectrums.
            </p>

            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 dark:text-emerald-400 light:text-emerald-700 border border-emerald-500/20 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                All Systems Operational
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">NLP Engine v2.4</span>
            </div>
          </div>

          {/* Column 1: Platform Navigation */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white dark:text-white light:text-slate-900 mb-3.5">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors">
                  Lyrics Emotion Analyzer
                </Link>
              </li>
              <li>
                <Link to="/assistant" className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Music Assistant</span>
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors">
                  Song Discovery Catalog
                </Link>
              </li>
              <li>
                <Link to="/playlists" className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors">
                  Smart Mood Playlists
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors">
                  Interactive Mood Analytics
                </Link>
              </li>
              <li>
                <Link to="/plugins" className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors">
                  Plugin Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Research & NLP Science */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white dark:text-white light:text-slate-900 mb-3.5">
              Research & APIs
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onOpenResearch}
                  className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors text-left"
                >
                  Architecture & Methodology
                </button>
              </li>
              <li>
                <a
                  href="https://share.google/4KtdJSaRmEiQjCvHD"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>IIIT-H Dataset</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </li>
              <li>
                <a
                  href="https://musicbrainz.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>MusicBrainz Open API</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </li>
              <li>
                <a
                  href="https://lrclib.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors inline-flex items-center gap-1"
                >
                  <span>LRCLIB Lyrics Database</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              </li>
              <li>
                <span className="text-neutral-500 dark:text-neutral-500 light:text-slate-400 text-[11px]">
                  Zero-Scraping Authorized Policy
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Open Source & Community */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-white dark:text-white light:text-slate-900 mb-3.5">
              Developer & Source
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com/Chandrima2507/SONG_LYRICS_EMOTION_CLASSIFICATION07"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-purple-400 dark:hover:text-purple-300 light:hover:text-purple-600 transition-colors inline-flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <span className="text-neutral-500 dark:text-neutral-500 light:text-slate-400">
                  MIT Open Source License
                </span>
              </li>
              <li>
                <span className="text-neutral-500 dark:text-neutral-500 light:text-slate-400">
                  React 19 • Tailwind CSS • Vite
                </span>
              </li>
              <li>
                <span className="text-neutral-500 dark:text-neutral-500 light:text-slate-400">
                  Node.js • Express • MongoDB
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-500 light:text-slate-500">
          <div>
            © {new Date().getFullYear()} EmoLyrics • Advanced Song Lyrics Mood Classification Project.
          </div>

          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline mx-0.5" />
            <span>by Chandrima & Team</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
