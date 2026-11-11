/**
 * Integration Test for Backend Multilingual ML Service and Strict Fallback Policies
 */

const assert = require("assert");
const { multilingualMLService } = require("../services/multilingualMLService");
const { advancedEmotionService } = require("../services/advancedEmotionService");

async function runTests() {
  console.log("=== Running Backend Multilingual Integration & Fallback Tests ===");

  // Test 1: Service offline check
  console.log("\n[Test 1] Health check when ML service port is not running...");
  // Temporarily point to inactive port to test offline behavior
  const originalUrl = process.env.ML_SERVICE_URL;
  process.env.ML_SERVICE_URL = "http://127.0.0.1:59999";

  const health = await multilingualMLService.checkHealth(true);
  assert.strictEqual(health.online, false, "Health check should report offline");
  console.log("  ✓ Reported offline correctly:", health.status);

  // Test 2: English lyrics permit fallback when offline
  console.log("\n[Test 2] English lyrics behavior when ML service is offline...");
  const enResult = await multilingualMLService.predictEmotion({
    lyrics: "I am walking on sunshine and feeling good and full of happiness"
  });
  assert.strictEqual(enResult.success, false, "Success should be false when ML service offline");
  assert.strictEqual(enResult.fallbackPermitted, true, "Fallback should be permitted for English text");
  console.log("  ✓ English fallback permitted flag verified.");

  // Test 3: Non-English lyrics STRICTLY reject fallback when ML service is offline
  console.log("\n[Test 3] Non-English lyrics strict rejection when ML service is offline...");
  const nonEnglishSamples = [
    { lang: "hi", text: "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम" },
    { lang: "bn", text: "আমার সোনার বাংলা আমি তোমায় ভালোবাসি" },
    { lang: "es", text: "Mi corazón siente una profunda tristeza y dolor" },
    { lang: "fr", text: "Dans la nuit je ressens une grande mélancolie" },
    { lang: "hi (hinglish)", text: "mera dil tere pyaar me deewana ho gaya hai sanam" }
  ];

  for (const sample of nonEnglishSamples) {
    let errorThrown = false;
    let thrownError = null;
    try {
      await multilingualMLService.predictEmotion({ lyrics: sample.text });
    } catch (err) {
      errorThrown = true;
      thrownError = err;
    }
    assert.strictEqual(errorThrown, true, `Should throw error for ${sample.lang} when ML service offline`);
    assert.strictEqual(thrownError.statusCode, 503, "Status code should be 503");
    assert.strictEqual(thrownError.code, "ERR_MULTILINGUAL_SERVICE_OFFLINE", "Error code should match");
    console.log(`  ✓ Strict block verified for ${sample.lang}: "${thrownError.message.slice(0, 70)}..."`);
  }

  // Test 4: advancedEmotionService.analyzeAdvanced handles English fallback gracefully
  console.log("\n[Test 4] AdvancedEmotionService with English fallback...");
  const advEn = await advancedEmotionService.analyzeAdvanced({
    lyrics: "Happy bright morning, smiling and dancing in the sunshine with joy",
    title: "Joyful Morning",
    artist: "Test Artist"
  });
  assert.strictEqual(advEn.success, true);
  assert.strictEqual(advEn.metadata.mlServiceOnline, false, "Should indicate ML service offline");
  assert.strictEqual(advEn.primaryEmotion, "Happiness");
  console.log("  ✓ English analysis succeeded with fallback. Mood:", advEn.primaryEmotion);

  // Test 5: advancedEmotionService.analyzeAdvanced blocks non-English lyrics when ML service is offline
  console.log("\n[Test 5] AdvancedEmotionService blocks non-English lyrics when ML service is offline...");
  let advBlocked = false;
  try {
    await advancedEmotionService.analyzeAdvanced({
      lyrics: "तू प्यार का सागर है तेरी एक बूंद के प्यासे हम",
      title: "Hindi Song",
      artist: "Test Artist"
    });
  } catch (err) {
    advBlocked = true;
    assert.strictEqual(err.statusCode, 503);
  }
  assert.strictEqual(advBlocked, true, "Should block Hindi analysis when ML service is offline");
  console.log("  ✓ Strict block confirmed in advancedEmotionService orchestrator.");

  // Restore env
  process.env.ML_SERVICE_URL = originalUrl || "http://127.0.0.1:8001";
  console.log("\n=== All 5 Backend Integration Tests Passed Successfully! ===");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});

