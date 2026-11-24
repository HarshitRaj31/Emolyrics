import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, X, Music2, Sparkles, Compass, ListMusic, BarChart3, Bot, Blocks, Info } from "lucide-react";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import BottomPlayerBar from "./BottomPlayerBar";
import ResearchModal from "../ResearchModal";
import { useTheme } from "../../context/ThemeContext";

export default function ModernPlayerLayout({ children, researchModalOpen, setResearchModalOpen }) {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAssistant = location.pathname === "/assistant";

  const mobileNavLinks = [
    { to: "/", label: "Home", icon: Music2 },
    { to: "/recommendations", label: "Search", icon: Sparkles },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/playlists", label: "Playlists", icon: ListMusic },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/assistant", label: "AI Assistant", icon: Bot },
    { to: "/plugins", label: "Plugins", icon: Blocks }
  ];

  return (
    <div className="min-h-screen app-ambient-bg text-white font-sans selection:bg-rose-500 selection:text-white flex flex-col justify-between p-3 sm:p-5 lg:p-6 transition-colors duration-300">
      {/* Mobile Top Header (only visible on mobile/tablet screens < lg) */}
      <header className="lg:hidden flex items-center justify-between p-3 mb-3 backdrop-blur-2xl bg-[#191a1f]/90 border border-white/[0.08] rounded-2xl">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 flex items-center justify-center">
            <Music2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-extrabold text-base text-white">EmoLyrics</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setResearchModalOpen(true)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Research & Docs"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden backdrop-blur-2xl bg-[#191a1f]/95 border border-white/10 rounded-2xl p-4 mb-4 shadow-2xl">
          <nav className="grid grid-cols-2 gap-2">
            {mobileNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold ${
                    isActive ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Desktop 3-Column Shell matching image */}
      <div className="flex-1 flex gap-4 max-w-[1720px] w-full mx-auto relative mb-24">
        {/* 1. Left Sidebar: Navigation & Your Library */}
        <div className="hidden lg:block">
          <LeftSidebar
            onOpenResearch={() => setResearchModalOpen(true)}
          />
        </div>

        {/* 2. Center Content Area (Rounded Glass Card) */}
        <main className="flex-1 min-w-0 backdrop-blur-2xl bg-[#191a1f]/85 border border-white/[0.08] rounded-[26px] p-4 sm:p-6 lg:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.5)] flex flex-col justify-between overflow-x-hidden">
          <div className="flex-1">{children}</div>
        </main>

        {/* 3. Right Sidebar: Recent Played & Upgrade Promo */}
        <RightSidebar />
      </div>

      {/* 4. Bottom Floating Player Bar matching image */}
      <BottomPlayerBar
        onOpenAnalyze={() => {
          const workbench = document.getElementById("analyzer-workbench");
          if (workbench) {
            workbench.scrollIntoView({ behavior: "smooth" });
          }
        }}
      />

      {/* Research Modal */}
      <ResearchModal
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
      />
    </div>
  );
}
