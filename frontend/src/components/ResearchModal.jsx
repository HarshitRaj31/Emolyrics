import { X, Award, Cpu, Users, Layers, ExternalLink, Sparkles } from "lucide-react";

export default function ResearchModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const team = [
    { name: "Chandrima Chawdhury", id: "359", role: "Team Lead & Research Architect" },
    { name: "Harshit Raj", id: "403", role: "Model Training & Feature Extraction" },
    { name: "Sristi Priya", id: "399", role: "Frontend UI/UX & Interaction" },
    { name: "Dibyendu Khamaru", id: "412", role: "Dataset Curation & Evaluation" },
    { name: "Tribeni Ghorai", id: "455", role: "System Architecture & Integration" }
  ];

  const pipeline = [
    { step: "01", title: "User Input", desc: "User inputs song lyrics in English, Hindi (Devanagari) or Hinglish." },
    { step: "02", title: "Preprocessing", desc: "Lowercasing, punctuation cleaning, and tokenization to preserve affective markers." },
    { step: "03", title: "Feature Extraction", desc: "Multilingual emotion lexicons, sentiment valence, arousal, and phrase matching." },
    { step: "04", title: "Machine Processing", desc: "Multi-layered classification model calculating confidence & primary/secondary tones." },
    { step: "05", title: "Mood Classification", desc: "Classified into 9 discrete emotions (Happy, Sad, Angry, Romantic, etc.)." },
    { step: "06", title: "Output & Playlist", desc: "Confidence gauge, linguistic explanation, and mood-curated song suggestions." }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="EmoLyrics Architecture and Research"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 light:bg-slate-900/45 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto theme-modal rounded-3xl p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Research Modal"
          className="absolute top-5 right-5 p-2 rounded-full text-ink-muted hover:text-ink-main hover:bg-white/10 light:hover:bg-slate-900/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pr-10">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 light:text-amber-600 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink-main">
                EmoLyrics Architecture & Research
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 light:bg-purple-100 text-purple-300 light:text-purple-700 border border-purple-500/30 light:border-purple-200 font-semibold">
                Larana, Inc.
              </span>
            </div>
            <p className="text-sm text-ink-muted">
              Song Lyrics Mood Classification System • Project Benchmarks & Methodology
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl theme-well flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 light:text-purple-700 font-bold shrink-0">
              89%
            </div>
            <div>
              <div className="text-ink-main font-semibold text-sm">Genre Consistency</div>
              <div className="text-xs text-ink-muted">Maintained across Rock, Pop, Hip-Hop & Indie</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl theme-well flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 light:text-emerald-700 font-bold shrink-0">
              87%
            </div>
            <div>
              <div className="text-ink-main font-semibold text-sm">Language Accuracy</div>
              <div className="text-xs text-ink-muted">Effective in English, Hindi & Hinglish lyrics</div>
            </div>
          </div>
          <div className="p-4 rounded-2xl theme-well flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 light:text-amber-700 font-bold shrink-0">
              10
            </div>
            <div>
              <div className="text-ink-main font-semibold text-sm">Target Emotion Spectrums</div>
              <div className="text-xs text-ink-muted">Fine-grained emotion taxonomies</div>
            </div>
          </div>
        </div>

        {/* Pipeline Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-ink-main font-display font-semibold text-lg">
            <Layers className="w-5 h-5 text-purple-400 light:text-purple-600" />
            <span>End-to-End System Pipeline</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pipeline.map((p) => (
              <div key={p.step} className="p-4 rounded-2xl theme-well">
                <div className="text-xs font-mono font-bold text-amber-400 light:text-amber-700 mb-1">{p.step}</div>
                <div className="text-sm font-semibold text-ink-main mb-1">{p.title}</div>
                <div className="text-xs text-ink-muted leading-relaxed">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Research Team */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4 text-ink-main font-display font-semibold text-lg">
            <Users className="w-5 h-5 text-indigo-400 light:text-indigo-600" />
            <span>Research & Engineering Team (EmoLyrics)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {team.map((m) => (
              <div key={m.id} className="p-3.5 rounded-xl theme-well flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {m.id}
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink-main">{m.name}</div>
                  <div className="text-[11px] text-ink-muted">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* References & Links */}
        <div className="pt-4 border-t border-white/10 light:border-slate-900/10 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-muted">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://share.google/4KtdJSaRmEiQjCvHD"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 light:text-amber-700 hover:underline flex items-center gap-1 font-medium"
            >
              IIIT Hyderabad Open Dataset <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span>•</span>
            <a
              href="https://github.com/HarshitRaj31/Emolyrics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 light:text-purple-700 hover:underline flex items-center gap-1 font-medium"
            >
              GitHub Project <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white light:bg-slate-900 text-neutral-950 light:text-white font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

