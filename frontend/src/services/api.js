const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getAuthHeader() {
  const token = localStorage.getItem("emolyrics_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (networkErr) {
    throw new Error(networkErr.message || "Network connection failed");
  }

  let data;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = { message: "Invalid JSON response from server" };
    }
  } else {
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: `Request failed with status ${response.status}` };
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // MusicBrainz & Authorized Lyrics Discovery
  searchMusic: (query, limit = 10) =>
    request(`/music/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  getLyrics: (params) => {
    const searchParams = new URLSearchParams(params);
    return request(`/music/lyrics?${searchParams.toString()}`);
  },

  analyzeSongWithMetadata: (payload) =>
    request("/music/analyze-song", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Mood-Based Recommendations
  getRecommendations: ({ mood, seedTitle, seedArtist, exclude = [], limit = 6 } = {}) =>
    request("/music/recommendations", {
      method: "POST",
      body: JSON.stringify({ mood, seedTitle, seedArtist, exclude, limit })
    }),

  // NLP Emotion Analysis
  analyzeLyrics: (payload) =>
    request("/analyze-mood", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Advanced AI Mood Analysis (Multi-Emotion, Line-by-Line & Ollama Interpretation)
  analyzeLyricsAdvanced: (payload) =>
    request("/analyze-advanced", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Multilingual & Translation Support (Phase 6)
  detectLanguage: (lyrics) =>
    request("/detect-language", {
      method: "POST",
      body: JSON.stringify({ lyrics })
    }),

  translateLyrics: (payload) =>
    request("/translate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Analyses History & CRUD
  getAnalyses: ({ mood, search, page = 1, limit = 12 } = {}) => {
    const params = new URLSearchParams();
    if (mood && mood !== "All") params.append("mood", mood);
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    return request(`/analyses?${params.toString()}`);
  },

  saveAnalysis: (payload) =>
    request("/analyses", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  deleteAnalysis: (id) =>
    request(`/analyses/${id}`, {
      method: "DELETE"
    }),

  // Playlists (Phase 7 Smart Generator & Customization)
  getPlaylists: (params = {}) => {
    const sp = new URLSearchParams();
    if (params.scope) sp.append("scope", params.scope);
    if (params.mood && params.mood !== "All") sp.append("mood", params.mood);
    return request(`/playlists?${sp.toString()}`);
  },
  getPlaylistById: (id) => request(`/playlists/${encodeURIComponent(id)}`),
  getPlaylistByMood: (mood) => request(`/playlists/${encodeURIComponent(mood)}`),
  generatePlaylist: (payload) =>
    request("/playlists/generate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createPlaylist: (payload) =>
    request("/playlists", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updatePlaylist: (id, payload) =>
    request(`/playlists/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deletePlaylist: (id) =>
    request(`/playlists/${id}`, {
      method: "DELETE"
    }),
  duplicatePlaylist: (id) =>
    request(`/playlists/${id}/duplicate`, {
      method: "POST"
    }),

  // Interactive Mood Analytics (Phase 5)
  getAnalytics: ({ scope, timeframe, startDate, endDate, mood, artist } = {}) => {
    const params = new URLSearchParams();
    if (scope) params.append("scope", scope);
    if (timeframe) params.append("timeframe", timeframe);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (mood && mood !== "All") params.append("mood", mood);
    if (artist && artist !== "All") params.append("artist", artist);
    return request(`/analytics?${params.toString()}`);
  },

  // Stats & Team Benchmarks
  getStats: () => request("/stats"),

  // Authentication
  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),

  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getMe: () => request("/auth/me"),

  // User Profile, History & Saved Songs (Phase 4)
  getUserProfile: () => request("/user/profile"),

  updateUserProfile: (payload) =>
    request("/user/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),

  getUserHistory: ({ search, mood, sort = "newest", page = 1, limit = 12 } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (mood && mood !== "All") params.append("mood", mood);
    if (sort) params.append("sort", sort);
    params.append("page", page);
    params.append("limit", limit);
    return request(`/user/history?${params.toString()}`);
  },

  deleteHistoryItem: (id) =>
    request(`/user/history/${id}`, {
      method: "DELETE"
    }),

  clearAllHistory: () =>
    request("/user/history", {
      method: "DELETE"
    }),

  getSavedSongs: () => request("/user/saved-songs"),

  saveFavoriteSong: (payload) =>
    request("/user/saved-songs", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  removeSavedSong: (id) =>
    request(`/user/saved-songs/${id}`, {
      method: "DELETE"
    }),

  // AI Music Assistant (Phase 8) - Non-streaming request (preserved for compatibility)
  sendAssistantMessage: (messageOrPayload, sessionId) => {
    let body;
    if (typeof messageOrPayload === "string") {
      body = { message: messageOrPayload, sessionId, stream: false };
    } else if (messageOrPayload && typeof messageOrPayload === "object") {
      body = {
        message: messageOrPayload.message ?? messageOrPayload.query ?? messageOrPayload.prompt ?? messageOrPayload.text ?? "",
        sessionId: messageOrPayload.sessionId || sessionId,
        stream: false
      };
    } else {
      body = { message: "", sessionId, stream: false };
    }

    return request("/assistant/chat", {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  // AI Music Assistant Streaming (Server-Sent Events)
  streamAssistantMessage: async function* (messageOrPayload, sessionId, { signal } = {}) {
    let body;
    if (typeof messageOrPayload === "string") {
      body = { message: messageOrPayload, sessionId, stream: true };
    } else if (messageOrPayload && typeof messageOrPayload === "object") {
      body = {
        message:
          messageOrPayload.message ??
          messageOrPayload.query ??
          messageOrPayload.prompt ??
          messageOrPayload.text ??
          "",
        sessionId: messageOrPayload.sessionId || sessionId,
        stream: true
      };
    } else {
      body = { message: "", sessionId, stream: true };
    }

    const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...getAuthHeader()
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      let errorMsg = `Request failed with status ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.message || errData.error || errorMsg;
      } catch {
        const text = await response.text();
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }

    const contentType = response.headers.get("content-type") || "";
    // If backend replied with non-streaming JSON
    if (!contentType.includes("text/event-stream")) {
      const data = await response.json();
      yield { type: "done", ...data };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Retain incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // Skip comments/empty lines
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            try {
              const eventData = JSON.parse(jsonStr);
              yield eventData;
            } catch (e) {
              console.warn("Failed to parse SSE event JSON:", jsonStr);
            }
          }
        }
      }

      if (buffer.trim() && buffer.trim().startsWith("data: ")) {
        try {
          const eventData = JSON.parse(buffer.trim().slice(6));
          yield eventData;
        } catch {
          // ignore
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  getAssistantHistory: (sessionId) =>
    request(`/assistant/history?sessionId=${encodeURIComponent(sessionId)}`),

  clearAssistantHistory: (sessionId) =>
    request("/assistant/clear", {
      method: "POST",
      body: JSON.stringify({ sessionId })
    }),

  saveAssistantPlaylist: (playlist) =>
    request("/assistant/save-playlist", {
      method: "POST",
      body: JSON.stringify({ playlist })
    })
};
