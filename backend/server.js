import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcryptjs";

import { db } from "./database/database.js";

dotenv.config();

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

// ------------------------------
// MIDDLEWARE
// ------------------------------

app.use(express.json());

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// ------------------------------
// SQLITE SESSION STORE
// ------------------------------

class SQLiteSessionStore extends session.Store {
  constructor(database) {
    super();

    this.db = database;

    this.getStatement = database.prepare(`
      SELECT sess, expired_at
      FROM sessions
      WHERE sid = ?
    `);

    this.setStatement = database.prepare(`
      INSERT INTO sessions (sid, sess, expired_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sid)
      DO UPDATE SET
        sess = excluded.sess,
        expired_at = excluded.expired_at
    `);

    this.destroyStatement = database.prepare(`
      DELETE FROM sessions WHERE sid = ?
    `);

    this.touchStatement = database.prepare(`
      UPDATE sessions
      SET expired_at = ?
      WHERE sid = ?
    `);

    this.cleanupStatement = database.prepare(`
      DELETE FROM sessions WHERE expired_at <= ?
    `);
  }

  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid);

      if (!row || row.expired_at <= Date.now()) {
        this.destroyStatement.run(sid);
        return callback(null, null);
      }

      callback(null, JSON.parse(row.sess));
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sess, callback = () => { }) {
    try {
      const expires = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 86400000;

      this.setStatement.run(
        sid,
        JSON.stringify(sess),
        expires
      );

      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => { }) {
    try {
      this.destroyStatement.run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sess, callback = () => { }) {
    try {
      const expires = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 86400000;

      this.touchStatement.run(expires, sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  cleanup() {
    this.cleanupStatement.run(Date.now());
  }
}

const sessionStore = new SQLiteSessionStore(db);

// ------------------------------
// SESSION CONFIGURATION
// ------------------------------

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from .env");
}

app.use(
  session({
    name: "visionqc.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Clean up expired sessions periodically without blocking requests.
const cleanupInterval = setInterval(() => {
  try {
    sessionStore.cleanup();
  } catch (error) {
    console.error("Session cleanup error:", error);
  }
}, 60 * 60 * 1000);

cleanupInterval.unref();

// ------------------------------
// AUTHENTICATION MIDDLEWARE
// ------------------------------

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  next();
}

// ------------------------------
// HEALTH CHECK
// ------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "VisionQC backend is running",
  });
});

// ------------------------------
// REGISTER
// ------------------------------

app.post("/api/auth/register", (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (
      typeof username !== "string" || typeof email !== "string" ||
      typeof password !== "string" || !username.trim() || !email.trim() || !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Username must contain 3–30 characters",
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username contains invalid characters",
      });
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters",
      });
    }

    const existingUsername = db.prepare("SELECT id FROM users WHERE username = ?").get(cleanUsername);
    const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail);

    if (existingUsername || existingEmail) {
      return res.status(409).json({
        success: false,
        message: existingUsername ? "Username is already in use" : "Email is already registered",
      });
    }

    const passwordHash = bcrypt.hashSync(password, 12);

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `).run(cleanUsername, cleanEmail, passwordHash);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: result.lastInsertRowid,
        username: cleanUsername,
        email: cleanEmail,
      },
    });

  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
});

// ------------------------------
// LOGIN
// ------------------------------

app.post("/api/auth/login", (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const user = db.prepare(`
      SELECT id, username, email, password_hash
      FROM users
      WHERE username = ?
    `).get(username.trim());

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    // Regenerate session to prevent session fixation.
    req.session.regenerate((error) => {
      if (error) return next(error);

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
      };

      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        res.json({
          success: true,
          message: "Login successful",
          user: req.session.user,
        });
      });
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// ------------------------------
// CURRENT USER
// ------------------------------

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session.user,
  });
});

// ------------------------------
// LOGOUT
// ------------------------------

app.post("/api/auth/logout", (req, res, next) => {
  if (!req.session) {
    return res.json({
      success: true,
      message: "Logged out",
    });
  }

  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("visionqc.sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

// ------------------------------
// EXAMPLE PROTECTED API
// ------------------------------

app.get("/api/protected", requireAuth, (req, res) => {
  res.json({
    success: true,
    message: "You are authenticated",
    user: req.session.user,
  });
});

// ------------------------------
// ERROR HANDLER
// ------------------------------

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ------------------------------
// START SERVER
// ------------------------------

app.listen(PORT, () => {
  console.log("==================================");
  console.log("VisionQC Backend Started");
  console.log(`http://localhost:${PORT}`);
  console.log("==================================");
});
