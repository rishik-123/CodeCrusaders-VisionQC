import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './database/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'VisionQC Backend Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Database connection test endpoint
app.get('/api/db-test', (req, res) => {
  try {
    // 1. Get SQLite version
    const versionRow = db.prepare('SELECT sqlite_version() AS version').get();
    
    // 2. Simple math query test
    const testQueryRow = db.prepare('SELECT 1 + 1 AS testQuery').get();

    res.json({
      success: true,
      message: 'SQLite connection successful',
      sqliteVersion: versionRow.version,
      testQuery: testQueryRow.testQuery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SQLite connection failed',
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 [Server] Express server listening on http://localhost:${PORT}`);
  console.log(`📡 [Server] Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 [Server] DB Test:      http://localhost:${PORT}/api/db-test`);
});
