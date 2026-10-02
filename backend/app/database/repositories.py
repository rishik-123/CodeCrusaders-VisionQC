import json
import sqlite3
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, date
from backend.app.database.database import get_db_connection

class ProductRepository:
    @staticmethod
    def create(name: str, description: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO products (name, description, model_status, active_version, threshold, reference_count, created_at, updated_at)
                VALUES (?, ?, 'NOT_READY', 'v1', 0.5, 0, ?, ?)
                """,
                (name, description, now, now)
            )
            prod_id = cursor.lastrowid
            conn.commit()
            return ProductRepository.get_by_id(prod_id)
        finally:
            conn.close()

    @staticmethod
    def get_by_id(product_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def get_by_name(name: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM products WHERE name = ?", (name,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def list_all() -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM products ORDER BY id ASC").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    @staticmethod
    def update_status(product_id: int, status: str, model_path: Optional[str] = None, threshold: Optional[float] = None, active_version: Optional[str] = None):
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            query = "UPDATE products SET model_status = ?, updated_at = ?"
            params = [status, now]

            if model_path is not None:
                query += ", model_path = ?"
                params.append(model_path)
            if threshold is not None:
                query += ", threshold = ?"
                params.append(threshold)
            if active_version is not None:
                query += ", active_version = ?"
                params.append(active_version)

            query += " WHERE id = ?"
            params.append(product_id)

            conn.execute(query, params)
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def update_threshold(product_id: int, new_threshold: float, previous_threshold: float, reason: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            conn.execute(
                "UPDATE products SET threshold = ?, updated_at = ? WHERE id = ?",
                (new_threshold, now, product_id)
            )
            conn.execute(
                """
                INSERT INTO threshold_history (product_id, previous_threshold, new_threshold, reason, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (product_id, previous_threshold, new_threshold, reason, now)
            )
            conn.commit()
            return ProductRepository.get_by_id(product_id)
        finally:
            conn.close()

    @staticmethod
    def increment_reference_count(product_id: int, count: int = 1):
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            conn.execute(
                "UPDATE products SET reference_count = reference_count + ?, updated_at = ? WHERE id = ?",
                (count, now, product_id)
            )
            conn.commit()
        finally:
            conn.close()


class ReferenceRepository:
    @staticmethod
    def add(product_id: int, filename: str, image_path: str, checksum: str, width: int, height: int) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO reference_images (product_id, filename, image_path, checksum, validation_status, width, height, uploaded_at)
                VALUES (?, ?, ?, ?, 'VALID', ?, ?, ?)
                """,
                (product_id, filename, image_path, checksum, width, height, now)
            )
            ref_id = cursor.lastrowid
            conn.commit()
            return dict(conn.execute("SELECT * FROM reference_images WHERE id = ?", (ref_id,)).fetchone())
        finally:
            conn.close()

    @staticmethod
    def exists_by_checksum(product_id: int, checksum: str) -> bool:
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT id FROM reference_images WHERE product_id = ? AND checksum = ?",
                (product_id, checksum)
            ).fetchone()
            return row is not None
        finally:
            conn.close()

    @staticmethod
    def list_by_product(product_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM reference_images WHERE product_id = ? ORDER BY id ASC",
                (product_id,)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    @staticmethod
    def count_by_product(product_id: int) -> int:
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM reference_images WHERE product_id = ?",
                (product_id,)
            ).fetchone()
            return row["cnt"] if row else 0
        finally:
            conn.close()


class ModelVersionRepository:
    @staticmethod
    def create(product_id: int, version: str, model_path: str, threshold: float, reference_count: int, validation_metrics: Optional[Dict] = None, is_active: bool = True) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            if is_active:
                conn.execute("UPDATE model_versions SET is_active = 0 WHERE product_id = ?", (product_id,))

            metrics_json = json.dumps(validation_metrics) if validation_metrics else None
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO model_versions (product_id, version, model_path, threshold, reference_count, validation_metrics, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (product_id, version, model_path, threshold, reference_count, metrics_json, 1 if is_active else 0, now)
            )
            v_id = cursor.lastrowid
            conn.commit()
            return dict(conn.execute("SELECT * FROM model_versions WHERE id = ?", (v_id,)).fetchone())
        finally:
            conn.close()

    @staticmethod
    def list_by_product(product_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM model_versions WHERE product_id = ? ORDER BY id DESC",
                (product_id,)
            ).fetchall()
            res = []
            for r in rows:
                d = dict(r)
                if d.get("validation_metrics"):
                    try:
                        d["validation_metrics"] = json.loads(d["validation_metrics"])
                    except Exception:
                        pass
                res.append(d)
            return res
        finally:
            conn.close()

    @staticmethod
    def set_active(product_id: int, version: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT * FROM model_versions WHERE product_id = ? AND version = ?",
                (product_id, version)
            ).fetchone()
            if not row:
                return None

            conn.execute("UPDATE model_versions SET is_active = 0 WHERE product_id = ?", (product_id,))
            conn.execute("UPDATE model_versions SET is_active = 1 WHERE product_id = ? AND version = ?", (product_id, version))
            conn.execute("UPDATE products SET active_version = ?, model_path = ?, threshold = ? WHERE id = ?", (version, row["model_path"], row["threshold"], product_id))
            conn.commit()
            return dict(row)
        finally:
            conn.close()


class InspectionRepository:
    @staticmethod
    def log(
        inspection_id: str,
        product_id: int,
        image_path: str,
        heatmap_path: Optional[str],
        overlay_path: Optional[str],
        anomaly_score: float,
        threshold: float,
        decision: str,
        processing_time_ms: float,
        model_version: Optional[str] = "v1"
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            conn.execute(
                """
                INSERT INTO inspections (id, product_id, image_path, heatmap_path, overlay_path, anomaly_score, threshold, decision, processing_time_ms, model_version, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (inspection_id, product_id, image_path, heatmap_path, overlay_path, anomaly_score, threshold, decision, processing_time_ms, model_version, now)
            )
            conn.commit()
            return InspectionRepository.get_by_id(inspection_id)
        finally:
            conn.close()

    @staticmethod
    def get_by_id(inspection_id: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute(
                """
                SELECT i.*, f.label as feedback_label, f.notes as feedback_notes
                FROM inspections i
                LEFT JOIN feedback f ON i.id = f.inspection_id
                WHERE i.id = ?
                """,
                (inspection_id,)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    @staticmethod
    def list_inspections(
        product_id: Optional[int] = None,
        decision: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        conn = get_db_connection()
        try:
            where_clauses = []
            params = []

            if product_id:
                where_clauses.append("i.product_id = ?")
                params.append(product_id)
            if decision:
                where_clauses.append("i.decision = ?")
                params.append(decision.upper())
            if date_from:
                where_clauses.append("i.created_at >= ?")
                params.append(date_from)
            if date_to:
                where_clauses.append("i.created_at <= ?")
                params.append(date_to)

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            # Count total
            count_sql = f"SELECT COUNT(*) as total FROM inspections i {where_sql}"
            total = conn.execute(count_sql, params).fetchone()["total"]

            # Query items
            query_sql = f"""
                SELECT i.*, f.label as feedback_label, f.notes as feedback_notes
                FROM inspections i
                LEFT JOIN feedback f ON i.id = f.inspection_id
                {where_sql}
                ORDER BY i.created_at DESC
                LIMIT ? OFFSET ?
            """
            rows = conn.execute(query_sql, params + [limit, offset]).fetchall()
            return [dict(r) for r in rows], total
        finally:
            conn.close()


class FeedbackRepository:
    @staticmethod
    def add(inspection_id: str, label: str, notes: Optional[str] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO feedback (inspection_id, label, notes, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (inspection_id, label, notes, now)
            )
            fb_id = cursor.lastrowid
            conn.commit()
            return dict(conn.execute("SELECT * FROM feedback WHERE id = ?", (fb_id,)).fetchone())
        finally:
            conn.close()


class TrainingJobRepository:
    @staticmethod
    def create(job_id: str, product_id: int, version: str) -> Dict[str, Any]:
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            conn.execute(
                """
                INSERT INTO training_jobs (id, product_id, version, status, created_at)
                VALUES (?, ?, ?, 'TRAINING', ?)
                """,
                (job_id, product_id, version, now)
            )
            conn.commit()
            return dict(conn.execute("SELECT * FROM training_jobs WHERE id = ?", (job_id,)).fetchone())
        finally:
            conn.close()

    @staticmethod
    def update_status(job_id: str, status: str, error_message: Optional[str] = None):
        conn = get_db_connection()
        now = datetime.utcnow().isoformat()
        try:
            conn.execute(
                "UPDATE training_jobs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?",
                (status, error_message, now, job_id)
            )
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def get_latest_by_product(product_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            row = conn.execute(
                "SELECT * FROM training_jobs WHERE product_id = ? ORDER BY created_at DESC LIMIT 1",
                (product_id,)
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


class AnalyticsRepository:
    @staticmethod
    def get_today_dashboard(product_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        today_prefix = date.today().isoformat()
        try:
            where = "WHERE created_at LIKE ?"
            params = [f"{today_prefix}%"]
            if product_id:
                where += " AND product_id = ?"
                params.append(product_id)

            sql = f"""
                SELECT 
                    COUNT(*) as total_inspections,
                    SUM(CASE WHEN decision = 'PASS' THEN 1 ELSE 0 END) as pass_count,
                    SUM(CASE WHEN decision = 'FAIL' THEN 1 ELSE 0 END) as fail_count,
                    AVG(anomaly_score) as avg_anomaly_score,
                    AVG(processing_time_ms) as avg_processing_time_ms
                FROM inspections
                {where}
            """
            row = conn.execute(sql, params).fetchone()
            total = row["total_inspections"] or 0
            fails = row["fail_count"] or 0
            passes = row["pass_count"] or 0
            avg_score = float(row["avg_anomaly_score"]) if row["avg_anomaly_score"] is not None else 0.0
            avg_time = float(row["avg_processing_time_ms"]) if row["avg_processing_time_ms"] is not None else 0.0

            rejection_rate = round((fails / total * 100), 2) if total > 0 else 0.0

            return {
                "date": today_prefix,
                "product_id": product_id,
                "total_inspections": total,
                "pass_count": passes,
                "fail_count": fails,
                "rejection_rate_percent": rejection_rate,
                "avg_anomaly_score": round(avg_score, 4),
                "avg_processing_time_ms": round(avg_time, 2)
            }
        finally:
            conn.close()

    @staticmethod
    def get_trends(product_id: Optional[int] = None, days: int = 7) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            where = ""
            params = []
            if product_id:
                where = "WHERE product_id = ?"
                params.append(product_id)

            sql = f"""
                SELECT 
                    substr(created_at, 1, 10) as day,
                    COUNT(*) as total,
                    SUM(CASE WHEN decision = 'PASS' THEN 1 ELSE 0 END) as pass_cnt,
                    SUM(CASE WHEN decision = 'FAIL' THEN 1 ELSE 0 END) as fail_cnt,
                    AVG(anomaly_score) as avg_score
                FROM inspections
                {where}
                GROUP BY day
                ORDER BY day DESC
                LIMIT ?
            """
            rows = conn.execute(sql, params + [days]).fetchall()
            results = []
            for r in rows:
                tot = r["total"] or 0
                f_cnt = r["fail_cnt"] or 0
                rej = round((f_cnt / tot * 100), 2) if tot > 0 else 0.0
                results.append({
                    "date": r["day"],
                    "total_inspections": tot,
                    "pass_count": r["pass_cnt"] or 0,
                    "fail_count": f_cnt,
                    "rejection_rate_percent": rej,
                    "avg_anomaly_score": round(float(r["avg_score"]), 4) if r["avg_score"] is not None else 0.0
                })
            return results
        finally:
            conn.close()

    @staticmethod
    def get_anomaly_insights(product_id: Optional[int] = None) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            where = ""
            params = []
            if product_id:
                where = "WHERE product_id = ?"
                params.append(product_id)

            scores_sql = f"SELECT anomaly_score, decision FROM inspections {where}"
            rows = conn.execute(scores_sql, params).fetchall()

            if not rows:
                return {
                    "total_inspections": 0,
                    "mean_anomaly_score": 0.0,
                    "min_anomaly_score": 0.0,
                    "max_anomaly_score": 0.0,
                    "score_distribution": {
                        "0.0-0.3 (normal)": 0,
                        "0.3-0.5 (low anomaly)": 0,
                        "0.5-0.7 (moderate defect)": 0,
                        "0.7-1.0 (high defect)": 0
                    },
                    "feedback_disagreement_count": 0,
                    "disagreement_rate_percent": 0.0
                }

            scores = [r["anomaly_score"] for r in rows]
            
            # Buckets
            b1 = sum(1 for s in scores if s < 0.3)
            b2 = sum(1 for s in scores if 0.3 <= s < 0.5)
            b3 = sum(1 for s in scores if 0.5 <= s < 0.7)
            b4 = sum(1 for s in scores if s >= 0.7)

            # Feedback disagreements (model said FAIL but supervisor labeled ACTUALLY_GOOD, or model said PASS but labeled CONFIRMED_DEFECT)
            fb_sql = f"""
                SELECT COUNT(*) as disagreements
                FROM inspections i
                JOIN feedback f ON i.id = f.inspection_id
                WHERE (i.decision = 'FAIL' AND f.label = 'ACTUALLY_GOOD')
                   OR (i.decision = 'PASS' AND f.label = 'CONFIRMED_DEFECT')
            """
            disagreements = conn.execute(fb_sql).fetchone()["disagreements"]

            return {
                "total_inspections": len(scores),
                "mean_anomaly_score": round(float(sum(scores) / len(scores)), 4),
                "min_anomaly_score": round(float(min(scores)), 4),
                "max_anomaly_score": round(float(max(scores)), 4),
                "score_distribution": {
                    "0.0-0.3 (normal)": b1,
                    "0.3-0.5 (low anomaly)": b2,
                    "0.5-0.7 (moderate defect)": b3,
                    "0.7-1.0 (high defect)": b4
                },
                "feedback_disagreement_count": disagreements,
                "disagreement_rate_percent": round((disagreements / len(scores) * 100), 2) if len(scores) > 0 else 0.0
            }
        finally:
            conn.close()
