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
const { resolveMLServiceUrl, parsePositiveInt } = require("../utils/serviceUrls");

const HEALTH_CACHE_TTL_MS = 15000;

class MultilingualMLService {
  constructor() {
    this._cachedHealth = null;
    this._cachedHealthTime = 0;
  }

  getResolution() {
    return resolveMLServiceUrl();
  }

  getBaseUrl() {
    return this.getResolution().url;
  }

  getTimeouts() {
    return {
      healthMs: parsePositiveInt(process.env.ML_HEALTH_TIMEOUT_MS, 4000),
      predictMs: parsePositiveInt(process.env.ML_REQUEST_TIMEOUT_MS, 15000),
      linesMs: parsePositiveInt(process.env.ML_LINES_TIMEOUT_MS, 25000)
    };
  }

  /**
   * Health check with short TTL caching to prevent latency overhead
   */
  async checkHealth(force = false) {
    const now = Date.now();
    if (!force && this._cachedHealth && now - this._cachedHealthTime < HEALTH_CACHE_TTL_MS) {
      return this._cachedHealth;
    }

    const resolution = this.getResolution();
    if (!resolution.configured) {
      this._cachedHealth = {
        online: false,
        configured: false,
        status: "unconfigured",
        error: resolution.reason,
        url: null
      };
      this._cachedHealthTime = now;
      return this._cachedHealth;
    }

    const controller = new AbortController();
    const { healthMs } = this.getTimeouts();
    const timeout = setTimeout(() => controller.abort(), healthMs);

    try {
      const url = `${resolution.url}/health`;
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
        configured: true,
        status: data.status,
        modelVersion: data.modelVersion || "v1.0.0-multilingual-minilm",
        device: data.device || "cpu",
        supportedLanguages: data.supportedLanguages || ["en", "hi", "bn", "es", "fr"],
        supportedEmotions: data.supportedEmotions || [],
        url: resolution.url
      };
      this._cachedHealthTime = now;
      return this._cachedHealth;
    } catch (err) {
      clearTimeout(timeout);
      this._cachedHealth = {
        online: false,
        configured: true,
        status: "offline",
        error: err.message,
        url: resolution.url
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
    const resolution = this.getResolution();

    const handleUnavailable = (reasonMessage) => {
      const isEnglish = targetLang === "en" && !detected.isCodeSwitched;
      if (!isEnglish) {
        const langDisplay = detected.name || targetLang.toUpperCase();
        const offlineErr = new Error(
          `The Multilingual Emotion ML microservice (${resolution.url || "ML_SERVICE_URL unconfigured"}) is currently unreachable or unconfigured (${reasonMessage}). ` +
            `A separately hosted Python FastAPI ML service is required to classify non-English lyrics in ${langDisplay}.`
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
        reason: reasonMessage
      };
    };

    if (!resolution.configured) {
      this._cachedHealth = {
        online: false,
        configured: false,
        status: "unconfigured",
        error: resolution.reason,
        url: null
      };
      this._cachedHealthTime = Date.now();
      return handleUnavailable(resolution.reason);
    }

    const controller = new AbortController();
    const { predictMs } = this.getTimeouts();
    const timeout = setTimeout(() => controller.abort(), predictMs);
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const url = `${resolution.url}/predict`;
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
      this._cachedHealth = { online: false, configured: true, status: "offline", error: err.message, url: resolution.url };
      this._cachedHealthTime = Date.now();
      return handleUnavailable(err.message);
    }
  }

  /**
   * Batched line-by-line emotion prediction with context windowing
   */
  async predictLines({ lines, options = {} }) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new Error("Lines array is required for line-level emotion prediction.");
    }

    const sampleText = lines.filter((l) => (l || "").trim() && !/^\[.*\]$/i.test(l.trim())).slice(0, 5).join(" ");
    const detected = detectLanguage(sampleText || lines[0] || "");
    const targetLang = options.language || detected.code || "en";
    const resolution = this.getResolution();

    const handleUnavailable = (reasonMessage) => {
      const isEnglish = targetLang === "en" && !detected.isCodeSwitched;
      if (!isEnglish) {
        const langDisplay = detected.name || targetLang.toUpperCase();
        const offlineErr = new Error(
          `The Multilingual Emotion ML microservice (${resolution.url || "ML_SERVICE_URL unconfigured"}) is currently unreachable or unconfigured (${reasonMessage}). ` +
            `A separately hosted Python FastAPI ML service is required for non-English line-by-line analysis in ${langDisplay}.`
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
        reason: reasonMessage
      };
    };

    if (!resolution.configured) {
      this._cachedHealth = {
        online: false,
        configured: false,
        status: "unconfigured",
        error: resolution.reason,
        url: null
      };
      this._cachedHealthTime = Date.now();
      return handleUnavailable(resolution.reason);
    }

    const controller = new AbortController();
    const { linesMs } = this.getTimeouts();
    const timeout = setTimeout(() => controller.abort(), linesMs);
    const reqId = `req_lines_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const url = `${resolution.url}/predict-lines`;
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
      this._cachedHealth = { online: false, configured: true, status: "offline", error: err.message, url: resolution.url };
      this._cachedHealthTime = Date.now();
      return handleUnavailable(err.message);
    }
  }
}

const multilingualMLService = new MultilingualMLService();

module.exports = {
  multilingualMLService,
  MultilingualMLService
};

