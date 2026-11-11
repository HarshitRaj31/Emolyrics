/**
 * End-to-End Live Integration Test: Node.js Backend with Live Python ML Service
 * Tests:
 *  1. ML health check endpoint
 *  2. English lyrics analysis with live neural model
 *  3. Hindi lyrics analysis with live neural model
 *  4. Bengali lyrics analysis with live neural model
 *  5. Spanish lyrics analysis with live neural model
 *  6. French lyrics analysis with live neural model
 *  7. Code-switched Hinglish lyrics analysis
 *  8. Verification of real probability distributions, metadata, and phase compatibility
 */

const assert = require("assert");
const { multilingualMLService } = require("../services/multilingualMLService");
const { advancedEmotionService } = require("../services/advancedEmotionService");

const TEST_CASES = [
  {
    lang: "en",
    title: "Walking on Sunshine",
    artist: "Katrina and the Waves",
    lyrics: "I'm walking on sunshine, whoa! And don't it feel good! Hey, alright now, and don't it feel good!",
    expectedLang: "en"
  },
  {
    lang: "hi",
    title: "Tu Pyar Ka Sagar Hai",
    artist: "Manna Dey",
    lyrics: "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम, घायल मन का पागल पंछी उड़ने को बेताब",
    expectedLang: "hi"
  },
  {
    lang: "hi_hinglish",
    title: "Chura Liya Hai Tumne",
    artist: "Asha Bhosle / RD Burman",
    lyrics: "Chura liya hai tumne jo dil ko, nazar nahi churana sanam, badal ke meri tum zindagani",
    expectedLang: "hi",
    expectCodeSwitched: true
  },
  {
    lang: "bn",
    title: "Amar Shonar Bangla",
    artist: "Rabindranath Tagore",
    lyrics: "আমার সোনার বাংলা, আমি তোমায় ভালোবাসি। চিরদিন তোমার আকাশ, তোমার বাতাস, আমার প্রাণে বাজায় বাঁশি।",
    expectedLang: "bn"
  },
  {
    lang: "es",
    title: "Bésame Mucho",
    artist: "Consuelo Velázquez",
    lyrics: "Bésame, bésame mucho, como si fuera esta noche la última vez, porque tengo miedo a perderte",
    expectedLang: "es"
  },
  {
    lang: "fr",
    title: "La Vie En Rose",
    artist: "Édith Piaf",
    lyrics: "Quand il me prend dans ses bras, il me parle tout bas, je vois la vie en rose, il me dit des mots d'amour",
    expectedLang: "fr"
  }
];

async function runE2ETests() {
  console.log("=== Running Live E2E Multilingual Model Integration Tests ===");

  // 1. Health Check
  console.log("\n[1] Verifying Python ML Microservice Health Check...");
  const health = await multilingualMLService.checkHealth(true);
  console.log("  Health Status:", health.status, "| Version:", health.modelVersion, "| Device:", health.device);
  assert.strictEqual(health.online, true, "Python ML service must be healthy");
  assert.strictEqual(health.supportedLanguages.length, 5, "Must support 5 languages");

  // 2. Test 5 languages + Hinglish through advancedEmotionService
  for (const tc of TEST_CASES) {
    console.log(`\n[2] Testing [${tc.lang.toUpperCase()}] "${tc.title}" by ${tc.artist}...`);
    const result = await advancedEmotionService.analyzeAdvanced({
      lyrics: tc.lyrics,
      title: tc.title,
      artist: tc.artist
    });

    assert.strictEqual(result.success, true, "Analysis must succeed");
    assert.strictEqual(result.metadata.mlServiceOnline, true, "ML service should be online");
    assert.strictEqual(result.metadata.modelVersion, "v1.0.0-multilingual-minilm", "Model version must match");
    assert.strictEqual(result.metadata.languageCode, tc.expectedLang, `Language code must be ${tc.expectedLang}`);
    assert.ok(result.primaryEmotion, `Primary emotion must be detected (got: ${result.primaryEmotion})`);
    assert.ok(result.confidence > 0, `Confidence must be positive (got: ${result.confidence}%)`);
    assert.ok(result.emotionDistribution, "Must return emotionDistribution");

    // Verify 10 emotions in distribution
    const distKeys = Object.keys(result.emotionDistribution);
    assert.strictEqual(distKeys.length, 10, "Distribution must contain all 10 canonical emotions");

    // Verify lines analysis and Ollama fallback
    assert.ok(result.lines.length > 0, "Lines must be analyzed");
    assert.ok(result.aiInterpretation, "AI interpretation must be generated");

    if (tc.expectCodeSwitched) {
      assert.strictEqual(result.metadata.isCodeSwitched, true, "Hinglish should be flagged as code-switched");
    }

    console.log(`  ✓ Primary Emotion: ${result.primaryEmotion} (${result.confidence}%)`);
    console.log(`  ✓ Language: ${result.metadata.language} (Code: ${result.metadata.languageCode})`);
    console.log(`  ✓ Secondary: ${result.secondaryEmotions.map(s => `${s.emotion} (${s.percentage}%)`).join(", ") || "None"}`);
    console.log(`  ✓ Inference time: ${result.metadata.durationMs}ms`);
  }

  console.log("\n============================================================");
  console.log("✅ All Live End-to-End Multilingual Tests Passed Successfully!");
  console.log("============================================================");
}

runE2ETests().catch(err => {
  console.error("❌ Live E2E test failed:", err);
  process.exit(1);
});

