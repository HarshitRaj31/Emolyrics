import { useState } from "react";
import { X, Lock, Mail, User, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isRegister && !formData.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(formData);
        setSuccess("Account created successfully!");
      } else {
        await login({ email: formData.email, password: formData.password });
        setSuccess("Signed in successfully!");
      }
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 900);
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? "Join EmoLyrics" : "Sign In to EmoLyrics"}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 light:bg-slate-900/45 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md theme-modal rounded-3xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Authentication Modal"
          className="absolute top-5 right-5 p-2 rounded-full text-ink-muted hover:text-ink-main hover:bg-white/10 light:hover:bg-slate-900/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-display text-2xl font-bold text-ink-main">
            {isRegister ? "Join EmoLyrics" : "Welcome Back"}
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            {isRegister
              ? "Create an account to save analyses and playlists"
              : "Sign in to access your saved lyrics and favorites"}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 theme-well p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              !isRegister ? "bg-white light:bg-slate-900 text-neutral-950 light:text-white shadow" : "text-ink-muted hover:text-ink-main"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
              isRegister ? "bg-white light:bg-slate-900 text-neutral-950 light:text-white shadow" : "text-ink-muted hover:text-ink-main"
            }`}
          >
            Register
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 light:text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 light:text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Chandrima Chawdhury"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-dim" />
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl font-display font-semibold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? "Create Free Account" : "Sign In to EmoLyrics"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

