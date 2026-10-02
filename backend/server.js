import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import bcrypt from "bcryptjs";
import multer from "multer";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { generateInspectorResponse, getOllamaStatus, OllamaError, ollamaConfig } from "./services/ollamaService.js";
import { getVisionQCContext } from "./services/visionqcContext.js";

import { db } from "./database/database.js";

dotenv.config();

const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";
const PYTHON_SERVICE_URL = (process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const REFERENCE_DATABASE_PATH = path.join(BACKEND_DIR, "database", "reference_images.db");

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
// PRODUCTS
// ------------------------------

const PRODUCT_TYPES = new Set([
  "bottle", "cable", "capsule", "carpet", "grid", "hazelnut", "leather",
  "metal_nut", "MVtecAD", "pill", "screw", "tile", "toothbrush",
  "transistor", "wood", "zipper",
]);
const DIMENSION_UNITS = new Set(["mm", "cm", "inches"]);
const PRODUCT_COLUMNS = `id, product_name, product_type, product_id, manufacturer,
  description, material, length, width, height, dimension_unit, product_color,
  user_id, created_at, updated_at`;

function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Product information is required" };
  }
  const product = {
    product_name: typeof body.product_name === "string" ? body.product_name.trim() : "",
    product_type: body.product_type,
    product_id: typeof body.product_id === "string" ? body.product_id.trim() : "",
    manufacturer: typeof body.manufacturer === "string" ? body.manufacturer.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    material: typeof body.material === "string" ? body.material.trim() : "",
    product_color: typeof body.product_color === "string" ? body.product_color.trim() : "",
    dimension_unit: body.dimension_unit ?? "mm",
  };

  if (!product.product_name || !product.product_id || !product.product_type) {
    return { error: "Product name, type, and ID are required" };
  }
  if (!PRODUCT_TYPES.has(product.product_type)) {
    return { error: "Select a supported product type" };
  }
  if (!DIMENSION_UNITS.has(product.dimension_unit)) {
    return { error: "Select a valid dimension unit" };
  }

  for (const field of ["length", "width", "height"]) {
    const value = body[field];
    if (value === "" || value === null || value === undefined) {
      product[field] = null;
    } else {
      const number = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(number) || number <= 0) {
        return { error: `Enter a valid ${field}` };
      }
      product[field] = number;
    }
  }

  return { product };
}

function isProductIdConflict(error) {
  return error?.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    (error?.code === "SQLITE_CONSTRAINT_PRIMARYKEY" && error.message?.includes("products"));
}

app.post("/api/products", requireAuth, (req, res) => {
  const { product, error } = validateProduct(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const result = db.prepare(`
      INSERT INTO products (
        product_name, product_type, product_id, manufacturer, description,
        material, length, width, height, dimension_unit, product_color, user_id
      ) VALUES (
        @product_name, @product_type, @product_id, @manufacturer, @description,
        @material, @length, @width, @height, @dimension_unit, @product_color, @user_id
      )
    `).run({ ...product, user_id: req.session.user.id });
    const saved = db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ? AND user_id = ?`)
      .get(result.lastInsertRowid, req.session.user.id);
    return res.status(201).json({ success: true, message: "Product created successfully", product: saved });
  } catch (err) {
    if (isProductIdConflict(err)) {
      return res.status(409).json({ success: false, message: "This Product ID already exists" });
    }
    console.error("Product creation error:", err);
    return res.status(500).json({ success: false, message: "Unable to save product" });
  }
});

app.get("/api/products", requireAuth, (req, res) => {
  try {
    const products = db.prepare(`
      SELECT ${PRODUCT_COLUMNS} FROM products
      WHERE user_id = ? ORDER BY created_at DESC, id DESC
    `).all(req.session.user.id);
    return res.json({ success: true, products });
  } catch (err) {
    console.error("Product listing error:", err);
    return res.status(500).json({ success: false, message: "Unable to load products" });
  }
});

app.get("/api/dashboard", requireAuth, (req, res) => {
  try {
    const userId = req.session.user.id;
    const products = db.prepare(`
      SELECT id, product_name, product_type, product_id, created_at
      FROM products WHERE user_id = ? ORDER BY created_at DESC, id DESC
    `).all(userId);
    const productsById = new Map(products.map((product) => [product.id, product]));
    const productTypes = db.prepare(`
      SELECT product_type AS label, COUNT(*) AS count
      FROM products WHERE user_id = ? GROUP BY product_type ORDER BY count DESC, label ASC
    `).all(userId);

    let sessions = [];
    if (fs.existsSync(REFERENCE_DATABASE_PATH)) {
      const referenceDb = new Database(REFERENCE_DATABASE_PATH, { readonly: true, fileMustExist: true });
      try {
        sessions = referenceDb.prepare(`
          SELECT id, product_id, captured_images, total_images, status, created_at, completed_at
          FROM reference_sessions WHERE user_id = ? ORDER BY created_at DESC
        `).all(userId).map((session) => ({
          ...session,
          product_name: productsById.get(session.product_id)?.product_name || "Unknown product",
        }));
      } finally {
        referenceDb.close();
      }
    }

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((session) => session.status === "COMPLETE").length;
    const imagesCaptured = sessions.reduce((total, session) => total + session.captured_images, 0);
    const dailyCollections = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        collections: sessions.filter((session) => session.created_at.slice(0, 10) === key).length,
        images: sessions.filter((session) => session.created_at.slice(0, 10) === key)
          .reduce((total, session) => total + session.captured_images, 0),
      };
    });

    return res.json({
      success: true,
      summary: {
        productCount: products.length,
        collectionCount: totalSessions,
        completedCount: completedSessions,
        imagesCaptured,
        completionRate: totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0,
      },
      dailyCollections,
      collectionStatuses: ["COMPLETE", "IN_PROGRESS", "CANCELLED"].map((status) => ({
        status,
        count: sessions.filter((session) => session.status === status).length,
      })),
      productTypes,
      recentCollections: sessions.slice(0, 8),
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return res.status(500).json({ success: false, message: "Unable to load dashboard data" });
  }
});

app.get("/api/products/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  try {
    const product = db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ? AND user_id = ?`)
      .get(id, req.session.user.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, product });
  } catch (err) {
    console.error("Product lookup error:", err);
    return res.status(500).json({ success: false, message: "Unable to load product" });
  }
});

app.put("/api/products/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  const { product, error } = validateProduct(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const result = db.prepare(`
      UPDATE products SET
        product_name = @product_name, product_type = @product_type,
        product_id = @product_id, manufacturer = @manufacturer,
        description = @description, material = @material, length = @length,
        width = @width, height = @height, dimension_unit = @dimension_unit,
        product_color = @product_color, updated_at = CURRENT_TIMESTAMP
      WHERE id = @id AND user_id = @user_id
    `).run({ ...product, id, user_id: req.session.user.id });
    if (!result.changes) return res.status(404).json({ success: false, message: "Product not found" });
    const saved = db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ? AND user_id = ?`)
      .get(id, req.session.user.id);
    return res.json({ success: true, message: "Product updated successfully", product: saved });
  } catch (err) {
    if (isProductIdConflict(err)) {
      return res.status(409).json({ success: false, message: "This Product ID already exists" });
    }
    console.error("Product update error:", err);
    return res.status(500).json({ success: false, message: "Unable to update product" });
  }
});

app.delete("/api/products/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  try {
    const result = db.prepare("DELETE FROM products WHERE id = ? AND user_id = ?")
      .run(id, req.session.user.id);
    if (!result.changes) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    console.error("Product deletion error:", err);
    return res.status(500).json({ success: false, message: "Unable to delete product" });
  }
});

// ------------------------------
// REFERENCE IMAGE COLLECTIONS
// ------------------------------

const referenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== "image/jpeg") {
      const error = new Error("Only JPEG images are accepted");
      error.status = 415;
      return callback(error);
    }
    callback(null, true);
  },
});

class PythonServiceError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

async function callPython(path, { method = "GET", body, headers = {} } = {}) {
  if (!process.env.PYTHON_SERVICE_SECRET) {
    throw new PythonServiceError("OpenCV service is not configured", 503);
  }
  const requestHeaders = { "X-Service-Secret": process.env.PYTHON_SERVICE_SECRET, ...headers };
  let requestBody = body;
  if (body && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`${PYTHON_SERVICE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    console.error("OpenCV service request failed:", error.message);
    throw new PythonServiceError("OpenCV image service is unavailable", 502);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const status = [400, 404, 409, 413, 415].includes(response.status) ? response.status : 502;
    throw new PythonServiceError(payload.detail || "OpenCV image service request failed", status);
  }
  return response;
}

async function getOwnedProduct(productId, userId) {
  return db.prepare(`SELECT id, product_name, product_type, product_id, manufacturer
    FROM products WHERE id = ? AND user_id = ?`).get(productId, userId);
}

async function getOwnedReferenceSession(sessionId, userId) {
  const response = await callPython(`/internal/reference-sessions/${encodeURIComponent(sessionId)}`);
  const { session: referenceSession } = await response.json();
  if (!referenceSession || referenceSession.user_id !== userId) {
    throw new PythonServiceError("Reference session not found", 404);
  }
  const product = await getOwnedProduct(referenceSession.product_id, userId);
  if (!product) throw new PythonServiceError("Reference session not found", 404);
  return { referenceSession, product };
}

function sendReferenceError(res, error, fallback = "Unable to complete reference image request") {
  if (error instanceof PythonServiceError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
}

function publicReferenceSession(referenceSession) {
  if (!referenceSession) return referenceSession;
  const { images, user_id, ...safeSession } = referenceSession;
  return {
    ...safeSession,
    ...(images ? { images: images.map(({ image_path, ...image }) => image) } : {}),
  };
}

function publicReferenceImage(image) {
  if (!image) return image;
  const { image_path, ...safeImage } = image;
  return safeImage;
}

app.post("/api/reference-images/sessions", requireAuth, async (req, res) => {
  const productId = Number(req.body?.product_id);
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res.status(400).json({ success: false, message: "Select a valid product" });
  }
  try {
    const product = await getOwnedProduct(productId, req.session.user.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const response = await callPython("/internal/reference-sessions", {
      method: "POST",
      body: { session_id: randomUUID(), product_id: product.id, user_id: req.session.user.id, total_images: 20 },
    });
    const { session: referenceSession } = await response.json();
    return res.status(201).json({ success: true, session: publicReferenceSession(referenceSession), product });
  } catch (error) {
    return sendReferenceError(res, error, "Unable to start reference collection");
  }
});

app.post("/api/reference-images/sessions/:sessionId/capture", requireAuth, referenceUpload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "A JPEG image is required" });
  const imageNumber = Number(req.body?.imageNumber ?? req.body?.image_number);
  if (!Number.isSafeInteger(imageNumber) || imageNumber < 1 || imageNumber > 20) {
    return res.status(400).json({ success: false, message: "Image number must be between 1 and 20" });
  }
  try {
    const { referenceSession } = await getOwnedReferenceSession(req.params.sessionId, req.session.user.id);
    if (referenceSession.status !== "IN_PROGRESS") {
      return res.status(409).json({ success: false, message: "This collection is not in progress" });
    }
    const form = new FormData();
    form.append("product_id", String(referenceSession.product_id));
    form.append("image_number", String(imageNumber));
    form.append("image", new Blob([req.file.buffer], { type: "image/jpeg" }), "capture.jpg");
    const response = await callPython(
      `/internal/reference-sessions/${encodeURIComponent(referenceSession.id)}/images`,
      { method: "POST", body: form },
    );
    const saved = await response.json();
    saved.image = publicReferenceImage(saved.image);
    return res.status(201).json(saved);
  } catch (error) {
    return sendReferenceError(res, error, "Unable to save captured image");
  }
});

app.get("/api/reference-images/sessions/:sessionId", requireAuth, async (req, res) => {
  try {
    const { referenceSession, product } = await getOwnedReferenceSession(req.params.sessionId, req.session.user.id);
    return res.json({ success: true, session: publicReferenceSession(referenceSession), product });
  } catch (error) {
    return sendReferenceError(res, error, "Unable to load reference session");
  }
});

app.get("/api/reference-images/products/:productId", requireAuth, async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  try {
    const product = await getOwnedProduct(productId, req.session.user.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const response = await callPython(`/internal/reference-sessions?product_id=${productId}`);
    const { sessions } = await response.json();
    const ownedSessions = sessions.filter((item) => item.user_id === req.session.user.id)
      .map(({ user_id, ...item }) => item);
    return res.json({ success: true, product, sessions: ownedSessions });
  } catch (error) {
    return sendReferenceError(res, error, "Unable to load collection history");
  }
});

app.post("/api/reference-images/sessions/:sessionId/complete", requireAuth, async (req, res) => {
  try {
    const { referenceSession } = await getOwnedReferenceSession(req.params.sessionId, req.session.user.id);
    const product = await getOwnedProduct(referenceSession.product_id, req.session.user.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    const response = await callPython(`/internal/reference-sessions/${encodeURIComponent(referenceSession.id)}/complete`, { method: "POST" });
    const result = await response.json();
    result.session = publicReferenceSession(result.session);
    return res.json(result);
  } catch (error) {
    return sendReferenceError(res, error, "Unable to complete collection");
  }
});

app.post("/api/reference-images/sessions/:sessionId/cancel", requireAuth, async (req, res) => {
  try {
    const { referenceSession } = await getOwnedReferenceSession(req.params.sessionId, req.session.user.id);
    const response = await callPython(`/internal/reference-sessions/${encodeURIComponent(referenceSession.id)}/cancel`, { method: "POST" });
    const result = await response.json();
    result.session = publicReferenceSession(result.session);
    return res.json(result);
  } catch (error) {
    return sendReferenceError(res, error, "Unable to cancel collection");
  }
});

app.get("/api/reference-images/sessions/:sessionId/images/:imageId", requireAuth, async (req, res) => {
  const imageId = Number(req.params.imageId);
  if (!Number.isSafeInteger(imageId) || imageId <= 0) {
    return res.status(404).json({ success: false, message: "Image not found" });
  }
  try {
    const { referenceSession } = await getOwnedReferenceSession(req.params.sessionId, req.session.user.id);
    const response = await callPython(
      `/internal/reference-sessions/${encodeURIComponent(referenceSession.id)}/images/${imageId}/file`,
    );
    const image = Buffer.from(await response.arrayBuffer());
    res.set("Content-Type", "image/jpeg");
    res.set("Content-Length", String(image.length));
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");
    return res.send(image);
  } catch (error) {
    return sendReferenceError(res, error, "Unable to load reference image");
  }
});

// ------------------------------
// AI QUALITY INSPECTOR COPILOT
// ------------------------------

app.get("/api/copilot/status", requireAuth, async (_req, res) => {
  return res.json({ success: true, ...(await getOllamaStatus()) });
});

app.get("/api/copilot/conversations", requireAuth, (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT c.id, c.title, c.product_id, c.created_at, c.updated_at,
        p.product_name,
        (SELECT content FROM copilot_messages m WHERE m.conversation_id = c.id
          ORDER BY m.id DESC LIMIT 1) AS last_message
      FROM copilot_conversations c
      LEFT JOIN products p ON p.id = c.product_id AND p.user_id = c.user_id
      WHERE c.user_id = ? ORDER BY c.updated_at DESC, c.created_at DESC LIMIT 100
    `).all(req.session.user.id);
    return res.json({ success: true, conversations });
  } catch (error) {
    console.error("Copilot conversation listing error:", error);
    return res.status(500).json({ success: false, message: "Unable to load conversations" });
  }
});

app.get("/api/copilot/conversations/:id", requireAuth, (req, res) => {
  try {
    const conversation = db.prepare(`
      SELECT id, title, product_id, created_at, updated_at
      FROM copilot_conversations WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.session.user.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    const messages = db.prepare(`
      SELECT id, role, content, created_at FROM copilot_messages
      WHERE conversation_id = ? ORDER BY id ASC
    `).all(conversation.id);
    return res.json({ success: true, conversation, messages });
  } catch (error) {
    console.error("Copilot conversation lookup error:", error);
    return res.status(500).json({ success: false, message: "Unable to load conversation" });
  }
});

app.post("/api/copilot/chat", requireAuth, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ success: false, message: "Enter a message to continue" });
  if (message.length > 8000) return res.status(400).json({ success: false, message: "Message must be 8,000 characters or fewer" });

  const userId = req.session.user.id;
  const suppliedConversationId = typeof req.body?.conversationId === "string" && req.body.conversationId.trim()
    ? req.body.conversationId.trim() : null;
  const hasProductId = Object.prototype.hasOwnProperty.call(req.body || {}, "productId");
  const parsedProductId = hasProductId && req.body.productId !== null && req.body.productId !== ""
    ? Number(req.body.productId) : null;
  if (parsedProductId !== null && (!Number.isSafeInteger(parsedProductId) || parsedProductId <= 0)) {
    return res.status(400).json({ success: false, message: "Select a valid product" });
  }

  try {
    let conversation = null;
    if (suppliedConversationId) {
      conversation = db.prepare(`SELECT id, user_id, title, product_id FROM copilot_conversations WHERE id = ? AND user_id = ?`)
        .get(suppliedConversationId, userId);
      if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const requestedProductId = hasProductId ? parsedProductId : (conversation?.product_id ?? null);
    if (requestedProductId !== null) {
      const ownedProduct = db.prepare("SELECT id FROM products WHERE id = ? AND user_id = ?").get(requestedProductId, userId);
      if (!ownedProduct) return res.status(404).json({ success: false, message: "Product not found" });
    }

    const context = getVisionQCContext(userId, requestedProductId);
    const priorMessages = conversation
      ? db.prepare(`SELECT role, content FROM copilot_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 20`)
        .all(conversation.id).reverse()
      : [];
    const assistantMessage = await generateInspectorResponse({
      history: [...priorMessages, { role: "user", content: message }],
      context,
    });

    const conversationId = conversation?.id || randomUUID();
    const title = conversation?.title || message.replace(/\s+/g, " ").slice(0, 72) || "New conversation";
    const persist = db.transaction(() => {
      if (!conversation) {
        db.prepare(`INSERT INTO copilot_conversations (id, user_id, title, product_id) VALUES (?, ?, ?, ?)`)
          .run(conversationId, userId, title, requestedProductId);
      } else {
        db.prepare(`UPDATE copilot_conversations SET product_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`)
          .run(requestedProductId, conversationId, userId);
      }
      const insertMessage = db.prepare("INSERT INTO copilot_messages (conversation_id, role, content) VALUES (?, ?, ?)");
      insertMessage.run(conversationId, "user", message);
      insertMessage.run(conversationId, "assistant", assistantMessage);
      db.prepare("UPDATE copilot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
        .run(conversationId, userId);
    });
    persist();
    return res.json({
      success: true,
      conversationId,
      title,
      productId: requestedProductId,
      model: ollamaConfig.model,
      message: { role: "assistant", content: assistantMessage },
    });
  } catch (error) {
    if (error instanceof OllamaError) {
      return res.status(error.status).json({ success: false, code: error.code, message: error.message });
    }
    console.error("Copilot chat error:", error);
    return res.status(500).json({ success: false, message: "Unable to process your Copilot request" });
  }
});

app.delete("/api/copilot/conversations/:id", requireAuth, (req, res) => {
  try {
    const result = db.prepare("DELETE FROM copilot_conversations WHERE id = ? AND user_id = ?")
      .run(req.params.id, req.session.user.id);
    if (!result.changes) return res.status(404).json({ success: false, message: "Conversation not found" });
    return res.json({ success: true });
  } catch (error) {
    console.error("Copilot conversation deletion error:", error);
    return res.status(500).json({ success: false, message: "Unable to delete conversation" });
  }
});

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
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      success: false,
      message: status === 413 ? "Image must be 10 MB or smaller" : "Invalid image upload",
    });
  }
  if (err.status === 415) {
    return res.status(415).json({ success: false, message: err.message });
  }
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ success: false, message: "Request body must contain valid JSON" });
  }
  console.error("Server error:", err);

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
