import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { db } from "../database/database.js";

const BACKEND_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REFERENCE_DATABASE_PATH = path.join(BACKEND_DIR, "database", "reference_images.db");

export function getVisionQCContext(userId, requestedProductId = null) {
  const productCount = db.prepare("SELECT COUNT(*) AS count FROM products WHERE user_id = ?").get(userId).count;
  const productRows = db.prepare(`
    SELECT id, product_name, product_type, product_id, manufacturer, material,
      length, width, height, dimension_unit, product_color, description, created_at
    FROM products WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50
  `).all(userId);
  const selectedProduct = requestedProductId == null ? null : db.prepare(`
    SELECT id, product_name, product_type, product_id, manufacturer, material,
      length, width, height, dimension_unit, product_color, description, created_at
    FROM products WHERE user_id = ? AND id = ?
  `).get(userId, requestedProductId) || null;

  let referenceDatasets = [];
  let referenceSummary = null;
  let referenceDatasetsByProduct = [];
  let referenceDataStatus = fs.existsSync(REFERENCE_DATABASE_PATH) ? "available" : "no_reference_database";
  if (referenceDataStatus === "available") {
    let referenceDb;
    try {
      referenceDb = new Database(REFERENCE_DATABASE_PATH, { readonly: true, fileMustExist: true });
      const params = selectedProduct ? [userId, selectedProduct.id] : [userId];
      const productFilter = selectedProduct ? "AND product_id = ?" : "";
      referenceSummary = referenceDb.prepare(`
        SELECT COUNT(*) AS dataset_count,
          COALESCE(SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END), 0) AS completed_count,
          COALESCE(SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS in_progress_count,
          COALESCE(SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS cancelled_count,
          COALESCE(SUM(captured_images), 0) AS captured_images
        FROM reference_sessions WHERE user_id = ? ${productFilter}
      `).get(...params);
      referenceDatasetsByProduct = referenceDb.prepare(`
        SELECT product_id, COUNT(*) AS dataset_count,
          SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_count,
          SUM(captured_images) AS captured_images
        FROM reference_sessions WHERE user_id = ? ${productFilter}
        GROUP BY product_id ORDER BY dataset_count DESC LIMIT 20
      `).all(...params).map((dataset) => ({
        ...dataset,
        product_name: (selectedProduct || productRows.find((product) => product.id === dataset.product_id))?.product_name || "Unknown product",
      }));
      referenceDatasets = referenceDb.prepare(`
        SELECT s.id, s.product_id, s.captured_images, s.total_images, s.status,
          s.created_at, s.completed_at,
          COUNT(i.id) AS image_count, AVG(i.sharpness_score) AS average_sharpness,
          MIN(i.sharpness_score) AS minimum_sharpness
        FROM reference_sessions s
        LEFT JOIN reference_images i ON i.session_id = s.id
        WHERE s.user_id = ? ${selectedProduct ? "AND s.product_id = ?" : ""}
        GROUP BY s.id ORDER BY s.created_at DESC LIMIT 12
      `).all(...params).map((dataset) => ({
        ...dataset,
        product_name: productRows.find((product) => product.id === dataset.product_id)?.product_name || "Unknown product",
      }));
    } catch (error) {
      // Reference images are stored by a separate service/database; keep Copilot useful if it is unavailable.
      referenceDataStatus = "unavailable";
      referenceDatasets = [];
      referenceSummary = null;
      referenceDatasetsByProduct = [];
      console.warn("Copilot could not read reference dataset context:", error.message);
    } finally {
      referenceDb?.close();
    }
  }

  // Fetch live inspections summary from SQLite
  let inspectionSummary = { total: 0, pass: 0, fail: 0, passRate: "100%", recent: [] };
  try {
    const filterClause = selectedProduct ? "WHERE LOWER(product_name) = LOWER(?) OR product_id = ?" : "";
    const filterParams = selectedProduct ? [selectedProduct.product_name, selectedProduct.id] : [];
    
    const inspTotal = db.prepare(`
      SELECT COUNT(*) AS count,
        SUM(CASE WHEN decision = 'PASS' OR is_defect = 0 THEN 1 ELSE 0 END) AS passes,
        SUM(CASE WHEN decision = 'FAIL' OR is_defect = 1 THEN 1 ELSE 0 END) AS fails
      FROM inspections ${filterClause}
    `).get(...filterParams);

    if (inspTotal && inspTotal.count > 0) {
      inspectionSummary.total = inspTotal.count;
      inspectionSummary.pass = inspTotal.passes || 0;
      inspectionSummary.fail = inspTotal.fails || 0;
      inspectionSummary.passRate = `${((inspectionSummary.pass / inspectionSummary.total) * 100).toFixed(1)}%`;
    }

    const recentRows = db.prepare(`
      SELECT id, product_name, decision, is_defect, anomaly_score, threshold_used, created_at
      FROM inspections ${filterClause}
      ORDER BY id DESC LIMIT 5
    `).all(...filterParams);

    inspectionSummary.recent = recentRows.map(r => {
      const dec = r.decision || (r.is_defect === 1 ? 'FAIL' : 'PASS');
      const score = Number(r.anomaly_score || 0).toFixed(2);
      const thresh = Number(r.threshold_used || 0).toFixed(2);
      return `#${r.id} ${r.product_name}: ${dec} (score ${score}, threshold ${thresh}) at ${r.created_at}`;
    });
  } catch (err) {
    console.warn("Could not query inspections context:", err.message);
  }

  const compactProduct = (product) => ({
    name: product.product_name,
    type: product.product_type,
    material: product.material,
  });
  const products = (selectedProduct ? [selectedProduct] : productRows.slice(0, 15)).map(compactProduct);

  return {
    activeProduct: selectedProduct ? selectedProduct.product_name : "All Products (15 total)",
    allProducts: products.map(p => p.name).join(", "),
    inspections: {
      total: inspectionSummary.total,
      pass: inspectionSummary.pass,
      fail: inspectionSummary.fail,
      passRate: inspectionSummary.passRate,
      recent: inspectionSummary.recent.length ? inspectionSummary.recent.join(" | ") : "No recent inspections recorded yet",
    },
    referenceDatasets: referenceSummary ? {
      totalDatasets: referenceSummary.dataset_count,
      completed: referenceSummary.completed_count,
      capturedImages: referenceSummary.captured_images,
    } : "Baseline normal reference datasets active",
    systemCapabilities: "PatchCore AI anomaly detection, OpenCV live circular/rectangular scanning with background glare masking, real-time heatmap color indexing (Red=Defect, Green=OK, Blue=Baseline), reinforcement learning operator feedback.",
  };
}
