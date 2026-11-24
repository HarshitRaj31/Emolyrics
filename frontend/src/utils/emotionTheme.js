/**
 * Centralized Emotion Color & Contrast Tokens
 * Guarantees consistent recognition across all 10 canonical + 9 legacy emotions
 * and WCAG AA text contrast in both Dark Mode and Light Mode.
 */

export const EMOTION_THEME_TOKENS = {
  Happiness: {
    emoji: "☀️",
    color: "#f59e0b",
    darkText: "#fbbf24",
    lightText: "#b45309",
    darkBg: "rgba(245, 158, 11, 0.14)",
    lightBg: "rgba(245, 158, 11, 0.14)",
    gradient: "from-amber-400 via-orange-500 to-yellow-500"
  },
  Sadness: {
    emoji: "🌧️",
    color: "#3b82f6",
    darkText: "#60a5fa",
    lightText: "#1d4ed8",
    darkBg: "rgba(59, 130, 246, 0.15)",
    lightBg: "rgba(59, 130, 246, 0.12)",
    gradient: "from-blue-600 via-indigo-700 to-slate-800"
  },
  Love: {
    emoji: "💖",
    color: "#ec4899",
    darkText: "#f472b6",
    lightText: "#be185d",
    darkBg: "rgba(236, 72, 153, 0.15)",
    lightBg: "rgba(236, 72, 153, 0.12)",
    gradient: "from-pink-500 via-rose-600 to-purple-700"
  },
  Anger: {
    emoji: "🔥",
    color: "#ef4444",
    darkText: "#f87171",
    lightText: "#b91c1c",
    darkBg: "rgba(239, 68, 68, 0.15)",
    lightBg: "rgba(239, 68, 68, 0.12)",
    gradient: "from-red-600 via-rose-700 to-neutral-900"
  },
  Nostalgia: {
    emoji: "⏳",
    color: "#8b5cf6",
    darkText: "#a78bfa",
    lightText: "#6d28d9",
    darkBg: "rgba(139, 92, 246, 0.16)",
    lightBg: "rgba(139, 92, 246, 0.12)",
    gradient: "from-purple-600 via-indigo-700 to-slate-900"
  },
  Fear: {
    emoji: "👻",
    color: "#6366f1",
    darkText: "#818cf8",
    lightText: "#4338ca",
    darkBg: "rgba(99, 102, 241, 0.16)",
    lightBg: "rgba(99, 102, 241, 0.12)",
    gradient: "from-indigo-600 via-violet-800 to-slate-900"
  },
  Excitement: {
    emoji: "⚡",
    color: "#f97316",
    darkText: "#fb923c",
    lightText: "#c2410c",
    darkBg: "rgba(249, 115, 22, 0.15)",
    lightBg: "rgba(249, 115, 22, 0.13)",
    gradient: "from-orange-500 via-amber-500 to-purple-600"
  },
  Hope: {
    emoji: "🌅",
    color: "#06b6d4",
    darkText: "#22d3ee",
    lightText: "#0e7490",
    darkBg: "rgba(6, 182, 212, 0.15)",
    lightBg: "rgba(6, 182, 212, 0.12)",
    gradient: "from-cyan-500 via-sky-600 to-indigo-700"
  },
  Loneliness: {
    emoji: "🥀",
    color: "#64748b",
    darkText: "#cbd5e1",
    lightText: "#334155",
    darkBg: "rgba(100, 116, 139, 0.2)",
    lightBg: "rgba(100, 116, 139, 0.14)",
    gradient: "from-slate-600 via-slate-700 to-neutral-900"
  },
  Calmness: {
    emoji: "🌿",
    color: "#10b981",
    darkText: "#34d399",
    lightText: "#047857",
    darkBg: "rgba(16, 185, 129, 0.15)",
    lightBg: "rgba(16, 185, 129, 0.12)",
    gradient: "from-teal-500 via-emerald-600 to-cyan-700"
  }
};

// Alias legacy 9-class labels to the same contrast-checked tokens
const LEGACY_ALIAS_MAP = {
  Happy: "Happiness",
  Sad: "Sadness",
  Angry: "Anger",
  Romantic: "Love",
  "Calm/Chill": "Calmness",
  Exciting: "Excitement",
  Patriotic: "Excitement",
  Thrilling: "Nostalgia",
  Horror: "Fear"
};

// Safe neutral fallback for unknown, null, or missing emotion values
export const NEUTRAL_EMOTION_TOKEN = {
  emoji: "🎵",
  color: "#a1a1aa",
  darkText: "#d4d4d8",
  lightText: "#52525b",
  darkBg: "rgba(161, 161, 170, 0.15)",
  lightBg: "rgba(161, 161, 170, 0.12)",
  gradient: "from-zinc-500 via-neutral-600 to-stone-700"
};

export function getEmotionToken(emotionName) {
  if (!emotionName || typeof emotionName !== "string") return NEUTRAL_EMOTION_TOKEN;
  const trimmed = emotionName.trim();
  if (EMOTION_THEME_TOKENS[trimmed]) return EMOTION_THEME_TOKENS[trimmed];
  if (LEGACY_ALIAS_MAP[trimmed]) return EMOTION_THEME_TOKENS[LEGACY_ALIAS_MAP[trimmed]];

  // Case-insensitive lookup
  const lower = trimmed.toLowerCase();
  for (const [key, token] of Object.entries(EMOTION_THEME_TOKENS)) {
    if (key.toLowerCase() === lower) return token;
  }
  for (const [alias, targetKey] of Object.entries(LEGACY_ALIAS_MAP)) {
    if (alias.toLowerCase() === lower && EMOTION_THEME_TOKENS[targetKey]) {
      return EMOTION_THEME_TOKENS[targetKey];
    }
  }

  return NEUTRAL_EMOTION_TOKEN;
}

export function getEmotionBadgeStyle(emotionName, isDark = true) {
  const token = getEmotionToken(emotionName);
  return {
    backgroundColor: isDark ? token.darkBg : token.lightBg,
    color: isDark ? token.darkText : token.lightText,
    borderColor: isDark ? `${token.color}40` : `${token.color}45`
  };
}

