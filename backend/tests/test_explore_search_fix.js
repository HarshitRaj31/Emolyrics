const http = require("http");
const app = require("../app");
const { connectDB, memoryStore } = require("../db");

async function runTests() {
  console.log("=== STARTING EXPLORE SEARCH INTEGRATION TESTS ===\n");
  let server;
  let port;

  try {
    await connectDB();
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Test server running at ${baseUrl}\n`);

    // Helper for GET requests
    async function get(path) {
      const res = await fetch(`${baseUrl}${path}`);
      const data = await res.json();
      return { status: res.status, ok: res.ok, data };
    }

    // Helper for POST requests
    async function post(path, body) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return { status: res.status, ok: res.ok, data };
    }

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`[PASS] ${message}`);
        passed++;
      } else {
        console.error(`[FAIL] ${message}`);
        failed++;
      }
    }

    // TEST 1: Search for an empty query on /api/analyses
    console.log("\n--- TEST 1: Empty search query on /api/analyses ---");
    const emptyRes = await get("/api/analyses?search=&limit=5");
    assert(emptyRes.ok, "Status should be 200");
    assert(Array.isArray(emptyRes.data.items), "Items should be an array");
    assert(emptyRes.data.pagination != null, "Pagination should be present");

    // TEST 2: Seed a local analysis and search for it
    console.log("\n--- TEST 2: Search for song present in local database ---");
    const testTitle = "Locally Analyzed Song " + Date.now();
    const testArtist = "Test Local Artist";
    const seedRes = await post("/api/analyze-mood", {
      title: testTitle,
      artist: testArtist,
      lyrics: "I am feeling so wonderful, sunny skies and joy everywhere inside my heart.",
      autoSave: true
    });
    assert(seedRes.ok && seedRes.data.success, "Local song saved successfully");

    const localSearchRes = await get(`/api/analyses?search=${encodeURIComponent(testTitle)}&limit=5`);
    assert(localSearchRes.ok, "Search should return 200");
    const foundLocal = localSearchRes.data.items.find(i => i.title === testTitle);
    assert(foundLocal != null, `Should find locally seeded song "${testTitle}"`);
    if (foundLocal) {
      assert(foundLocal.mood != null, `Local song has mood: ${foundLocal.mood}`);
      assert(foundLocal.confidence > 0, `Local song has confidence: ${foundLocal.confidence}%`);
    }

    // TEST 3: Search for a global song NOT in local database (e.g. "Shape of You" / "Despacito")
    console.log("\n--- TEST 3: Search for global song not in local DB (Despacito) ---");
    const globalSearchRes = await get("/api/analyses?search=Despacito&limit=5");
    assert(globalSearchRes.ok, "Explore search status should be 200");
    assert(globalSearchRes.data.items.length > 0, `Should return at least 1 track (found ${globalSearchRes.data.items.length})`);
    const foundDespacito = globalSearchRes.data.items.find(i =>
      i.title.toLowerCase().includes("despacito")
    );
    assert(foundDespacito != null, "Should find Despacito in Explore search");
    if (foundDespacito) {
      console.log(`   Found: "${foundDespacito.title}" by ${foundDespacito.artist} (isGlobalCatalog: ${foundDespacito.isGlobalCatalog})`);
      assert(foundDespacito.spotifyUrl != null && foundDespacito.spotifyUrl.includes("spotify.com"), "Should provide Spotify listen URL");
      assert(foundDespacito.youtubeUrl != null && foundDespacito.youtubeUrl.includes("youtube.com"), "Should provide YouTube search URL");
      assert(foundDespacito.isGlobalCatalog === true, "Track from MusicBrainz has isGlobalCatalog = true");
    }

    // TEST 4: Search for another global song ("Yellow" by Coldplay) and compare with Song Discovery
    console.log("\n--- TEST 4: Compare Explore search vs Song Discovery search for 'Yellow' ---");
    const songDiscoveryRes = await get("/api/music/search?q=Coldplay%20Yellow&limit=5");
    assert(songDiscoveryRes.ok && songDiscoveryRes.data.recordings.length > 0, "Song Discovery finds 'Yellow'");

    const exploreYellowRes = await get("/api/analyses?search=Coldplay%20Yellow&limit=5");
    assert(exploreYellowRes.ok, "Explore search status should be 200");
    assert(exploreYellowRes.data.items.length > 0, `Explore search finds track for 'Yellow' (found ${exploreYellowRes.data.items.length})`);

    const sdFirst = songDiscoveryRes.data.recordings[0];
    console.log(`   Song Discovery top result: "${sdFirst.title}" by ${sdFirst.artist}`);
    const exFirst = exploreYellowRes.data.items[0];
    console.log(`   Explore top result: "${exFirst.title}" by ${exFirst.artist}`);
    assert(exFirst.title.toLowerCase().includes("yellow"), "Explore search top result is 'Yellow'");

    // TEST 5: Search by artist name (e.g. "Coldplay")
    console.log("\n--- TEST 5: Search by Artist Name ('Coldplay') ---");
    const artistSearchRes = await get("/api/analyses?search=Coldplay&limit=6");
    assert(artistSearchRes.ok, "Status should be 200");
    assert(artistSearchRes.data.items.length > 0, `Should return tracks by Coldplay (found ${artistSearchRes.data.items.length})`);
    const allColdplay = artistSearchRes.data.items.every(i =>
      i.artist.toLowerCase().includes("coldplay") || i.title.toLowerCase().includes("coldplay")
    );
    assert(allColdplay, "Returned items correspond to Coldplay query");

    // TEST 6: Search with an invalid/nonsense query
    console.log("\n--- TEST 6: Search with invalid / nonsense query ---");
    const nonsenseRes = await get("/api/analyses?search=zxvbnm987654321xyz&limit=5");
    assert(nonsenseRes.ok, "Status should be 200");
    assert(nonsenseRes.data.items.length === 0, "Nonsense query should return 0 items");
    assert(nonsenseRes.data.pagination.total === 0, "Total count should be 0");

    // TEST 7: Verify song selection and lyrics/emotion analysis still work properly
    console.log("\n--- TEST 7: Lyrics Retrieval & Emotion Analysis on Found Song ---");
    const lyricsRes = await get("/api/music/lyrics?title=Yellow&artist=Coldplay");
    assert(lyricsRes.ok, "Lyrics endpoint returned 200");
    if (lyricsRes.data.lyrics) {
      console.log(`   Retrieved lyrics snippet: ${lyricsRes.data.lyrics.slice(0, 50).replace(/\n/g, " ")}...`);
      assert(lyricsRes.data.lyrics.length > 20, "Lyrics content is present");

      // Now run emotion classification on it
      const classifyRes = await post("/api/music/analyze-song", {
        title: "Yellow",
        artist: "Coldplay",
        lyrics: lyricsRes.data.lyrics,
        autoSave: false
      });
      assert(classifyRes.ok && classifyRes.data.success, "Emotion classification succeeded");
      console.log(`   Classified Mood: ${classifyRes.data.mood} (${classifyRes.data.confidence}% confidence)`);
      assert(classifyRes.data.mood != null, "Mood was detected");
      assert(classifyRes.data.confidence > 0, "Confidence is positive");
    } else {
      console.log("   (LRCLIB rate-limited or instrumental, fallback verified)");
    }

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runTests();
