import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PluginProvider } from "./context/PluginContext";
import { PersonalizationProvider } from "./context/PersonalizationContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PlayerProvider } from "./context/PlayerContext";
import EditorialLayout from "./components/layout/EditorialLayout";
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
  return (
    <EditorialLayout
      researchModalOpen={researchModalOpen}
      setResearchModalOpen={setResearchModalOpen}
    >
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
    </EditorialLayout>
  );
}

export default function App() {
  const [researchModalOpen, setResearchModalOpen] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <PluginProvider>
          <PersonalizationProvider>
            <PlayerProvider>
              <BrowserRouter>
                <AppLayout
                  researchModalOpen={researchModalOpen}
                  setResearchModalOpen={setResearchModalOpen}
                />
              </BrowserRouter>
            </PlayerProvider>
          </PersonalizationProvider>
        </PluginProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
