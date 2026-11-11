/**
 * Vercel Serverless Express Entrypoint
 * Exports the configured Express application without starting an HTTP listener.
 */
const app = require("./app");

module.exports = app;

