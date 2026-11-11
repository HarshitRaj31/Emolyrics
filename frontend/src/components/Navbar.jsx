import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Music2,
  Sparkles,
  Compass,
  ListMusic,
  Blocks,
  Info,
  Menu,
  X,
  BarChart3,
  Bot,
  Sun,
  Moon
} from "lucide-react";
import { usePlugins } from "../context/PluginContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ onOpenResearch }) {
  const location = useLocation();
  const { stats } = usePlugins();
  const { theme, toggleTheme, isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Analyze", icon: Sparkles },
    { to: "/recommendations", label: "Discover", icon: Music2, badge: "New" },
    { to: "/assistant", label: "AI Assistant", icon: Bot, badge: "AI" },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/playlists", label: "Playlists", icon: ListMusic },
    {
      to: "/plugins",
      label: "Plugins",
      icon: Blocks,
      badge: stats?.active > 0 ? stats.active : "New"
    }
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="sticky top-0 z-50 backdrop-blur-2xl bg-neutral-950/80 dark:bg-neutral-950/80 light:bg-white/85 border-b border-white/10 dark:border-white/10 light:border-slate-200 px-4 lg:px-8 py-3 transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-purple-500 rounded-2xl p-1"
          aria-label="EmoLyrics Home"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-neutral-950 dark:bg-neutral-950 light:bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Music2 className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            {/* Ambient Pulse indicator */}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-neutral-950 ring-1 ring-emerald-400/50" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xl tracking-tight text-white dark:text-white light:text-slate-900 group-hover:text-amber-400 transition-colors">
                EmoLyrics
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 dark:text-purple-300 light:text-purple-700 border border-purple-500/30">
                AI NLP v2
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-400 light:text-slate-500 hidden sm:block">
              Song Lyrics Mood Classification
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-slate-100/90 p-1.5 rounded-full border border-white/5 dark:border-white/5 light:border-slate-200 shadow-inner">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white shadow-md font-bold"
                    : "text-neutral-300 dark:text-neutral-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-black hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-200/60"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? "text-purple-600 dark:text-purple-600 light:text-purple-300"
                      : "text-neutral-400 dark:text-neutral-400 light:text-slate-500"
                  }`}
                />
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none ${
                      isActive
                        ? "bg-purple-600 dark:bg-purple-600 light:bg-purple-700 text-white"
                        : "bg-purple-500/20 dark:bg-purple-500/20 light:bg-purple-100 text-purple-300 dark:text-purple-300 light:text-purple-700 border border-purple-500/30 dark:border-purple-500/30 light:border-purple-200"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={onOpenResearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-300 dark:text-neutral-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-black hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-200/60 transition-all"
            title="Research & Academic Dataset Foundation"
          >
            <Info className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-400 light:text-slate-500" />
            <span>Research</span>
          </button>
        </div>

        {/* Theme Switcher & Actions */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-neutral-900/80 dark:bg-neutral-900/80 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 text-neutral-300 dark:text-neutral-300 light:text-slate-700 hover:text-white dark:hover:text-white light:hover:text-slate-900 transition-colors shadow-sm"
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
            aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>

        {/* Mobile Hamburger & Theme toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-900 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 text-neutral-300"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-900 light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-200 text-neutral-300 dark:text-neutral-300 light:text-slate-700"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden pt-4 pb-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 mt-3 space-y-2 animate-fadeIn">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive
                    ? "bg-white dark:bg-white light:bg-slate-900 text-black dark:text-black light:text-white"
                    : "text-neutral-300 dark:text-neutral-300 light:text-slate-800 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? "bg-purple-600 text-white"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenResearch();
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-300 dark:text-neutral-300 light:text-slate-800 bg-neutral-900/60 dark:bg-neutral-900/60 light:bg-slate-100 text-left w-full"
          >
            <Info className="w-4 h-4" />
            <span>Research & Team</span>
          </button>
        </div>
      )}
    </nav>
  );
}
