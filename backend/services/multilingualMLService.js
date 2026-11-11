/**
 * EmoLyrics Multilingual Emotion ML Service Connector (Node.js -> Python FastAPI)
 * Connects to the local Python ML microservice running the trained
 * multilingual classifier (MiniLM + Neural MLP Head) on port 8001.
 *
 * Enforces strict fallback rules:
 *   - English: Gracefully falls back to deterministic lexical engine if ML service is offline.
 *   - Non-English (hi, bn, es, fr, hinglish, banglish): Explicitly blocks English lexical fallback
 *     to prevent inaccurate classifications, returning a descriptive error.
 */

const { detectLanguage } = require("../nlp/languageDetector");

const DEFAULT_ML_SERVICE_URL = "http://127.0.0.1:8001";
const REQUEST_TIMEOUT_MS = 5000;
const HEALTH_CACHE_TTL_MS = 15000;

class MultilingualMLService {
  constructor() {
    this._cachedHealth = null;
    this._cachedHealthTime = 0;
  }

  getBaseUrl() {
    return (process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL).replace(/\/$/, "");
  }

  /**
   * Health check with short TTL caching to prevent latency overhead
   */
  async checkHealth(force = false) {
    const now = Date.now();
    if (!force && this._cachedHealth && now - this._cachedHealthTime < HEALTH_CACHE_TTL_MS) {
      return this._cachedHealth;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    try {
      const url = `${this.getBaseUrl()}/health`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`ML service returned HTTP ${res.status}`);
      }

      const data = await res.json();
      this._cachedHealth = {
        online: data.status === "healthy",
        status: data.status,
        modelVersion: data.modelVersion || "v1.0.0-multilingual-minilm",
        device: data.device || "cpu",
        supportedLanguages: data.supportedLanguages || ["en", "hi", "bn", "es", "fr"],
        supportedEmotions: data.supportedEmotions || [],
        url: this.getBaseUrl()
      };
      this._cachedHealthTime = now;
      return this._cachedHealth;
    } catch (err) {
      clearTimeout(timeout);
      this._cachedHealth = {
        online: false,
        status: "offline",
        error: err.message,
        url: this.getBaseUrl()
      };
      this._cachedHealthTime = now;
      return this._cachedHealth;
    }
  }

  /**
   * Executes original-language emotion prediction via Python ML microservice
   */
  async predictEmotion({ lyrics, language = null }) {
    if (!lyrics || typeof lyrics !== "string" || !lyrics.trim()) {
      throw new Error("Lyrics text is required for emotion prediction.");
    }

    const cleanLyrics = lyrics.trim();
    const detected = detectLanguage(cleanLyrics);
    const targetLang = language || detected.code || "en";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const url = `${this.getBaseUrl()}/predict`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Request-ID": reqId
        },
        body: JSON.stringify({
          text: cleanLyrics,
          language: language || undefined
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ML service HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      // Convert probabilities to percentage map for UI distribution
      const emotionDistribution = {};
      let totalPct = 0;
      if (data.emotionProbabilities) {
        for (const [em, p] of Object.entries(data.emotionProbabilities)) {
          const pct = Math.round(p * 100);
          emotionDistribution[em] = pct;
          totalPct += pct;
        }
        // Normalize rounding diff to primary emotion
        const diff = 100 - totalPct;
        if (data.primaryEmotion && emotionDistribution[data.primaryEmotion] !== undefined) {
          emotionDistribution[data.primaryEmotion] = Math.max(0, emotionDistribution[data.primaryEmotion] + diff);
        }
      }

      return {
        success: true,
        requestId: data.requestId || reqId,
        source: "multilingual_neural_model",
        primaryEmotion: data.primaryEmotion,
        confidence: Math.round(data.confidence * 100 * 10) / 10,
        rawConfidence: data.confidence,
        durationMs: data.durationMs || null,
        isCached: Boolean(data.isCached),
        secondaryEmotions: data.secondaryEmotions || [],
        emotionProbabilities: data.emotionProbabilities || {},
        emotionDistribution,
        language: data.language,
        languageName: data.languageName || detected.name || data.language,
        modelVersion: data.modelVersion || "v1.2.0-production-calibrated",
        isCodeSwitched: Boolean(data.isCodeSwitched),
        codeSwitchType: data.codeSwitchType || null,
        scriptBreakdown: data.scriptBreakdown || {},
        languageDistribution: data.languageDistribution || {},
        isUncertain: Boolean(data.isUncertain),
        uncertaintyDetails: data.uncertaintyDetails || null,
        temperature: data.temperature || 1.0295,
        isSupported: Boolean(data.isSupported),
        warning: data.warning || null,
        textPreview: data.textPreview || cleanLyrics.slice(0, 120)
      };
    } catch (err) {
      clearTimeout(timeout);
      this._cachedHealth = { online: false, status: "offline", error: err.message };
      this._cachedHealthTime = Date.now();

      // Strict Fallback Rule:
      // If language is English (en), permit fallback to deterministic lexical engine.
      // If language is non-English (hi, bn, es, fr, hinglish, banglish), NEVER silently fall back!
      const isEnglish = targetLang === "en" && !detected.isCodeSwitched;

      if (!isEnglish) {
        const langDisplay = detected.name || targetLang.toUpperCase();
        const offlineErr = new Error(
          `The Multilingual Emotion ML microservice (${this.getBaseUrl()}) is currently unreachable or offline (${err.message}). ` +
          `To classify non-English lyrics in ${langDisplay}, please start the Python ML service (` +
          `run: "python -m src.api" in ml-services/). English lexical fallback is only permitted for English lyrics.`
        );
        offlineErr.statusCode = 503;
        offlineErr.code = "ERR_MULTILINGUAL_SERVICE_OFFLINE";
        offlineErr.detectedLanguage = targetLang;
        offlineErr.isEnglish = false;
        throw offlineErr;
      }

      // Permitted English fallback
      return {
        success: false,
        source: "fallback_permitted_english",
        fallbackPermitted: true,
        language: "en",
        reason: err.message
      };
    }
  }

  /**
   * Batched line-by-line emotion prediction with context windowing
   */
  async predictLines({ lines, options = {} }) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error("Lines array is required for line-level emotion prediction.");
    }

    const sampleText = lines.filter(l => (l || "").trim() && !/^\[.*\]$/i.test(l.trim())).slice(0, 5).join(" ");
    const detected = detectLanguage(sampleText || lines[0] || "");
    const targetLang = options.language || detected.code || "en";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const reqId = `req_lines_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const url = `${this.getBaseUrl()}/predict-lines`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Request-ID": reqId
        },
        body: JSON.stringify({
          lines,
          contextWindow: options.contextWindow !== undefined ? options.contextWindow : 1,
          language: options.language || undefined
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ML service HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      return {
        success: true,
        requestId: data.requestId || reqId,
        count: data.count,
        lines: data.lines,
        contextWindow: data.contextWindow,
        durationMs: data.durationMs,
        modelVersion: data.modelVersion || "v1.2.0-production-calibrated",
        source: "multilingual_neural_model"
      };
    } catch (err) {
      clearTimeout(timeout);
      this._cachedHealth = { online: false, status: "offline", error: err.message };
      this._cachedHealthTime = Date.now();

      const isEnglish = targetLang === "en" && !detected.isCodeSwitched;
      if (!isEnglish) {
        const langDisplay = detected.name || targetLang.toUpperCase();
        const offlineErr = new Error(
          `The Multilingual Emotion ML microservice (${this.getBaseUrl()}) is currently unreachable or offline (${err.message}). ` +
          `To perform line-by-line analysis on non-English lyrics in ${langDisplay}, please start the Python ML service (` +
          `run: "python -m src.api" in ml-services/). English lexical fallback is only permitted for English lyrics.`
        );
        offlineErr.statusCode = 503;
        offlineErr.code = "ERR_MULTILINGUAL_SERVICE_OFFLINE";
        offlineErr.detectedLanguage = targetLang;
        offlineErr.isEnglish = false;
        throw offlineErr;
      }

      return {
        success: false,
        source: "fallback_permitted_english",
        fallbackPermitted: true,
        language: "en",
        reason: err.message
      };
    }
  }
}

const multilingualMLService = new MultilingualMLService();

module.exports = {
  multilingualMLService,
  MultilingualMLService
};

