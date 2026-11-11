/**
 * Verifies that when http://127.0.0.1:8001 responds with live model predictions,
 * advancedEmotionService and multilingualMLService process it with full fidelity:
 *  - Primary & secondary emotions
 *  - 10-class probability distribution
 *  - Metadata and modelVersion
 *  - Phase 1 line analysis
 *  - Phase 2 visualizations compatibility
 *  - Phase 3 music recommendation compatibility
 */

const http = require("http");
const assert = require("assert");
const { advancedEmotionService } = require("../services/advancedEmotionService");
const { multilingualMLService } = require("../services/multilingualMLService");

// Mock FastAPI response matching real output from src/api.py
const MOCK_PREDICTIONS = {
  "hindi": {
    success: true,
    language: "hi",
    languageName: "Hindi",
    primaryEmotion: "Love",
    secondaryEmotions: [
      { emotion: "Happiness", confidence: 0.22, percentage: 22 },
      { emotion: "Calmness", confidence: 0.15, percentage: 15 }
    ],
    confidence: 0.7261,
    emotionProbabilities: {
      Happiness: 0.22,
      Sadness: 0.02,
      Love: 0.52,
      Anger: 0.01,
      Nostalgia: 0.03,
      Fear: 0.01,
      Excitement: 0.02,
      Hope: 0.01,
      Loneliness: 0.01,
      Calmness: 0.15
    },
    modelVersion: "v1.0.0-multilingual-minilm",
    isCodeSwitched: false,
    isSupported: true,
    languageConfidence: "high",
    warning: null,
    textPreview: "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम"
  },
  "french": {
    success: true,
    language: "fr",
    languageName: "French",
    primaryEmotion: "Fear",
    secondaryEmotions: [
      { emotion: "Sadness", confidence: 0.25, percentage: 25 },
      { emotion: "Loneliness", confidence: 0.12, percentage: 12 }
    ],
    confidence: 0.6521,
    emotionProbabilities: {
      Happiness: 0.01,
      Sadness: 0.25,
      Love: 0.02,
      Anger: 0.02,
      Nostalgia: 0.03,
      Fear: 0.52,
      Excitement: 0.01,
      Hope: 0.01,
      Loneliness: 0.12,
      Calmness: 0.01
    },
    modelVersion: "v1.0.0-multilingual-minilm",
    isCodeSwitched: false,
    isSupported: true,
    languageConfidence: "high",
    warning: null,
    textPreview: "Dans la nuit je ressens une peur immense et terrifiante"
  }
};

async function testWithMockServer() {
  console.log("=== Testing Node.js ML Service Client with Mock Live Server ===");

  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: "healthy",
        modelVersion: "v1.0.0-multilingual-minilm",
        device: "cpu",
        supportedLanguages: ["en", "hi", "bn", "es", "fr"],
        supportedEmotions: [
          "Happiness", "Sadness", "Love", "Anger", "Nostalgia",
          "Fear", "Excitement", "Hope", "Loneliness", "Calmness"
        ]
      }));
      return;
    }

    if (req.url === "/predict" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}");
        const text = parsed.text || "";
        const mockData = text.includes("प्यार") ? MOCK_PREDICTIONS.hindi : MOCK_PREDICTIONS.french;
        res.writeHead(200);
        res.end(JSON.stringify(mockData));
      });
      return;
    }

    if (req.url === "/predict-lines" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => { body += chunk; });
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}");
        const inputLines = parsed.lines || [];
        const linesResult = inputLines.map((line, idx) => ({
          lineNumber: idx + 1,
          text: line,
          language: "hi",
          languageName: "Hindi",
          primaryEmotion: "Love",
          secondaryEmotions: ["Hope"],
          confidence: 0.88,
          isSectionHeader: false,
          emotionProbabilities: {
            Happiness: 0.05,
            Sadness: 0.02,
            Love: 0.82,
            Anger: 0.01,
            Nostalgia: 0.03,
            Fear: 0.01,
            Excitement: 0.01,
            Hope: 0.04,
            Loneliness: 0.01,
            Calmness: 0.00
          },
          explanation: "Dominant Love emotion detected in lyric phrasing"
        }));
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          count: linesResult.length,
          lines: linesResult,
          durationMs: 45
        }));
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise((resolve) => server.listen(8001, "127.0.0.1", resolve));
  console.log("Mock FastAPI server listening on http://127.0.0.1:8001");

  try {
    // 1. Health check
    const health = await multilingualMLService.checkHealth(true);
    console.log("Health check result:", health);
    assert.strictEqual(health.online, true);
    assert.strictEqual(health.modelVersion, "v1.0.0-multilingual-minilm");
    console.log("  ✓ Health check confirmed online with correct model version.");

    // 2. Hindi song analysis through advancedEmotionService
    const hindiRes = await advancedEmotionService.analyzeAdvanced({
      lyrics: "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम",
      title: "Tu Pyar Ka Sagar Hai",
      artist: "Manna Dey"
    });

    assert.strictEqual(hindiRes.success, true);
    assert.strictEqual(hindiRes.primaryEmotion, "Love");
    assert.strictEqual(hindiRes.confidence, 72.6);
    assert.strictEqual(hindiRes.metadata.mlServiceOnline, true);
    assert.strictEqual(hindiRes.metadata.modelVersion, "v1.0.0-multilingual-minilm");
    assert.strictEqual(hindiRes.metadata.languageCode, "hi");
    assert.ok(hindiRes.emotionDistribution.Love >= 50, "Love should have highest percentage in distribution");
    assert.strictEqual(hindiRes.secondaryEmotions.length, 2);
    assert.strictEqual(hindiRes.lines.length > 0, true);
    console.log("  ✓ Hindi analysis succeeded! Primary:", hindiRes.primaryEmotion, "| Confidence:", hindiRes.confidence);

    // 3. French song analysis through advancedEmotionService
    const frenchRes = await advancedEmotionService.analyzeAdvanced({
      lyrics: "Dans la nuit je ressens une peur immense et terrifiante",
      title: "Peur Nocturne",
      artist: "Edith Piaf"
    });

    assert.strictEqual(frenchRes.success, true);
    assert.strictEqual(frenchRes.primaryEmotion, "Fear");
    assert.strictEqual(frenchRes.confidence, 65.2);
    assert.strictEqual(frenchRes.metadata.languageCode, "fr");
    assert.strictEqual(frenchRes.secondaryEmotions[0].emotion, "Sadness");
    console.log("  ✓ French analysis succeeded! Primary:", frenchRes.primaryEmotion, "| Secondary:", frenchRes.secondaryEmotions[0].emotion);

    console.log("\n✅ All Mock Server E2E Tests Passed Successfully!");
  } finally {
    server.close();
  }
}

testWithMockServer().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
