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

  const compactProduct = (product) => ({
    ...product,
    product_name: product.product_name.slice(0, 120),
    description: (product.description || "").slice(0, 500),
  });
  const products = (selectedProduct ? [selectedProduct] : productRows.slice(0, 20)).map(compactProduct);
  return {
    retrievedAt: new Date().toISOString(),
    productCount,
    products,
    selectedProduct: selectedProduct ? compactProduct(selectedProduct) : null,
    referenceDataStatus,
    referenceSummary,
    referenceDatasetsByProduct,
    referenceDatasets,
    inspectionResults: "unavailable: the inspected application schema contains no persisted inspection-results table or inspection API; visible inspection examples are frontend mock data",
    heatmaps: "unavailable: no persisted heatmap records or inspection-linked heatmap metrics were found",
  };
}
