// Vercel serverless function entry point
// This exports the Express app for Vercel's serverless functions
// Note: Socket.io requires persistent connections and won't work on Vercel serverless
// For WebSocket support, deploy Socket.io server separately (Railway/Render recommended)

export { default } from '../src/index.js'
