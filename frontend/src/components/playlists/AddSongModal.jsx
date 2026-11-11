import { useState } from "react";
import { Plus, X, Music2, Clock, Sparkles } from "lucide-react";
import { MOOD_DEFINITIONS } from "../../data/examples";

export default function AddSongModal({ isOpen, onClose, onAddSong, defaultMood = "Happy" }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [duration, setDuration] = useState("3:30");
  const [mood, setMood] = useState(defaultMood);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setError("Please provide both song title and artist.");
      return;
    }

    const newSong = {
      title: title.trim(),
      artist: artist.trim(),
      album: "Custom Addition",
      duration: duration.trim() || "3:30",
      mood,
      source: "manual",
      spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(title.trim() + " " + artist.trim())}`,
      youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(title.trim() + " " + artist.trim() + " audio")}`,
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"
    };

    onAddSong(newSong);
    setTitle("");
    setArtist("");
    setDuration("3:30");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 light:bg-slate-900/50 backdrop-blur-md animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md theme-modal rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 light:bg-purple-50 text-purple-400 light:text-purple-600 border border-purple-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink-main">Add Song to Playlist</h3>
              <p className="text-xs text-ink-muted">Append track with automatic listening links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full text-ink-muted hover:text-ink-main hover:bg-white/10 light:hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 light:bg-rose-50 border border-rose-500/30 text-rose-300 light:text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">
              Track Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Yellow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">
              Artist Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Coldplay"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl glass-input text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">
                Duration (MM:SS)
              </label>
              <input
                type="text"
                placeholder="3:30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2 rounded-xl glass-input text-ink-main placeholder:text-neutral-500 light:placeholder:text-slate-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">
                Emotion Mood
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-ink-main text-sm"
              >
                {Object.keys(MOOD_DEFINITIONS).map((m) => (
                  <option key={m} value={m}>
                    {MOOD_DEFINITIONS[m]?.emoji} {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink-main transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-purple-500/20"
            >
              Add Track
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

