import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PluginProvider } from "./context/PluginContext";
import { PersonalizationProvider } from "./context/PersonalizationContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ResearchModal from "./components/ResearchModal";
import PageLoadingSkeleton from "./components/PageLoadingSkeleton";
import MarketplaceSkeleton from "./components/plugins/MarketplaceSkeleton";

// Eager landing page for instant first contentful paint (FCP)
import AnalyzerPage from "./pages/AnalyzerPage";

// Code-Split Dynamic Route Chunks for optimal performance & minimal initial payload
const ExplorePage = lazy(() => import("./pages/ExplorePage"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const PluginMarketplacePage = lazy(() => import("./pages/PluginMarketplacePage"));

function AppLayout({ researchModalOpen, setResearchModalOpen }) {
  const location = useLocation();
  const isAssistant = location.pathname === "/assistant";

  return (
    <div
      className={`flex flex-col bg-surface-page text-ink-main font-sans selection:bg-purple-600 selection:text-white transition-colors duration-200 ${
        isAssistant ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      }`}
    >
      <Navbar
        onOpenResearch={() => setResearchModalOpen(true)}
      />

      <main className={`flex-1 flex flex-col ${isAssistant ? "min-h-0 overflow-hidden" : ""}`}>
        <Suspense fallback={<PageLoadingSkeleton />}>
          <Routes>
            <Route path="/" element={<AnalyzerPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route
              path="/plugins"
              element={
                <Suspense fallback={<MarketplaceSkeleton />}>
                  <PluginMarketplacePage />
                </Suspense>
              }
            />

            {/* Redirect legacy authentication & profile routes directly to home */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route path="/signin" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={<Navigate to="/" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!isAssistant && <Footer onOpenResearch={() => setResearchModalOpen(true)} />}

      <ResearchModal
        isOpen={researchModalOpen}
        onClose={() => setResearchModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  const [researchModalOpen, setResearchModalOpen] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <PluginProvider>
          <PersonalizationProvider>
            <BrowserRouter>
              <AppLayout
                researchModalOpen={researchModalOpen}
                setResearchModalOpen={setResearchModalOpen}
              />
            </BrowserRouter>
          </PersonalizationProvider>
        </PluginProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
