import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  ListMusic,
  BarChart3,
  Bot,
  Blocks,
  Info,
  Sun,
  Moon,
  Sparkles,
  Menu,
  X,
  Music2,
  BookOpen,
  ArrowUpRight,
  User
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import ResearchModal from "../ResearchModal";

export default function EditorialLayout({ children, researchModalOpen, setResearchModalOpen }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Journal", exact: true },
    { to: "/explore", label: "Explore Catalog" },
    { to: "/recommendations", label: "Mood Discover" },
    { to: "/playlists", label: "Playlists" },
    { to: "/analytics", label: "Emotional Index" },
    { to: "/assistant", label: "AI Critic", badge: "AI" },
    { to: "/plugins", label: "Plugins" }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col transition-colors duration-250 selection:bg-[var(--accent-editorial)] selection:text-white">
      {/* 1. TOP EDITORIAL META STRIP */}
      <div className="border-b border-[var(--border-subtle)] text-[11px] font-sans text-[var(--text-muted)] px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono uppercase tracking-widest text-[10px] text-[var(--accent-editorial)] font-bold">
            Vol. IV • Issue 2026
          </span>
          <span className="hidden md:inline-block text-[var(--border-strong)]">•</span>
          <span className="hidden md:inline-block tracking-wide">
            An Independent Journal of Musical Emotion & Sentiment
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Guest or Auth Status */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {isAuthenticated && user ? (
              <span className="font-semibold text-[var(--text-main)]">
                {user.name || user.email}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--text-muted)] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Guest Edition
              </span>
            )}
          </div>

          <span className="text-[var(--border-strong)]">•</span>

          {/* Research Modal Trigger */}
          <button
            onClick={() => setResearchModalOpen(true)}
            className="hover:text-[var(--text-main)] transition-colors flex items-center gap-1 font-medium"
            title="View Research & Methodology"
          >
            <Info className="w-3 h-3 text-[var(--accent-editorial)]" />
            <span>Research Docs</span>
          </button>

          <span className="text-[var(--border-strong)]">•</span>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="hover:text-[var(--text-main)] transition-colors flex items-center gap-1.5 font-medium"
            title={isDark ? "Switch to Warm Paper (Light)" : "Switch to Deep Charcoal (Dark)"}
          >
            {isDark ? (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider">Paper</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-[var(--accent-editorial)]" />
                <span className="text-[10px] uppercase tracking-wider">Ink</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. EDITORIAL MASTHEAD */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between">
          {/* Masthead Logo Title */}
          <div className="flex flex-col">
            <Link to="/" className="group inline-flex flex-col">
              <span className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tighter text-[var(--text-main)] uppercase transition-colors">
                EmoLyrics
              </span>
              <span className="text-[9px] sm:text-[10px] font-sans font-bold tracking-[0.25em] text-[var(--accent-editorial)] uppercase -mt-0.5 sm:-mt-1">
                The Art of Feeling Music
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-sans font-semibold">
            {navLinks.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "text-[var(--text-main)] bg-[var(--bg-well)] font-bold border border-[var(--border-subtle)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-well)]"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--accent-editorial)]/15 text-[var(--accent-editorial)] font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Quick Action: Analyze Studio CTA */}
            <button
              onClick={() => {
                if (location.pathname === "/") {
                  const workbench = document.getElementById("analyzer-workbench");
                  if (workbench) workbench.scrollIntoView({ behavior: "smooth" });
                } else {
                  navigate("/#analyzer-workbench");
                }
              }}
              className="ml-3 px-3.5 py-1.5 rounded-full bg-[var(--accent-editorial)] text-white hover:opacity-95 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>The Lab</span>
            </button>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-subtle)]"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      isActive
                        ? "bg-[var(--bg-well)] text-[var(--text-main)] border border-[var(--border-subtle)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-well)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--accent-editorial)]/20 text-[var(--accent-editorial)] font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate("/");
                setTimeout(() => {
                  const workbench = document.getElementById("analyzer-workbench");
                  if (workbench) workbench.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="w-full mt-2 py-2.5 rounded-xl bg-[var(--accent-editorial)] text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Emotion Lab</span>
            </button>
          </div>
        )}
      </header>

      {/* 3. MAIN EDITORIAL CONTENT CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {children}
      </main>

      {/* 4. REFINED EDITORIAL FOOTER */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] py-12 px-4 sm:px-6 lg:px-8 mt-16 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-[var(--border-subtle)]">
            <div className="md:col-span-2 space-y-3">
              <span className="font-display font-black text-xl text-[var(--text-main)] uppercase tracking-tight">
                EmoLyrics
              </span>
              <p className="text-xs leading-relaxed max-w-md text-[var(--text-muted)]">
                A digital journal and research platform dedicated to the emotional anatomy of song lyrics.
                Powered by calibrated machine learning, multilingual natural language processing, and deep music intelligence.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 light:text-emerald-700 border border-emerald-500/20 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ML Classification Engine Online
                </span>
                <span className="text-[10px] font-mono text-[var(--text-dim)]">
                  9 Emotion Classes
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-main)] font-bold mb-3">
                Editorial Index
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:text-[var(--text-main)] transition-colors">
                    The Journal
                  </Link>
                </li>
                <li>
                  <Link to="/explore" className="hover:text-[var(--text-main)] transition-colors">
                    Global Song Discovery
                  </Link>
                </li>
                <li>
                  <Link to="/recommendations" className="hover:text-[var(--text-main)] transition-colors">
                    Mood Recommendations
                  </Link>
                </li>
                <li>
                  <Link to="/playlists" className="hover:text-[var(--text-main)] transition-colors">
                    Emotional Playlists
                  </Link>
                </li>
                <li>
                  <Link to="/analytics" className="hover:text-[var(--text-main)] transition-colors">
                    Platform Analytics
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-main)] font-bold mb-3">
                Intelligence & Tools
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/assistant" className="hover:text-[var(--text-main)] transition-colors">
                    AI Music Assistant
                  </Link>
                </li>
                <li>
                  <Link to="/plugins" className="hover:text-[var(--text-main)] transition-colors">
                    Integrations & Plugins
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setResearchModalOpen(true)}
                    className="hover:text-[var(--text-main)] transition-colors text-left"
                  >
                    Research Documentation
                  </button>
                </li>
                <li>
                  <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--text-main)] transition-colors inline-flex items-center gap-1"
                  >
                    <span>Spotify Catalog</span>
                    <ArrowUpRight className="w-3 h-3 opacity-60" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[var(--text-dim)]">
            <span>© 2026 EmoLyrics — The Art of Feeling Music. All rights reserved.</span>
            <span>Multilingual ML Emotion Intelligence Platform</span>
          </div>
        </div>
      </footer>

      {/* Research Methodology Modal */}
      <ResearchModal
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
      />
    </div>
  );
}
