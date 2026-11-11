/**
 * Vercel Serverless Function Handler (/api/index)
 * Ensures both Express zero-config and `vercel.json` Other-framework rewrites invoke the same Express app.
 */
const app = require("../app");

module.exports = app;

