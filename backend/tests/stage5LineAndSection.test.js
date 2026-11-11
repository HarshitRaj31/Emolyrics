/**
 * Stage 5 Automated Integration Test:
 * Line-by-Line Emotion Analysis, Section Detection, and Emotional Journey Progression.
 */

const assert = require("assert");
const { songSectionService } = require("../services/songSectionService");
const { advancedEmotionService } = require("../services/advancedEmotionService");

async function runStage5Tests() {
  console.log("=== Running Stage 5 Line, Section & Journey Integration Tests ===");

  // Test 1: Section Detection with Explicit Headers
  console.log("\n[Test 1] Section Detection with Explicit Headers...");
  const sampleLinesWithHeaders = [
    {
      lineNumber: 1,
      text: "[Verse 1]",
      isSectionHeader: true,
      primaryEmotion: "Structure",
      confidence: 1.0,
      emotionProbabilities: {}
    },
    {
      lineNumber: 2,
      text: "Tears falling in the cold gray rain",
      isSectionHeader: false,
      primaryEmotion: "Sadness",
      confidence: 0.85,
      emotionProbabilities: { Sadness: 0.85, Loneliness: 0.10, Happiness: 0.01 }
    },
    {
      lineNumber: 3,
      text: "Grief and heartache surround my soul",
      isSectionHeader: false,
      primaryEmotion: "Sadness",
      confidence: 0.88,
      emotionProbabilities: { Sadness: 0.88, Loneliness: 0.08, Happiness: 0.01 }
    },
    {
      lineNumber: 4,
      text: "[Chorus]",
      isSectionHeader: true,
      primaryEmotion: "Structure",
      confidence: 1.0,
      emotionProbabilities: {}
    },
    {
      lineNumber: 5,
      text: "Sunshine breaking through the golden sky",
      isSectionHeader: false,
      primaryEmotion: "Happiness",
      confidence: 0.92,
      emotionProbabilities: { Happiness: 0.92, Hope: 0.05, Sadness: 0.01 }
    },
    {
      lineNumber: 6,
      text: "Dancing with joy and singing loud",
      isSectionHeader: false,
      primaryEmotion: "Happiness",
      confidence: 0.90,
      emotionProbabilities: { Happiness: 0.90, Hope: 0.06, Sadness: 0.01 }
    }
  ];

  const analysis1 = songSectionService.analyzeSectionsAndJourney(sampleLinesWithHeaders, "", "Sadness");
  assert.strictEqual(analysis1.sections.length, 2, "Should create exactly 2 sections");
  assert.strictEqual(analysis1.sections[0].title, "Verse 1");
  assert.strictEqual(analysis1.sections[0].dominantEmotion, "Sadness");
  assert.strictEqual(analysis1.sections[1].title, "Chorus");
  assert.strictEqual(analysis1.sections[1].dominantEmotion, "Happiness");
  console.log("  ✓ Section 1:", analysis1.sections[0].title, "->", analysis1.sections[0].dominantEmotion);
  console.log("  ✓ Section 2:", analysis1.sections[1].title, "->", analysis1.sections[1].dominantEmotion);

  // Test 2: Emotional Transitions & Trajectory
  console.log("\n[Test 2] Emotional Transitions and Trajectory...");
  assert.strictEqual(analysis1.transitions.length, 1, "Should have 1 transition from Sadness to Happiness");
  const tr = analysis1.transitions[0];
  assert.strictEqual(tr.fromEmotion, "Sadness");
  assert.strictEqual(tr.toEmotion, "Happiness");
  assert.strictEqual(analysis1.beginningToEnding.isEvolution, true);
  assert.strictEqual(analysis1.beginningToEnding.openingEmotion, "Sadness");
  assert.strictEqual(analysis1.beginningToEnding.closingEmotion, "Happiness");
  console.log("  ✓ Transition:", tr.fromSection, "(Sadness) ->", tr.toSection, "(Happiness)");
  console.log("  ✓ Trajectory:", analysis1.beginningToEnding.summary);

  // Test 3: Refrain / Chorus Heuristic when headers are absent
  console.log("\n[Test 3] Refrain / Chorus Heuristic without Headers...");
  const rawStanzas = `I walk alone down the empty highway
Cold wind blows against my face

We will rise above the storm
Together we can find our home

Looking at the stars so bright
Dreaming of tomorrow's light

We will rise above the storm
Together we can find our home`;

  const linesFromStanzas = [
    { lineNumber: 1, text: "I walk alone down the empty highway", primaryEmotion: "Loneliness", confidence: 0.8 },
    { lineNumber: 2, text: "Cold wind blows against my face", primaryEmotion: "Sadness", confidence: 0.75 },
    { lineNumber: 3, text: "We will rise above the storm", primaryEmotion: "Hope", confidence: 0.88 },
    { lineNumber: 4, text: "Together we can find our home", primaryEmotion: "Hope", confidence: 0.85 },
    { lineNumber: 5, text: "Looking at the stars so bright", primaryEmotion: "Calmness", confidence: 0.72 },
    { lineNumber: 6, text: "Dreaming of tomorrow's light", primaryEmotion: "Hope", confidence: 0.79 },
    { lineNumber: 7, text: "We will rise above the storm", primaryEmotion: "Hope", confidence: 0.88 },
    { lineNumber: 8, text: "Together we can find our home", primaryEmotion: "Hope", confidence: 0.85 }
  ];

  const analysis2 = songSectionService.analyzeSectionsAndJourney(linesFromStanzas, rawStanzas, "Hope");
  assert.strictEqual(analysis2.sections.length, 4, "Should detect 4 stanzas");
  const chorusSections = analysis2.sections.filter(s => s.type === "chorus");
  assert.strictEqual(chorusSections.length, 2, "Should identify both repeated stanzas as Chorus");
  console.log("  ✓ Heuristic sections detected:", analysis2.sections.map(s => s.title).join(", "));

  // Test 4: End-to-End Advanced Emotion Service with Lines, Sections, and Journey
  console.log("\n[Test 4] Full AdvancedEmotionService with Lines and Sections...");
  const fullAnalysis = await advancedEmotionService.analyzeAdvanced({
    lyrics: `[Verse 1]\nSunshine warms the morning ground\nLaughing voices all around\n\n[Chorus]\nCelebrating life today\nAll our worries fade away`,
    title: "Morning Sun",
    artist: "Joy Band"
  });

  assert.strictEqual(fullAnalysis.success, true);
  assert.ok(fullAnalysis.lines.length >= 4, "Must have lines");
  assert.ok(fullAnalysis.sections.length >= 2, "Must have sections");
  assert.ok(fullAnalysis.emotionalJourney, "Must have emotionalJourney object");
  assert.ok(fullAnalysis.emotionalJourney.dominantProgression.length >= 2);
  assert.strictEqual(fullAnalysis.sections[0].title, "Verse 1");
  assert.strictEqual(fullAnalysis.sections[1].title, "Chorus");

  // Verify line schema
  const lyricLine = fullAnalysis.lines.find(l => !l.isSectionHeader);
  assert.ok(lyricLine.lineNumber > 0, "Line number required");
  assert.ok(lyricLine.text, "Line text required");
  assert.ok(lyricLine.primaryEmotion, "Primary emotion required");
  assert.ok(Array.isArray(lyricLine.secondaryEmotions), "Secondary emotions array required");
  assert.ok(lyricLine.confidence > 0, "Confidence required");
  assert.ok(lyricLine.explanation, "Explanation required");
  console.log("  ✓ Line schema verified:", {
    lineNumber: lyricLine.lineNumber,
    text: lyricLine.text,
    emotion: lyricLine.primaryEmotion,
    confidence: lyricLine.confidence,
    explanation: lyricLine.explanation.slice(0, 45) + "..."
  });

  console.log("\n=== All Stage 5 Backend Tests Passed Successfully! ===");
}

runStage5Tests().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});

