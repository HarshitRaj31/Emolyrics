/**
 * EmoLyrics AI Music & Mood Assistant Service
 * Powered by local Ollama LLM (qwen2.5:7b) with multilingual NLP intent extraction
 * and seamlessly orchestrates existing EmoLyrics engines:
 *  - ML Multilingual Emotion Classification
 *  - MusicBrainz Metadata Search
 *  - Mood Recommendation Engine
 *  - Smart Playlist Generator
 *  - User Analysis History
 */

const { getIsConnected, memoryStore } = require("../db");
const ChatMessage = require("../models/ChatMessage");
const Analysis = require("../models/Analysis");
const Playlist = require("../models/Playlist");
const recommendationService = require("./recommendationService");
const playlistGeneratorService = require("./playlistGeneratorService");
const musicBrainzAdapter = require("../plugins/adapters/musicbrainzAdapter");
const { classifyMultilingualLyrics } = require("../nlp/multilingualClassifier");

const VALID_EMOTIONS = [
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

// Activity to Mood Mapping Heuristics
const ACTIVITY_MOOD_MAP = {
  "road trip": ["Happy", "Exciting"],
  "driving": ["Happy", "Calm/Chill"],
  "studying": ["Calm/Chill"],
  "study": ["Calm/Chill"],
  "focus": ["Calm/Chill"],
  "reading": ["Calm/Chill"],
  "sleep": ["Calm/Chill"],
  "sleeping": ["Calm/Chill"],
  "relaxing": ["Calm/Chill"],
  "meditation": ["Calm/Chill"],
  "workout": ["Exciting"],
  "gym": ["Exciting", "Angry"],
  "running": ["Exciting"],
  "party": ["Exciting", "Happy"],
  "dance": ["Exciting", "Happy"],
  "club": ["Exciting"],
  "rainy evening": ["Sad", "Calm/Chill"],
  "rainy day": ["Sad", "Calm/Chill"],
  "heartbreak": ["Sad"],
  "breakup": ["Sad"],
  "sad moment": ["Sad"],
  "date night": ["Romantic"],
  "candlelight": ["Romantic"],
  "love": ["Romantic"],
  "bollywood romance": ["Romantic"],
  "rage": ["Angry"],
  "workout fury": ["Angry", "Exciting"],
  "nightmare": ["Horror", "Thrilling"],
  "spooky": ["Horror"],
  "halloween": ["Horror"],
  "mystery": ["Thrilling"],
  "suspense": ["Thrilling"]
};

class AIAssistantService {
  constructor() {
    // Dynamic resolution allows changing OLLAMA_MODEL or OLLAMA_BASE_URL without process restart
  }

  /**
   * Get configured model name dynamically from environment
   */
  getModelName() {
    return process.env.OLLAMA_MODEL || "qwen2.5:3b";
  }

  /**
   * Get configured Ollama base URL dynamically from environment
   */
  getBaseUrl() {
    return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  }

  /**
   * Main Conversational Handler (Optimized for CPU inference)
   */
  async processUserMessage({ message, sessionId, userId = null, history = [] }) {
    if (!message || !message.trim()) {
      throw new Error("Message text is required.");
    }

    const trimmedMsg = message.trim();

    // 1. Save incoming user message to ChatMessage store
    await this.saveMessage({
      sessionId,
      userId,
      role: "user",
      content: trimmedMsg
    });

    // 2. Fetch only the latest 4-6 conversation messages for context (CPU efficiency)
    let conversationHistory = history;
    if (!conversationHistory || conversationHistory.length === 0) {
      conversationHistory = await this.getSessionHistory(sessionId, 6);
    }

    // 3. Extract intent and execute subsystem actions locally (~1ms, zero LLM overhead)
    const localIntent = this.extractIntentLocally(trimmedMsg, conversationHistory);
    let actionResult = null;
    try {
      actionResult = await this.executeIntentAction(localIntent, {
        userId,
        sessionId,
        originalMessage: trimmedMsg
      });
    } catch (actErr) {
      console.warn("[AIAssistant] Action execution warning:", actErr.message);
    }

    // 4. Generate AI response using local Ollama model (CPU-optimized parameters)
    const activeModel = this.getModelName();
    let replyText = "";
    let providerName = `Ollama (${activeModel})`;
    let responseTimeMs = 0;

    try {
      const ollamaRes = await this.callOllamaChat({
        userMessage: trimmedMsg, // Completely preserved with no truncation!
        history: conversationHistory,
        actionResult,
        intent: localIntent
      });
      replyText = ollamaRes.content;
      providerName = `Ollama (${ollamaRes.model})`;
      responseTimeMs = ollamaRes.durationMs || 0;
    } catch (ollamaErr) {
      console.warn("[AIAssistant] Ollama generation failed:", ollamaErr.message);

      const errLower = (ollamaErr.message || "").toLowerCase();
      const isConnectionRefused =
        errLower.includes("econnrefused") ||
        errLower.includes("could not connect") ||
        errLower.includes("failed to fetch");
      const isModelMissing =
        errLower.includes("not found") ||
        errLower.includes("missing") ||
        errLower.includes("model");

      if (isModelMissing) {
        replyText = `The local Ollama model "${activeModel}" is missing. Please open your terminal and run:\n\`\`\`bash\nollama pull ${activeModel}\n\`\`\`\nOnce downloaded, send your message again!`;
      } else if (isConnectionRefused) {
        replyText = `Could not connect to Ollama at ${this.getBaseUrl()}. Please ensure the Ollama service is running locally:\n\`\`\`bash\nollama serve\n\`\`\`\nThen try sending your message again!`;
      } else {
        replyText = `Ollama service error: ${ollamaErr.message}. Please verify your local Ollama setup.`;
      }

      // If subsystem generated lyrics analysis, append it so user gets instant value even if Ollama was unreachable
      if (actionResult?.type === "analysis" && actionResult.analysis) {
        const fallbackComp = this.composeAssistantResponse(localIntent, actionResult, "Local Lexical Engine");
        replyText += `\n\n*(Local NLP Classification)*:\n${fallbackComp.text}`;
      }
      providerName = "Ollama (Offline/Unavailable)";
    }

    // 5. Construct rich metadata payload for frontend cards (analysis badge, song cards, playlist cards)
    const { responseData, followUpSuggestions } = this.buildResponseMetadata(actionResult);

    // 6. Save assistant message to ChatMessage store
    await this.saveMessage({
      sessionId,
      userId,
      role: "assistant",
      content: replyText,
      intent: localIntent.intent,
      data: responseData
    });

    return {
      success: true,
      sessionId,
      reply: replyText,
      message: replyText,
      intent: localIntent.intent,
      provider: providerName,
      responseTimeMs,
      data: responseData,
      followUpSuggestions
    };
  }

  /**
   * Helper to format action results into UI card payloads & follow-ups
   */
  buildResponseMetadata(actionResult) {
    let responseData = null;
    let followUpSuggestions = [];

    if (actionResult) {
      if (actionResult.type === "analysis" && actionResult.analysis) {
        const { analysis } = actionResult;
        responseData = {
          type: "analysis",
          analysis: {
            mood: analysis.mood,
            emoji: analysis.emoji,
            confidence: analysis.confidence,
            language: analysis.language,
            explanation: analysis.explanation,
            detectedKeywords: analysis.detectedKeywords,
            scores: analysis.scores
          }
        };
        followUpSuggestions = [
          `Recommend songs that feel like ${analysis.mood}`,
          `Create a ${analysis.mood} playlist`,
          `Analyze another verse`
        ];
      } else if (actionResult.type === "playlist" && actionResult.playlist) {
        const { playlist } = actionResult;
        responseData = {
          type: "playlist",
          playlist: {
            title: playlist.title,
            description: playlist.description,
            mood: playlist.mood,
            emotions: playlist.emotions,
            songs: playlist.songs,
            stats: playlist.stats
          }
        };
        followUpSuggestions = [
          `Save this playlist to my account`,
          `Regenerate with more tracks`,
          `Recommend similar songs`
        ];
      } else if (actionResult.type === "recommendations" && actionResult.songs?.length > 0) {
        responseData = {
          type: "songs",
          songs: actionResult.songs.map((s) => ({
            title: s.title,
            artist: s.artist,
            album: s.album || "Single",
            duration: s.duration || "3:30",
            coverArtUrl: s.coverArtUrl,
            mood: s.mood || actionResult.primaryMood,
            confidence: s.confidence,
            source: s.source || "recommended",
            spotifyUrl: s.spotifyUrl,
            youtubeUrl: s.youtubeUrl,
            explanation:
              s.traits?.join(" • ") ||
              `Matches ${actionResult.primaryMood} emotional resonance.`
          }))
        };
        followUpSuggestions = [
          `Create a playlist with these songs`,
          `Find more ${actionResult.primaryMood} songs`,
          `Explain why these match my mood`
        ];
      }
    }

    if (followUpSuggestions.length === 0) {
      followUpSuggestions = [
        "Explain heartbreak in song lyrics",
        "Analyze lyrics: I miss you every day",
        "Recommend happy songs for a road trip"
      ];
    }

    return { responseData, followUpSuggestions };
  }

  /**
   * Real-Time Streaming Conversational Handler (Server-Sent Events)
   * Streams token chunks incrementally from Ollama (NDJSON) to the client using SSE.
   */
  async streamUserMessage({ message, sessionId, userId = null, req, res }) {
    if (!message || !message.trim()) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, message: "Message text is required." }));
    }

    const trimmedMsg = message.trim();

    // 1. Save incoming user message to ChatMessage store
    await this.saveMessage({
      sessionId,
      userId,
      role: "user",
      content: trimmedMsg
    });

    // 2. Fetch latest 6 messages for context
    const conversationHistory = await this.getSessionHistory(sessionId, 6);

    // 3. Extract intent and execute subsystem actions locally (~1ms)
    const localIntent = this.extractIntentLocally(trimmedMsg, conversationHistory);
    let actionResult = null;
    try {
      actionResult = await this.executeIntentAction(localIntent, {
        userId,
        sessionId,
        originalMessage: trimmedMsg
      });
    } catch (actErr) {
      console.warn("[AIAssistant] Action execution warning:", actErr.message);
    }

    // 4. Construct rich metadata payload for cards
    const { responseData, followUpSuggestions } = this.buildResponseMetadata(actionResult);

    // 5. Set up Server-Sent Events headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    // Client disconnection detection & cancellation
    let clientDisconnected = false;
    const abortController = new AbortController();
    req.on("close", () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        abortController.abort();
      }
    });

    const activeModel = this.getModelName();

    // 6. Send initial SSE 'start' event with metadata / cards if available
    res.write(
      `data: ${JSON.stringify({
        type: "start",
        sessionId,
        intent: localIntent.intent,
        provider: `Ollama (${activeModel})`,
        data: responseData
      })}\n\n`
    );

    // 7. Prepare Ollama request
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/api/chat`;

    let systemContext =
      "You are the EmoLyrics Music Assistant. Specialize in song lyrics, moods, emotions, music recommendations, and lyric interpretation. EmoLyrics recognizes 9 emotion classes: Happy, Sad, Angry, Romantic, Calm/Chill, Exciting, Patriotic, Thrilling, Horror. Provide concise, empathetic, and musically insightful responses in 1-2 focused paragraphs.";

    if (actionResult && actionResult.type === "analysis" && actionResult.analysis) {
      const a = actionResult.analysis;
      systemContext += ` [Current lyrics classified as ${a.mood} (${a.confidence}% confidence). Key markers: ${a.detectedKeywords?.slice(0, 3).join(", ") || "none"}].`;
    }

    const historyMessages = (conversationHistory || [])
      .filter((m) => m && m.content && (m.role === "user" || m.role === "assistant"))
      .slice(-6)
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

    if (historyMessages.length > 0 && historyMessages[historyMessages.length - 1].content === trimmedMsg) {
      historyMessages.pop();
    }

    const messages = [
      { role: "system", content: systemContext },
      ...historyMessages,
      { role: "user", content: trimmedMsg }
    ];

    const startTime = Date.now();
    let fullReply = "";
    let evalCount = 0;

    try {
      const ollamaFetch = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          messages,
          stream: true,
          keep_alive: "10m",
          options: {
            num_predict: 200,
            temperature: 0.6,
            num_ctx: 2048
          }
        }),
        signal: abortController.signal
      });

      if (!ollamaFetch.ok) {
        let errorBody = "";
        try {
          const errorJson = await ollamaFetch.json();
          errorBody = errorJson.error || JSON.stringify(errorJson);
        } catch {
          errorBody = await ollamaFetch.text().catch(() => "");
        }
        throw new Error(`Ollama API error ${ollamaFetch.status}: ${errorBody || ollamaFetch.statusText}`);
      }

      if (!ollamaFetch.body) {
        throw new Error("Ollama response body is empty or unreadable.");
      }

      const reader = ollamaFetch.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (clientDisconnected) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Retain incomplete chunk

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed);
            const chunkText = chunk.message?.content;
            if (typeof chunkText === "string" && chunkText.length > 0) {
              fullReply += chunkText;
              res.write(
                `data: ${JSON.stringify({
                  type: "chunk",
                  content: chunkText
                })}\n\n`
              );
            }
            if (chunk.done) {
              evalCount = chunk.eval_count || 0;
            }
          } catch (parseErr) {
            console.warn("[AIAssistant] Error parsing Ollama stream chunk:", parseErr.message);
          }
        }
      }

      // Handle any trailing buffer
      if (!clientDisconnected && buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer.trim());
          const chunkText = chunk.message?.content;
          if (typeof chunkText === "string" && chunkText.length > 0) {
            fullReply += chunkText;
            res.write(
              `data: ${JSON.stringify({
                type: "chunk",
                content: chunkText
              })}\n\n`
            );
          }
          if (chunk.done) {
            evalCount = chunk.eval_count || evalCount;
          }
        } catch {
          // ignore
        }
      }

      const durationMs = Date.now() - startTime;
      const tokensPerSec = evalCount > 0 ? (evalCount / (durationMs / 1000)).toFixed(1) : "N/A";
      console.log(
        `[AIAssistant] Ollama stream finished in ${durationMs}ms (${(durationMs / 1000).toFixed(2)}s) | Model: ${activeModel} | Tokens: ${evalCount} (~${tokensPerSec} t/s) | Context: ${messages.length} msgs`
      );

      // Save assistant message to ChatMessage store once completed
      if (fullReply.trim()) {
        await this.saveMessage({
          sessionId,
          userId,
          role: "assistant",
          content: fullReply.trim(),
          intent: localIntent.intent,
          data: responseData
        });
      }

      if (!clientDisconnected) {
        res.write(
          `data: ${JSON.stringify({
            type: "done",
            reply: fullReply.trim(),
            responseTimeMs: durationMs,
            evalCount,
            provider: `Ollama (${activeModel})`,
            data: responseData,
            followUpSuggestions
          })}\n\n`
        );
        res.end();
      }
    } catch (ollamaErr) {
      if (clientDisconnected || abortController.signal.aborted) {
        return;
      }
      console.warn("[AIAssistant] Ollama streaming error:", ollamaErr.message);

      const errLower = (ollamaErr.message || "").toLowerCase();
      let fallbackReply = "";

      if (errLower.includes("not found") || errLower.includes("missing")) {
        fallbackReply = `The local Ollama model "${activeModel}" is missing. Please open your terminal and run:\n\`\`\`bash\nollama pull ${activeModel}\n\`\`\`\nOnce downloaded, send your message again!`;
      } else if (
        errLower.includes("econnrefused") ||
        errLower.includes("could not connect") ||
        errLower.includes("failed to fetch")
      ) {
        fallbackReply = `Could not connect to Ollama at ${this.getBaseUrl()}. Please ensure the Ollama service is running locally:\n\`\`\`bash\nollama serve\n\`\`\`\nThen try sending your message again!`;
      } else {
        fallbackReply = `Ollama streaming error: ${ollamaErr.message}. Please verify your local Ollama setup.`;
      }

      if (actionResult?.type === "analysis" && actionResult.analysis) {
        const fallbackComp = this.composeAssistantResponse(localIntent, actionResult, "Local Lexical Engine");
        fallbackReply += `\n\n*(Local NLP Classification)*:\n${fallbackComp.text}`;
      }

      // Stream fallback chunk
      res.write(
        `data: ${JSON.stringify({
          type: "chunk",
          content: fallbackReply
        })}\n\n`
      );

      await this.saveMessage({
        sessionId,
        userId,
        role: "assistant",
        content: fallbackReply,
        intent: localIntent.intent,
        data: responseData
      });

      res.write(
        `data: ${JSON.stringify({
          type: "done",
          reply: fallbackReply,
          responseTimeMs: Date.now() - startTime,
          provider: "Ollama (Offline/Unavailable)",
          data: responseData,
          followUpSuggestions
        })}\n\n`
      );
      res.end();
    }
  }

  /**
   * Save Message to MongoDB or MemoryStore
   */
  async saveMessage({ sessionId, userId, role, content, intent = "general", data = null }) {
    try {
      if (getIsConnected()) {
        await ChatMessage.create({
          sessionId,
          user: userId,
          role,
          content,
          intent,
          data
        });
      } else {
        memoryStore.chatMessages.push({
          _id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          sessionId,
          user: userId,
          role,
          content,
          intent,
          data,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("[AIAssistant] Failed to save chat message:", err.message);
    }
  }

  /**
   * Retrieve Chat History for a Session
   */
  async getSessionHistory(sessionId, limit = 50) {
    if (!sessionId) return [];

    try {
      if (getIsConnected()) {
        return await ChatMessage.find({ sessionId })
          .sort({ createdAt: 1 })
          .limit(limit)
          .lean();
      } else {
        return memoryStore.chatMessages
          .filter((m) => m.sessionId === sessionId)
          .slice(-limit);
      }
    } catch (err) {
      console.error("[AIAssistant] Error fetching session history:", err);
      return [];
    }
  }

  /**
   * Clear Chat History for a Session
   */
  async clearSessionHistory(sessionId) {
    if (!sessionId) return { success: true };

    try {
      if (getIsConnected()) {
        await ChatMessage.deleteMany({ sessionId });
      } else {
        memoryStore.chatMessages = memoryStore.chatMessages.filter(
          (m) => m.sessionId !== sessionId
        );
      }
      return { success: true, message: "Conversation cleared." };
    } catch (err) {
      console.error("[AIAssistant] Error clearing session history:", err);
      throw err;
    }
  }

  /**
   * Local NLU Intent & Slot Extractor (Zero-failure rule engine)
   */
  extractIntentLocally(message, history = []) {
    const lower = message.toLowerCase();

    // Check for Lyrics Analysis request (user mentions "lyrics", "analyze", or pastes lines)
    const isMultiLine = message.split("\n").filter((l) => l.trim().length > 0).length >= 2;
    const hasLyricsTrigger =
      lower.includes("analyze") ||
      lower.includes("classify") ||
      lower.includes("these lyrics") ||
      lower.includes("what mood is") ||
      lower.includes("what emotion is") ||
      isMultiLine;

    if (hasLyricsTrigger && (message.length > 35 || lower.includes("lyrics"))) {
      // Extract lyrics snippet
      let extractedLyrics = message;
      const quoteMatch = message.match(/["']([^"']{15,})["']/);
      if (quoteMatch) {
        extractedLyrics = quoteMatch[1];
      } else {
        // Strip common prefix phrases
        extractedLyrics = extractedLyrics
          .replace(/^(can you |please )?(analyze|classify)\s*(the\s*(mood|emotion)\s*of\s*)?(these\s*|the\s*)?(lyrics|song|track)?\s*:?/i, "")
          .replace(/^lyrics\s*:?/i, "")
          .trim();
      }

      if (!extractedLyrics) {
        return {
          intent: "general_music",
          conversationalIntro: "Please provide the lyrics you would like me to analyze! For example: `Analyze lyrics: 'Walking on sunshine, whoa-oh! And don't it feel good!'`",
          directReply: "Please provide the lyrics you would like me to analyze! For example: `Analyze lyrics: 'Walking on sunshine, whoa-oh! And don't it feel good!'`",
          userQuery: message
        };
      }

      return {
        intent: "lyrics_analysis",
        lyrics: extractedLyrics,
        userQuery: message
      };
    }

    // Check for Playlist Generation request
    const isPlaylistRequest =
      lower.includes("playlist") ||
      lower.includes("create a playlist") ||
      lower.includes("make a playlist") ||
      lower.includes("generate a playlist") ||
      lower.includes("soundtrack for");

    // Check for Song Search
    const isSearchRequest =
      (lower.startsWith("find") || lower.startsWith("search") || lower.startsWith("lookup")) &&
      (lower.includes("song") || lower.includes("track") || lower.includes("by"));

    // Check for Explanation request
    const isExplainRequest =
      lower.includes("why") &&
      (lower.includes("classified") || lower.includes("sad") || lower.includes("happy") || lower.includes("emotion"));

    // Check for User History request
    const isHistoryRequest =
      lower.includes("my history") ||
      lower.includes("my mood history") ||
      lower.includes("previously analyzed") ||
      lower.includes("my saved songs") ||
      lower.includes("my stats");

    // Extract Target Emotions from prompt
    const detectedEmotions = [];
    for (const em of VALID_EMOTIONS) {
      const emLower = em.toLowerCase();
      if (lower.includes(emLower)) {
        detectedEmotions.push(em);
      }
    }

    // Extract Mood from Activity or Situation
    for (const [activity, moods] of Object.entries(ACTIVITY_MOOD_MAP)) {
      if (lower.includes(activity)) {
        for (const m of moods) {
          if (!detectedEmotions.includes(m)) {
            detectedEmotions.push(m);
          }
        }
      }
    }

    // Extract Language filter
    let language = null;
    if (lower.includes("hindi") || lower.includes("bollywood") || lower.includes("desh")) {
      language = "Hindi";
    } else if (lower.includes("bengali") || lower.includes("bangla") || lower.includes("tagore")) {
      language = "Bengali";
    } else if (lower.includes("spanish") || lower.includes("latino") || lower.includes("español")) {
      language = "Spanish";
    } else if (lower.includes("french") || lower.includes("français")) {
      language = "French";
    } else if (lower.includes("english")) {
      language = "English";
    }

    // Extract Song Count requested
    let count = 5;
    const countMatch = lower.match(/\b([1-9]|1[0-9]|20)\s*(songs|tracks)?\b/);
    if (countMatch && parseInt(countMatch[1], 10)) {
      count = Math.min(Math.max(parseInt(countMatch[1], 10), 3), 20);
    }

    // Extract Artist name if mentioned
    let artist = null;
    const artistPatterns = [
      /(?:by|from|artist)\s+([a-zA-Z\s]{3,20})/i,
      /(coldplay|arijit singh|adele|queen|ed sheeran|taylor swift|lizzo|pharrell williams|avicii|enrique iglesias|edith piaf|rabindranath tagore)/i
    ];
    for (const pat of artistPatterns) {
      const match = message.match(pat);
      if (match && match[1]) {
        artist = match[1].trim();
        break;
      }
    }

    if (isPlaylistRequest) {
      return {
        intent: "playlist_generation",
        emotions: detectedEmotions.length > 0 ? detectedEmotions : ["Happy"],
        count: count >= 5 ? count : 10,
        language,
        artist,
        userQuery: message
      };
    }

    if (isExplainRequest) {
      return {
        intent: "explain_prediction",
        emotion: detectedEmotions[0] || "Sad",
        userQuery: message
      };
    }

    if (isHistoryRequest) {
      return {
        intent: "user_history",
        userQuery: message
      };
    }

    if (isSearchRequest && !detectedEmotions.length) {
      const cleanSearch = message
        .replace(/^(find|search|lookup|get)\s*(me)?\s*(a|the)?\s*(song|track)?\s*(called|named)?/i, "")
        .trim();
      return {
        intent: "song_search",
        query: cleanSearch || message,
        userQuery: message
      };
    }

    // Default to Recommendation
    return {
      intent: "recommendation",
      emotions: detectedEmotions.length > 0 ? detectedEmotions : ["Happy"],
      language,
      artist,
      count,
      userQuery: message
    };
  }

  /**
   * Safely parse raw response from AI providers (Gemini / OpenAI).
   * Strips markdown fences, extracts JSON substring if present,
   * and handles plain conversational text without throwing SyntaxErrors.
   */
  parseAiResponse(rawText, userMessage) {
    if (!rawText || typeof rawText !== "string") {
      return null;
    }

    const trimmed = rawText.trim();

    // 1. Try stripping markdown code fences if present
    const cleaned = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // 2. Try regex extraction of first JSON object { ... }
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch {
          // ignore
        }
      }
    }

    // 3. Fallback: If AI returned plain conversational text instead of JSON schema, handle as text!
    console.info("[AIAssistant] AI provider returned conversational plain text instead of JSON schema.");
    return {
      intent: "general_music",
      conversationalIntro: trimmed,
      directReply: trimmed,
      userQuery: userMessage
    };
  }

  /**
   * Send CPU-optimized chat request to local Ollama instance (POST http://127.0.0.1:11434/api/chat)
   * Configuration for CPU-only execution (16GB RAM):
   *   - model: dynamically read from OLLAMA_MODEL in .env (e.g. qwen2.5:3b)
   *   - stream: false
   *   - keep_alive: "10m" (pins model in RAM to eliminate per-turn cold reload overhead)
   *   - options.num_predict: 160 (concise generation token limit for fast CPU inference)
   *   - options.num_ctx: 2048 (bounded context window for lower memory footprint)
   *   - options.temperature: 0.5 (focused, coherent generation)
   */
  async callOllamaChat({ userMessage, history = [], actionResult = null, intent = null }) {
    const baseUrl = this.getBaseUrl();
    const model = this.getModelName();
    const url = `${baseUrl}/api/chat`;

    // 1. Concise system prompt focused strictly on lyrics, moods, emotions, recommendations, and interpretations
    let systemContext =
      "You are the EmoLyrics Music Assistant. Specialize in song lyrics, moods, emotions, music recommendations, and lyric interpretation. EmoLyrics recognizes 9 emotion classes: Happy, Sad, Angry, Romantic, Calm/Chill, Exciting, Patriotic, Thrilling, Horror. Provide concise, empathetic, and musically insightful responses in 1-2 focused paragraphs.";

    // If local NLP classifier detected lyrics emotion, add brief context
    if (actionResult && actionResult.type === "analysis" && actionResult.analysis) {
      const a = actionResult.analysis;
      systemContext += ` [Current lyrics classified as ${a.mood} (${a.confidence}% confidence). Key markers: ${a.detectedKeywords?.slice(0, 3).join(", ") || "none"}].`;
    }

    // 2. Format only the latest 6 relevant conversation messages (excluding the current user message)
    const historyMessages = (history || [])
      .filter((m) => m && m.content && (m.role === "user" || m.role === "assistant"))
      .slice(-6) // Limit conversation history to the latest 6 messages
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

    // Avoid duplicate user message if it was already recorded in history
    if (historyMessages.length > 0 && historyMessages[historyMessages.length - 1].content === userMessage) {
      historyMessages.pop();
    }

    // 3. Assemble messages: System + recent history + FULL UNTRUNCATED user message
    const messages = [
      { role: "system", content: systemContext },
      ...historyMessages,
      { role: "user", content: userMessage } // 100% full text preserved with zero truncation!
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    const startTime = Date.now();
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          keep_alive: "10m",
          options: {
            num_predict: 200,
            temperature: 0.6,
            num_ctx: 2048
          }
        }),
        signal: controller.signal
      });
    } catch (networkErr) {
      clearTimeout(timeout);
      if (networkErr.name === "AbortError") {
        throw new Error("Ollama request timed out after 90 seconds.");
      }
      throw new Error(`Could not connect to Ollama at ${baseUrl} (${networkErr.message})`);
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      let errorBody = "";
      try {
        const errorJson = await res.json();
        errorBody = errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorBody = await res.text().catch(() => "");
      }

      if (res.status === 404 || errorBody.toLowerCase().includes("not found")) {
        throw new Error(`Ollama model "${model}" not found. Run 'ollama pull ${model}' in your terminal.`);
      }
      throw new Error(`Ollama API error ${res.status}: ${errorBody || res.statusText}`);
    }

    const data = await res.json();
    const content = data?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response received from Ollama: missing message.content");
    }

    // Measure and log Ollama response time on the backend (Requirement 9)
    const evalCount = data.eval_count || 0;
    const tokensPerSec = evalCount > 0 ? (evalCount / (durationMs / 1000)).toFixed(1) : "N/A";
    console.log(
      `[AIAssistant] Ollama responded in ${durationMs}ms (${(durationMs / 1000).toFixed(2)}s) | Model: ${model} | Tokens: ${evalCount} (~${tokensPerSec} t/s) | Context: ${messages.length} msgs`
    );

    return {
      content: content.trim(),
      model: data.model || model,
      durationMs,
      evalCount,
      raw: data
    };
  }

  /**
   * Execute Action using existing EmoLyrics Subsystems
   */
  async executeIntentAction(parsedIntent, context) {
    const { intent } = parsedIntent;
    const { userId } = context;

    switch (intent) {
      // General conversational or direct AI reply
      case "general_music": {
        return {
          type: "general",
          reply:
            parsedIntent.directReply ||
            parsedIntent.conversationalIntro ||
            "I'm your EmoLyrics AI Music Assistant! I can analyze lyrics for emotional tone, recommend tracks tailored to your mood, build smart playlists, and explain song emotions. How can I help you today?"
        };
      }

      // 1. Lyrics Analysis Intent
      case "lyrics_analysis": {
        const rawLyrics = (parsedIntent.lyrics || context.originalMessage || "").trim();
        const cleanedLyrics = rawLyrics
          .replace(/^(can you |please )?(analyze|classify)\s*(the\s*(mood|emotion)\s*of\s*)?(these\s*|the\s*)?(lyrics|song|track)?\s*:?/i, "")
          .replace(/^lyrics\s*:?/i, "")
          .trim();

        if (!cleanedLyrics) {
          return {
            type: "general",
            reply:
              "Please provide the lyrics you would like me to analyze! For example: `Analyze lyrics: 'Walking on sunshine, whoa-oh! And don't it feel good!'`"
          };
        }

        const lyricsToAnalyze = cleanedLyrics || rawLyrics;
        const analysis = classifyMultilingualLyrics(lyricsToAnalyze);
        return {
          type: "analysis",
          analysis,
          lyrics: lyricsToAnalyze
        };
      }

      // 2. Playlist Generation Intent
      case "playlist_generation": {
        const emotions = parsedIntent.emotions?.length ? parsedIntent.emotions : ["Happy"];
        const count = parsedIntent.count || 10;
        const generated = await playlistGeneratorService.generatePlaylist({
          emotions,
          count,
          userId
        });
        return {
          type: "playlist",
          playlist: generated,
          emotions
        };
      }

      // 3. Song Search Intent
      case "song_search": {
        const query = parsedIntent.query || context.originalMessage;
        let searchResults = [];
        try {
          const res = await musicBrainzAdapter.searchRecordings(query, 5);
          searchResults = (res.recordings || []).map((rec) => ({
            title: rec.title,
            artist: rec.artist,
            album: rec.album || "Single",
            coverArtUrl: rec.coverArtUrl,
            spotifyUrl: rec.spotifyUrl,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(rec.title + " " + rec.artist + " audio")}`,
            source: "search"
          }));
        } catch (searchErr) {
          console.warn("[AIAssistant] MusicBrainz search fallback:", searchErr.message);
        }
        return {
          type: "search",
          query,
          songs: searchResults
        };
      }

      // 4. User History Intent
      case "user_history": {
        let historySongs = [];
        if (getIsConnected() && userId) {
          historySongs = await Analysis.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(6)
            .lean();
        } else {
          historySongs = memoryStore.analyses.slice(0, 6);
        }
        return {
          type: "history",
          songs: historySongs,
          total: historySongs.length
        };
      }

      // 5. Explanation Intent
      case "explain_prediction": {
        const emotion = parsedIntent.emotion || "Sad";
        return {
          type: "explanation",
          emotion
        };
      }

      // 6. Recommendation Intent (Default)
      case "recommendation":
      default: {
        const targetEmotions = parsedIntent.emotions?.length ? parsedIntent.emotions : ["Happy"];
        const primaryMood = targetEmotions[0];
        const count = parsedIntent.count || 5;

        // Fetch recommendations from existing catalog + analyses
        let recResult = null;
        try {
          recResult = await recommendationService.getRecommendations({
            mood: primaryMood,
            limit: count,
            seedArtist: parsedIntent.artist || undefined
          });
        } catch (recErr) {
          console.warn("[AIAssistant] Rec error:", recErr.message);
        }

        let songs = recResult?.recommendations || [];

        // Apply language filter if explicitly requested
        if (parsedIntent.language && songs.length > 0) {
          const filteredByLang = songs.filter(
            (s) => s.language?.toLowerCase() === parsedIntent.language.toLowerCase()
          );
          if (filteredByLang.length >= 2) {
            songs = filteredByLang;
          }
        }

        // Apply artist filter if requested
        if (parsedIntent.artist && songs.length > 0) {
          const qArtist = parsedIntent.artist.toLowerCase();
          const matchArtist = songs.filter((s) => s.artist.toLowerCase().includes(qArtist));
          if (matchArtist.length > 0) {
            songs = matchArtist;
          }
        }

        return {
          type: "recommendations",
          primaryMood,
          emotions: targetEmotions,
          language: parsedIntent.language,
          songs: songs.slice(0, count)
        };
      }
    }
  }

  /**
   * Compose Assistant Conversational Response
   */
  composeAssistantResponse(parsedIntent, actionResult, provider) {
    let text = "";
    let data = null;
    let followUpSuggestions = [];

    switch (actionResult.type) {
      case "analysis": {
        const { analysis } = actionResult;
        text = `I analyzed these lyrics using our **${analysis.language} Multilingual NLP Model**.
The dominant emotion detected is **${analysis.mood} ${analysis.emoji}** with a confidence score of **${analysis.confidence}%**.

${analysis.explanation}

${analysis.detectedKeywords?.length > 0 ? `*Key emotional markers:* ${analysis.detectedKeywords.map((k) => `\`#${k}\``).join(" ")}` : ""}`;

        data = {
          type: "analysis",
          analysis: {
            mood: analysis.mood,
            emoji: analysis.emoji,
            confidence: analysis.confidence,
            language: analysis.language,
            explanation: analysis.explanation,
            detectedKeywords: analysis.detectedKeywords,
            scores: analysis.scores
          }
        };

        followUpSuggestions = [
          `Recommend songs that feel like ${analysis.mood}`,
          `Create a ${analysis.mood} playlist`,
          `Analyze another verse`
        ];
        break;
      }

      case "playlist": {
        const { playlist, emotions } = actionResult;
        text = `I have synthesized a personalized **${playlist.title}** for you! 
This smart playlist blends **${emotions.join(" & ")}** vibrations across **${playlist.songs.length} tracks**, enforcing artist diversity and balanced valence. You can review the tracks below and save it directly to your account.`;

        data = {
          type: "playlist",
          playlist: {
            title: playlist.title,
            description: playlist.description,
            mood: playlist.mood,
            emotions: playlist.emotions,
            songs: playlist.songs,
            stats: playlist.stats
          }
        };

        followUpSuggestions = [
          `Save this playlist to my account`,
          `Regenerate with more tracks`,
          `Recommend similar songs`
        ];
        break;
      }

      case "search": {
        const { query, songs } = actionResult;
        if (songs.length > 0) {
          text = `I searched MusicBrainz metadata for **"${query}"** and found ${songs.length} verified recordings:`;
          data = {
            type: "songs",
            songs
          };
        } else {
          text = `I searched for **"${query}"** but couldn't find an exact match on MusicBrainz. Try searching with a different artist name or song title.`;
        }

        followUpSuggestions = [
          `Recommend songs similar to ${query}`,
          `Search for another artist`,
          `Generate a playlist`
        ];
        break;
      }

      case "history": {
        const { songs } = actionResult;
        if (songs.length > 0) {
          text = `Here are your recent lyrics analyses from EmoLyrics. Your most frequent emotion markers are reflected below:`;
          data = {
            type: "songs",
            songs: songs.map((s) => ({
              title: s.title,
              artist: s.artist,
              mood: s.mood,
              confidence: s.confidence,
              source: "analyzed",
              spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(s.title + " " + s.artist)}`,
              youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(s.title + " " + s.artist + " audio")}`
            }))
          };
        } else {
          text = `You haven't analyzed any song lyrics yet. Paste a favorite verse into the Analyze tab or paste it right here in chat to get started!`;
        }

        followUpSuggestions = [
          `Recommend songs based on my history`,
          `Create a playlist from my top mood`,
          `Analyze new lyrics`
        ];
        break;
      }

      case "explanation": {
        const { emotion } = actionResult;
        text = `In the EmoLyrics 9-emotion framework, **${emotion}** lyrics are classified by evaluating semantic valence, arousal levels, and lexical keyword densities.
For instance, the model extracts high-salience terms (e.g. sorrow, tears, rain for Sad; sunshine, smiles, joy for Happy) and scores them through our multi-layered lexicon engine without requiring machine translation.`;

        followUpSuggestions = [
          `Show me ${emotion} song recommendations`,
          `Create a ${emotion} playlist`,
          `Test with real lyrics`
        ];
        break;
      }

      case "general": {
        text = actionResult.reply || "I'm your EmoLyrics AI Assistant. How can I help you explore music and emotions today?";
        data = null;
        followUpSuggestions = [
          "Recommend happy songs for a road trip",
          "Analyze lyrics: 'Walking on sunshine'",
          "Create a calm relaxing playlist"
        ];
        break;
      }

      case "recommendations":
      default: {
        const primaryMood = actionResult?.primaryMood || parsedIntent?.mood || "Music";
        const emotions = Array.isArray(actionResult?.emotions)
          ? actionResult.emotions
          : (Array.isArray(parsedIntent?.emotions) ? parsedIntent.emotions : [primaryMood]);
        const language = actionResult?.language || parsedIntent?.language || null;
        const songs = Array.isArray(actionResult?.songs) ? actionResult.songs : [];

        const langStr = language ? ` in ${language}` : "";
        const emotionStr = emotions.length > 0 ? emotions.join(" & ") : primaryMood;

        text = `Here are hand-curated **${emotionStr}** tracks${langStr} perfectly tuned for your vibe. Each song has verified metadata and instant Spotify/YouTube listening links:`;

        data = {
          type: "songs",
          songs: songs.map((s) => ({
            title: s.title,
            artist: s.artist,
            album: s.album || "Single",
            duration: s.duration || "3:30",
            coverArtUrl: s.coverArtUrl,
            mood: s.mood || primaryMood,
            confidence: s.confidence,
            source: s.source || "recommended",
            spotifyUrl: s.spotifyUrl,
            youtubeUrl: s.youtubeUrl,
            explanation:
              s.traits?.join(" • ") ||
              `Matches ${primaryMood} emotional resonance with expressive valence and melody.`
          }))
        };

        followUpSuggestions = [
          `Create a playlist with these songs`,
          `Find more ${primaryMood} songs`,
          `Suggest songs in another language`
        ];
        break;
      }
    }

    if (parsedIntent && parsedIntent.conversationalIntro && actionResult.type !== "general") {
      const intro = String(parsedIntent.conversationalIntro).trim();
      if (intro && !text.includes(intro)) {
        text = `${intro}\n\n${text}`;
      }
    }

    return {
      text,
      data,
      followUpSuggestions
    };
  }
}

const aiAssistantService = new AIAssistantService();
module.exports = aiAssistantService;

