import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ListMusic,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Edit3,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Clock,
  Music2,
  Disc3,
  SlidersHorizontal,
  FolderPlus,
  Compass
} from "lucide-react";
import { api } from "../services/api";
import { MOOD_DEFINITIONS } from "../data/examples";
import AddSongModal from "../components/playlists/AddSongModal";

const ALL_EMOTIONS = [
  "Happy",
  "Sad",
  "Angry",
  "Romantic",
  "Calm/Chill",
  "Exciting",
  "Patriotic",
  "Thrilling",
  "Horror"
];

export default function PlaylistsPage() {
  const user = null;

  // Navigation & Active View State
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "studio" | "mine"
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playingSong, setPlayingSong] = useState(null);

  // Smart Generator Studio State
  const [generatorEmotions, setGeneratorEmotions] = useState(["Happy"]);
  const [generatorCount, setGeneratorCount] = useState(10);
  const [generatorTitle, setGeneratorTitle] = useState("");
  const [generatorDesc, setGeneratorDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);

  // Edit & Modal State
  const [isAddSongModalOpen, setIsAddSongModalOpen] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  // Load Playlists from Backend & Local Storage (for guest users)
  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getPlaylists();
      let serverPlaylists = res.playlists || [];

      // If guest user, check localStorage for locally created playlists
      let localGuestPlaylists = [];
      try {
        const raw = localStorage.getItem("emolyrics_guest_playlists");
        if (raw) {
          localGuestPlaylists = JSON.parse(raw);
        }
      } catch (e) {
        // ignore parse error
      }

      // Merge avoiding duplicates by _id
      const merged = [...serverPlaylists];
      for (const gp of localGuestPlaylists) {
        if (!merged.some((p) => p._id === gp._id)) {
          merged.push(gp);
        }
      }

      setPlaylists(merged);

      // Default select first preset or previously selected
      if (!selectedPlaylist && merged.length > 0) {
        const defaultPres = merged.find((p) => p.isSystemPreset || p.mood === "Happy") || merged[0];
        setSelectedPlaylist(defaultPres);
      } else if (selectedPlaylist) {
        const refreshed = merged.find((p) => p._id === selectedPlaylist._id);
        if (refreshed) setSelectedPlaylist(refreshed);
      }
    } catch (err) {
      console.error("Failed to load playlists:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const showToast = (msg) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(""), 3500);
  };

  // Group Playlists
  const presetPlaylists = useMemo(
    () => playlists.filter((p) => p.isSystemPreset || (!p.user && ALL_EMOTIONS.includes(p.mood))),
    [playlists]
  );

  const myPlaylists = useMemo(
    () =>
      playlists.filter(
        (p) =>
          !p.isSystemPreset &&
          (p.user || p._id?.startsWith("pl-guest-") || p._id?.startsWith("pl-custom-"))
      ),
    [playlists]
  );

  // Toggle emotion chip in Generator Studio (supports multi-selection!)
  const toggleGeneratorEmotion = (emotion) => {
    if (generatorEmotions.includes(emotion)) {
      if (generatorEmotions.length === 1) return; // Keep at least one
      setGeneratorEmotions(generatorEmotions.filter((e) => e !== emotion));
    } else {
      setGeneratorEmotions([...generatorEmotions, emotion]);
    }
  };

  // Generate Smart Playlist
  const handleGeneratePlaylist = async () => {
    setGenerating(true);
    setGeneratedDraft(null);

    try {
      const res = await api.generatePlaylist({
        emotions: generatorEmotions,
        count: generatorCount,
        title: generatorTitle || undefined,
        description: generatorDesc || undefined,
        autoSave: false
      });

      if (res.success && res.playlist) {
        setGeneratedDraft(res.playlist);
      }
    } catch (err) {
      alert("Failed to generate playlist: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Save Generated Draft to My Playlists
  const handleSaveDraft = async () => {
    if (!generatedDraft) return;

    try {
      let saved = null;
      if (user) {
        const res = await api.createPlaylist(generatedDraft);
        saved = res.playlist;
      } else {
        // Guest mode persistence
        saved = {
          _id: "pl-guest-" + Date.now(),
          ...generatedDraft,
          isSystemPreset: false,
          createdAt: new Date().toISOString()
        };
        const currentLocal = JSON.parse(localStorage.getItem("emolyrics_guest_playlists") || "[]");
        currentLocal.unshift(saved);
        localStorage.setItem("emolyrics_guest_playlists", JSON.stringify(currentLocal));
      }

      setPlaylists((prev) => [saved, ...prev]);
      setSelectedPlaylist(saved);
      setGeneratedDraft(null);
      setGeneratorTitle("");
      setGeneratorDesc("");
      setActiveTab("mine");
      showToast(`Playlist "${saved.title}" saved successfully!`);
    } catch (err) {
      alert("Failed to save playlist: " + err.message);
    }
  };

  // Duplicate Playlist
  const handleDuplicatePlaylist = async (playlist) => {
    if (!playlist) return;
    try {
      let cloned = null;
      if (user && playlist._id && !playlist._id.startsWith("pl-guest-")) {
        const res = await api.duplicatePlaylist(playlist._id);
        cloned = res.playlist;
      } else {
        cloned = {
          _id: "pl-guest-" + Date.now(),
          title: `${playlist.title} (Copy)`,
          description: playlist.description,
          mood: playlist.mood,
          emotions: playlist.emotions || [playlist.mood],
          artwork: playlist.artwork,
          songs: [...(playlist.songs || [])],
          isSystemPreset: false,
          createdAt: new Date().toISOString()
        };
        const currentLocal = JSON.parse(localStorage.getItem("emolyrics_guest_playlists") || "[]");
        currentLocal.unshift(cloned);
        localStorage.setItem("emolyrics_guest_playlists", JSON.stringify(currentLocal));
      }

      setPlaylists((prev) => [cloned, ...prev]);
      setSelectedPlaylist(cloned);
      showToast(`Duplicated "${playlist.title}" into My Playlists!`);
    } catch (err) {
      alert("Duplicate failed: " + err.message);
    }
  };

  // Delete Playlist
  const handleDeletePlaylist = async (playlist) => {
    if (!playlist) return;
    if (playlist.isSystemPreset) {
      alert("Default system presets cannot be deleted.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${playlist.title}"?`)) {
      return;
    }

    try {
      if (user && playlist._id && !playlist._id.startsWith("pl-guest-")) {
        await api.deletePlaylist(playlist._id);
      } else {
        const currentLocal = JSON.parse(localStorage.getItem("emolyrics_guest_playlists") || "[]");
        const filtered = currentLocal.filter((p) => p._id !== playlist._id);
        localStorage.setItem("emolyrics_guest_playlists", JSON.stringify(filtered));
      }

      setPlaylists((prev) => prev.filter((p) => p._id !== playlist._id));
      if (selectedPlaylist?._id === playlist._id) {
        setSelectedPlaylist(playlists.find((p) => p._id !== playlist._id) || null);
      }
      showToast(`Deleted "${playlist.title}".`);
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  // Reorder Songs: Move Up
  const handleMoveSongUp = async (index) => {
    if (!selectedPlaylist || index <= 0) return;
    const updatedSongs = [...selectedPlaylist.songs];
    const temp = updatedSongs[index];
    updatedSongs[index] = updatedSongs[index - 1];
    updatedSongs[index - 1] = temp;

    await updatePlaylistSongs(updatedSongs);
  };

  // Reorder Songs: Move Down
  const handleMoveSongDown = async (index) => {
    if (!selectedPlaylist || index >= selectedPlaylist.songs.length - 1) return;
    const updatedSongs = [...selectedPlaylist.songs];
    const temp = updatedSongs[index];
    updatedSongs[index] = updatedSongs[index + 1];
    updatedSongs[index + 1] = temp;

    await updatePlaylistSongs(updatedSongs);
  };

  // Remove Song from Playlist
  const handleRemoveSong = async (index) => {
    if (!selectedPlaylist) return;
    const updatedSongs = selectedPlaylist.songs.filter((_, i) => i !== index);
    await updatePlaylistSongs(updatedSongs);
    showToast("Song removed from playlist.");
  };

  // Add Song to Playlist
  const handleAddSong = async (newSong) => {
    if (!selectedPlaylist) return;
    const updatedSongs = [...selectedPlaylist.songs, newSong];
    await updatePlaylistSongs(updatedSongs);
    showToast(`Added "${newSong.title}" to playlist!`);
  };

  // Helper to persist updated songs array to backend/localStorage
  const updatePlaylistSongs = async (updatedSongs) => {
    const updated = {
      ...selectedPlaylist,
      songs: updatedSongs
    };

    setSelectedPlaylist(updated);
    setPlaylists((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));

    try {
      if (user && updated._id && !updated._id.startsWith("pl-guest-")) {
        await api.updatePlaylist(updated._id, { songs: updatedSongs });
      } else {
        const currentLocal = JSON.parse(localStorage.getItem("emolyrics_guest_playlists") || "[]");
        const mapped = currentLocal.map((p) => (p._id === updated._id ? updated : p));
        localStorage.setItem("emolyrics_guest_playlists", JSON.stringify(mapped));
      }
    } catch (err) {
      console.warn("Update playlist sync warning:", err.message);
    }
  };

  // Save Edited Title & Description
  const handleSaveInfoEdit = async () => {
    if (!selectedPlaylist) return;
    const updated = {
      ...selectedPlaylist,
      title: editTitle.trim() || selectedPlaylist.title,
      description: editDesc.trim() || selectedPlaylist.description
    };

    setSelectedPlaylist(updated);
    setPlaylists((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setIsEditingInfo(false);

    try {
      if (user && updated._id && !updated._id.startsWith("pl-guest-")) {
        await api.updatePlaylist(updated._id, {
          title: updated.title,
          description: updated.description
        });
      } else {
        const currentLocal = JSON.parse(localStorage.getItem("emolyrics_guest_playlists") || "[]");
        const mapped = currentLocal.map((p) => (p._id === updated._id ? updated : p));
        localStorage.setItem("emolyrics_guest_playlists", JSON.stringify(mapped));
      }
      showToast("Playlist details updated.");
    } catch (err) {
      alert("Failed to update playlist info: " + err.message);
    }
  };

  // Regenerate Current Playlist with fresh song draws
  const handleRegenerateCurrent = async () => {
    if (!selectedPlaylist) return;
    setLoading(true);
    try {
      const res = await api.generatePlaylist({
        emotions: selectedPlaylist.emotions || [selectedPlaylist.mood],
        count: selectedPlaylist.songs?.length || 10,
        title: selectedPlaylist.title,
        description: selectedPlaylist.description
      });

      if (res.success && res.playlist) {
        await updatePlaylistSongs(res.playlist.songs);
        showToast("Playlist regenerated with new song matches!");
      }
    } catch (err) {
      alert("Regeneration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeMoodInfo =
    MOOD_DEFINITIONS[selectedPlaylist?.mood] || MOOD_DEFINITIONS.Happy;

  const togglePlaySong = (songTitle) => {
    setPlayingSong(playingSong === songTitle ? null : songTitle);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans">
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500 text-black font-semibold text-xs shadow-2xl flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
            <ListMusic className="w-4 h-4" />
            <span>Smart Mood-Based Playlist Architecture</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            Mood Soundtracks & Playlists
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Create intelligent soundtracks synchronized with predicted lyrical emotions. Harmonize
            single or multi-mood emotional journeys with verified NLP confidence and listening links.
          </p>
        </div>

        {/* Quick Generator Trigger Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveTab("studio");
              window.scrollTo({ top: 220, behavior: "smooth" });
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 group transition-all"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform text-amber-200" />
            <span>Generate Smart Playlist</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-900/80 border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("presets")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === "presets"
              ? "bg-white text-black shadow-md font-bold"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Mood Categories ({presetPlaylists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("studio")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === "studio"
              ? "bg-purple-600 text-white shadow-md font-bold"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Generator Studio</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
            Multi-Emotion
          </span>
        </button>

        <button
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all ${
            activeTab === "mine"
              ? "bg-white text-black shadow-md font-bold"
              : "text-neutral-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          <span>My Playlists ({myPlaylists.length})</span>
        </button>
      </div>

      {/* VIEW 1: Generator Studio */}
      {activeTab === "studio" && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 space-y-8 animate-fadeIn">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400 mb-1">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Intelligent Emotion Synthesizer</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Create a Custom Mood Playlist
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
              Select one or combine multiple emotions. The algorithm selects songs from verified ML
              analyzed history and curated catalog tracks while enforcing artist diversity.
            </p>
          </div>

          {/* 1. Emotion Selection Chips (Multi-Select Supported) */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Target Emotions (Select Single or Combine Mixed Emotions) *
            </label>
            <div className="flex flex-wrap gap-2.5">
              {ALL_EMOTIONS.map((emotion) => {
                const isSelected = generatorEmotions.includes(emotion);
                const def = MOOD_DEFINITIONS[emotion] || {};
                return (
                  <button
                    key={emotion}
                    type="button"
                    onClick={() => toggleGeneratorEmotion(emotion)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/40 scale-102"
                        : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
                    }`}
                  >
                    <span>{def.emoji}</span>
                    <span>{emotion}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Song Count & Custom Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Number of Songs ({generatorCount} tracks)
              </label>
              <div className="flex items-center gap-2">
                {[5, 10, 15, 20, 25].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setGeneratorCount(cnt)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      generatorCount === cnt
                        ? "bg-white text-black shadow-md"
                        : "bg-white/5 text-neutral-400 hover:bg-white/10"
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Custom Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Midnight Solitude & Tenderness"
                value={generatorTitle}
                onChange={(e) => setGeneratorTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-2">
                Custom Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Atmospheric blend for deep work"
                value={generatorDesc}
                onChange={(e) => setGeneratorDesc(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white placeholder:text-neutral-500 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Action Trigger */}
          <div>
            <button
              onClick={handleGeneratePlaylist}
              disabled={generating}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:opacity-95 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Disc3 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Harmonized Tracks...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    Generate Smart Playlist ({generatorEmotions.join(" + ")} • {generatorCount} tracks)
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Generated Preview Drawer */}
          {generatedDraft && (
            <div className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 space-y-5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Draft Generated Successfully
                  </span>
                  <h3 className="font-display font-bold text-xl text-white mt-1">
                    {generatedDraft.title}
                  </h3>
                  <p className="text-xs text-neutral-300">{generatedDraft.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGeneratePlaylist}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Save to My Playlists</span>
                  </button>
                </div>
              </div>

              {/* Stats pill row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                <span>{generatedDraft.songs.length} Tracks Selected</span>
                <span>•</span>
                <span>
                  {generatedDraft.songs.filter((s) => s.source === "analyzed").length} ML Analyzed History
                </span>
                <span>•</span>
                <span>
                  {generatedDraft.songs.filter((s) => s.source === "recommended").length} Curated Discovery
                </span>
              </div>

              {/* Mini Preview Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {generatedDraft.songs.map((song, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-neutral-500 font-mono text-[10px] w-4">{i + 1}</span>
                      <div className="overflow-hidden">
                        <div className="font-semibold text-white truncate">{song.title}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{song.artist}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300 shrink-0">
                      {song.mood}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Categories / Presets Grid */}
      {activeTab === "presets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-white">
              Official Emotion Presets ({presetPlaylists.length})
            </h3>
            <span className="text-xs text-neutral-400">Click any preset to view & listen</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {ALL_EMOTIONS.map((m) => {
              const def = MOOD_DEFINITIONS[m] || {};
              const matchingPres = presetPlaylists.find(
                (p) => p.mood?.toLowerCase() === m.toLowerCase()
              );
              const isSelected = selectedPlaylist?._id === matchingPres?._id;

              return (
                <button
                  key={m}
                  onClick={() => {
                    if (matchingPres) setSelectedPlaylist(matchingPres);
                  }}
                  className={`p-4 rounded-2xl text-left border transition-all duration-300 relative overflow-hidden group ${
                    isSelected
                      ? "bg-white/15 border-purple-500 shadow-lg shadow-purple-500/20 scale-102"
                      : "bg-neutral-900/60 border-white/5 hover:border-white/20 hover:bg-neutral-900"
                  }`}
                >
                  <div className="text-3xl mb-2">{def.emoji}</div>
                  <h4 className="font-display font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {matchingPres?.title || `${m} Vibes`}
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                    {matchingPres?.description || def.description}
                  </p>
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                    <span>{matchingPres?.songs?.length || 4} songs</span>
                    <Play className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: My Playlists Grid */}
      {activeTab === "mine" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                My Custom Collections ({myPlaylists.length})
              </h3>
              <p className="text-xs text-neutral-400">
                Saved locally in your browser library
              </p>
            </div>
            <button
              onClick={() => setActiveTab("studio")}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </button>
          </div>

          {myPlaylists.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-neutral-900/30 border border-white/5 space-y-3">
              <FolderPlus className="w-10 h-10 text-neutral-500 mx-auto" />
              <h4 className="font-display font-bold text-base text-white">No Custom Playlists Yet</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Use the Generator Studio to generate your first multi-mood soundtrack or save customized
                track sequences.
              </p>
              <button
                onClick={() => setActiveTab("studio")}
                className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors"
              >
                Launch Generator Studio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPlaylists.map((pl) => {
                const isSelected = selectedPlaylist?._id === pl._id;
                return (
                  <div
                    key={pl._id}
                    onClick={() => setSelectedPlaylist(pl)}
                    className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-purple-950/20 border-purple-500 shadow-xl shadow-purple-500/10"
                        : "bg-neutral-900/60 border-white/5 hover:border-white/20 hover:bg-neutral-900"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300">
                          {pl.mood}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicatePlaylist(pl);
                            }}
                            title="Duplicate Playlist"
                            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlaylist(pl);
                            }}
                            title="Delete Playlist"
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-display font-bold text-base text-white">{pl.title}</h4>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{pl.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 font-mono">
                      <span>{pl.songs?.length || 0} tracks</span>
                      <span>{new Date(pl.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVE PLAYLIST DETAIL & TRACKS VIEWER */}
      {selectedPlaylist && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
          {/* Left Hero Card */}
          <div className="lg:col-span-5 space-y-4">
            <div
              className={`p-8 rounded-3xl bg-gradient-to-br ${activeMoodInfo.gradient} text-white shadow-2xl relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

              <div className="relative z-10 space-y-4">
                <div className="text-6xl">{activeMoodInfo.emoji}</div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/80 font-bold px-2 py-0.5 rounded bg-black/20">
                      {selectedPlaylist.isSystemPreset ? "System Preset" : "Custom Playlist"}
                    </span>
                    {selectedPlaylist.emotions?.length > 1 && (
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200 font-bold px-2 py-0.5 rounded bg-amber-400/20">
                        Mixed Harmony
                      </span>
                    )}
                  </div>

                  {isEditingInfo ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/30 text-white font-bold text-xl focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/30 text-white text-xs focus:outline-none resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveInfoEdit}
                          className="px-3 py-1 rounded-lg bg-white text-black font-bold text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingInfo(false)}
                          className="px-3 py-1 rounded-lg bg-black/40 text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <h2 className="font-display text-3xl font-extrabold text-white mt-1">
                        {selectedPlaylist.title}
                      </h2>
                      <p className="text-xs text-white/90 leading-relaxed font-sans mt-1">
                        {selectedPlaylist.description || activeMoodInfo.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs text-white/90">
                  <div className="flex items-center gap-2">
                    <Disc3 className="w-4 h-4" />
                    <span>{selectedPlaylist.songs?.length || 0} Tracks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Duration: ~{Math.round((selectedPlaylist.songs?.length || 0) * 3.5)} mins</span>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsAddSongModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Track</span>
                  </button>

                  <button
                    onClick={handleRegenerateCurrent}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>

                  <button
                    onClick={() => handleDuplicatePlaylist(selectedPlaylist)}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>

                  {!selectedPlaylist.isSystemPreset && (
                    <>
                      <button
                        onClick={() => {
                          setEditTitle(selectedPlaylist.title);
                          setEditDesc(selectedPlaylist.description);
                          setIsEditingInfo(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Info</span>
                      </button>

                      <button
                        onClick={() => handleDeletePlaylist(selectedPlaylist)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/30 hover:bg-rose-500/50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tracklist & Reorder Management */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs font-semibold uppercase text-neutral-400 tracking-wider">
              <span>Track Title & Artist</span>
              <div className="flex items-center gap-6">
                <span>Listening Links</span>
                <span>Reorder / Actions</span>
              </div>
            </div>

            {selectedPlaylist.songs?.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 space-y-2">
                <Music2 className="w-8 h-8 mx-auto text-neutral-600" />
                <p>No tracks currently in this playlist.</p>
                <button
                  onClick={() => setIsAddSongModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                >
                  Add First Track
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {selectedPlaylist.songs?.map((song, idx) => {
                  const isPlaying = playingSong === song.title;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl gap-3 transition-all ${
                        isPlaying
                          ? "bg-white/15 border border-purple-500/40 text-white shadow-md"
                          : "bg-white/5 hover:bg-white/10 text-neutral-200"
                      }`}
                    >
                      {/* Left: Index, Play simulation, Title, Artist, Source badge */}
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button
                          onClick={() => togglePlaySong(song.title)}
                          className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center transition-all ${
                            isPlaying
                              ? "bg-amber-400 text-black shadow-md shadow-amber-400/30"
                              : "bg-black/40 text-neutral-400 hover:text-white"
                          }`}
                          title={isPlaying ? "Pause Preview" : "Play Preview"}
                        >
                          {isPlaying ? (
                            <Volume2 className="w-4 h-4 animate-pulse" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white truncate">
                              {song.title}
                            </span>
                            {song.source === "analyzed" ? (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0"
                                title="Verified by EmoLyrics ML Emotion Classifier"
                              >
                                ML {song.confidence ? `${song.confidence}%` : "Verified"}
                              </span>
                            ) : (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-mono text-neutral-400 bg-white/5 border border-white/10 shrink-0"
                                title="Curated Discovery based on emotional resonance"
                              >
                                Discovery
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400 truncate flex items-center gap-2 mt-0.5">
                            <span>{song.artist}</span>
                            <span>•</span>
                            <span className="font-mono">{song.duration || "3:30"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: External Listening Links & Reordering Controls */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        {/* Spotify Link */}
                        <a
                          href={
                            song.spotifyUrl ||
                            `https://open.spotify.com/search/${encodeURIComponent(
                              song.title + " " + song.artist
                            )}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Open on Spotify"
                        >
                          <span>Spotify</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>

                        {/* YouTube Link */}
                        <a
                          href={
                            song.youtubeUrl ||
                            `https://www.youtube.com/results?search_query=${encodeURIComponent(
                              song.title + " " + song.artist + " audio"
                            )}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Open on YouTube"
                        >
                          <span>YouTube</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>

                        {/* Reorder Up */}
                        <button
                          onClick={() => handleMoveSongUp(idx)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors"
                          title="Move Track Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Reorder Down */}
                        <button
                          onClick={() => handleMoveSongDown(idx)}
                          disabled={idx === selectedPlaylist.songs.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white disabled:opacity-20 transition-colors"
                          title="Move Track Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove Track */}
                        <button
                          onClick={() => handleRemoveSong(idx)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 transition-colors ml-1"
                          title="Remove Song from Playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Song Modal */}
      <AddSongModal
        isOpen={isAddSongModalOpen}
        onClose={() => setIsAddSongModalOpen(false)}
        onAddSong={handleAddSong}
        defaultMood={selectedPlaylist?.mood || "Happy"}
      />
    </div>
  );
}
