/**
 * EmoLyrics Backend Test Runner
 * Executes unit and integration test suites in sequence.
 */

const { spawn } = require("child_process");
const path = require("path");

const TEST_FILES = [
  "stage5LineAndSection.test.js",
  "stage9ApiAndPdf.test.js",
  "stage10VercelServerless.test.js"
];

async function runTest(file) {
  const filePath = path.join(__dirname, file);
  return new Promise((resolve, reject) => {
    console.log(`\n======================================================`);
    console.log(`RUNNING: ${file}`);
    console.log(`======================================================`);
    const proc = spawn(process.execPath, [filePath], { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test file "${file}" exited with code ${code}`));
      }
    });
  });
}

async function run() {
  console.log("Starting EmoLyrics Backend Test Suite...");
  for (const testFile of TEST_FILES) {
    try {
      await runTest(testFile);
    } catch (err) {
      console.error(`\n❌ [TEST FAILURE] ${err.message}`);
      process.exit(1);
    }
  }
  console.log("\n======================================================");
  console.log("✅ ALL BACKEND UNIT & INTEGRATION TESTS PASSED!");
  console.log("======================================================\n");
}

run();

