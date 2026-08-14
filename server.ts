// Vercel detects this root server entrypoint and runs the existing Express app
// as a Node.js serverless function. Self-hosted Docker continues using
// server/_core/index.ts through the package scripts.
import "./server/_core/index.ts";
