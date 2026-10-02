import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from '../common/Card';
import { Badge, ProgressBar, Spinner } from '../common/UIComponents';
import { productApi, inspectionApi, API_BASE_URL } from '../../services/api';
import { trainingLogs } from '../../data/mockData';

export default function TrainingPanel({ onComplete }) {
  const [searchParams] = useSearchParams();
  const queryInspectionId = searchParams.get('inspectionId');
  const queryProductId = searchParams.get('productId');

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(queryProductId ? Number(queryProductId) : 1);
  const [latestInspection, setLatestInspection] = useState(null);
  const [loadingInspection, setLoadingInspection] = useState(true);

  // Reinforcement Feedback State
  const [feedbackChoice, setFeedbackChoice] = useState(null); // 'yes' | 'no' | null
  const [feedbackReason, setFeedbackReason] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Training State
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | training | complete
  const [elapsed, setElapsed] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const logRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    productApi.getProducts()
      .then((res) => {
        if (res.products && res.products.length > 0) {
          setProducts(res.products);
          if (!queryProductId) {
            setSelectedProductId(res.products[0].id);
          }
        }
      })
      .catch(() => {});
  }, [queryProductId]);

  useEffect(() => {
    let active = true;
    if (queryInspectionId) {
      inspectionApi.getInspectionById(queryInspectionId)
        .then((res) => {
          if (active) {
            const data = res.data || res;
            setLatestInspection(data);
            setLoadingInspection(false);
          }
        })
        .catch(() => { if (active) setLoadingInspection(false); });
    } else {
      inspectionApi.getHistory({ limit: 1 })
        .then((res) => {
          if (active) {
            const list = res.inspections || res.data?.inspections || (Array.isArray(res) ? res : []);
            if (list.length > 0) {
              setLatestInspection(list[0]);
            } else {
              setLatestInspection(null);
            }
            setLoadingInspection(false);
          }
        })
        .catch(() => { if (active) setLoadingInspection(false); });
    }
    return () => { active = false; };
  }, [queryInspectionId, selectedProductId]);

  const handleFeedbackSubmit = async () => {
    if (!latestInspection || !feedbackChoice) return;
    try {
      const payload = {
        feedback: feedbackChoice === 'yes' ? 'CONFIRMED_ACCURATE' : 'FLAGGED_MISCLASSIFICATION',
        decision: feedbackChoice === 'yes' ? latestInspection.decision : (latestInspection.decision === 'PASS' ? 'FAIL' : 'PASS'),
        notes: feedbackReason || (feedbackChoice === 'yes' ? 'Operator confirmed prediction was correct.' : 'Operator flagged prediction as incorrect.'),
        operator_feedback: feedbackChoice === 'yes' ? 'TRUE_PREDICTION' : `MISCLASSIFICATION: ${feedbackReason}`
      };
      await inspectionApi.submitFeedback(latestInspection.id, payload);
      setFeedbackSubmitted(true);
      setFeedbackMsg(
        feedbackChoice === 'yes'
          ? '✓ Feedback recorded! The verified sample strengthens the AI normal baseline.'
          : '✓ Error report submitted to AI Reinforcement Learning for threshold adaptation.'
      );
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  const startTraining = () => {
    setStatus('training');
    setProgress(0);
    setElapsed(0);
    setVisibleLogs([]);

    let p = 0;
    let t = 0;
    let logIndex = 0;

    timerRef.current = setInterval(() => {
      p += Math.random() * 4 + 1;
      t += 1;

      if (logIndex < trainingLogs.length && p > (logIndex + 1) * 10) {
        if (trainingLogs[logIndex]) {
          setVisibleLogs((prev) => [...prev, trainingLogs[logIndex]]);
        }
        logIndex++;
      }

      setElapsed(t);

      if (p >= 100) {
        p = 100;
        setProgress(100);
        clearInterval(timerRef.current);
        setVisibleLogs([...(trainingLogs || [])]);
        setTimeout(() => {
          setStatus('complete');
          if (typeof onComplete === 'function') {
            try { onComplete(); } catch (err) { console.warn('onComplete callback error:', err); }
          }
        }, 300);
        return;
      }

      setProgress(Math.min(p, 99));
    }, 400);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const currentProduct = products.find((p) => p.id === selectedProductId) || { product_name: 'Bottle' };

  return (
    <div>
      {/* 1. REINFORCEMENT LEARNING & PREDICTION FEEDBACK */}
      <Card title="Reinforcement Learning & AI Feedback">
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
            VisionQC uses active reinforcement learning. Review recent predictions to teach the AI which decisions were accurate and calibrate edge cases.
          </p>
        </div>

        {loadingInspection && (
          <div className="spinner-overlay" style={{ minHeight: 120 }}>
            <Spinner size="md" />
            <span>Loading latest inspection data...</span>
          </div>
        )}

        {!loadingInspection && latestInspection && (() => {
          const imgPath = latestInspection.overlay_url || latestInspection.overlay_path || latestInspection.heatmap_url || latestInspection.heatmap_path;
          const fullImgUrl = imgPath ? (imgPath.startsWith('http') ? imgPath : `${API_BASE_URL}${imgPath}`) : null;
          const scoreNum = Number(latestInspection.anomaly_score ?? latestInspection.score ?? 0);
          const threshNum = Number(latestInspection.threshold_used ?? latestInspection.threshold ?? 39.39);
          const decision = latestInspection.decision || (latestInspection.is_defect ? 'FAIL' : 'PASS');
          const inspId = latestInspection.id || latestInspection.inspection_id || 1;

          return (
            <div style={{ background: 'var(--page-bg)', padding: 16, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 20 }}>
              <div className="row" style={{ alignItems: 'center' }}>
                <div className="col-4 text-center">
                  {fullImgUrl ? (
                    <img
                      src={fullImgUrl}
                      alt="Inspected Sample"
                      style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', borderRadius: 4, background: '#000' }}
                    />
                  ) : (
                    <div style={{ height: 120, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                      <i className="fas fa-camera" style={{ fontSize: 32 }}></i>
                    </div>
                  )}
                </div>

                <div className="col-8">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 16 }}>
                      {latestInspection.product_name?.toUpperCase() || currentProduct.product_name?.toUpperCase() || 'PRODUCT'} — Inspection #{inspId}
                    </h4>
                    <Badge type={decision === 'PASS' ? 'pass' : 'fail'} large>
                      {decision}
                    </Badge>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
                    <span>Anomaly Score: <strong>{!isNaN(scoreNum) ? scoreNum.toFixed(4) : '0.0000'}</strong></span>
                    <span style={{ margin: '0 12px', color: 'var(--border)' }}>|</span>
                    <span>Threshold: <strong>{!isNaN(threshNum) ? threshNum.toFixed(4) : '39.3900'}</strong></span>
                    <span style={{ margin: '0 12px', color: 'var(--border)' }}>|</span>
                    <span>Time: <strong>{latestInspection.created_at ? new Date(latestInspection.created_at).toLocaleTimeString() : 'Recent'}</strong></span>
                  </div>

                  {!feedbackSubmitted ? (
                    <div>
                      <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                        Was the AI prediction right?
                      </label>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <button
                          type="button"
                          className={`btn ${feedbackChoice === 'yes' ? 'btn-success' : 'btn-outline'}`}
                          onClick={() => setFeedbackChoice('yes')}
                          style={{ minWidth: 140 }}
                        >
                          <i className="fas fa-check"></i> Yes, Accurate
                        </button>
                        <button
                          type="button"
                          className={`btn ${feedbackChoice === 'no' ? 'btn-danger' : 'btn-outline'}`}
                          onClick={() => setFeedbackChoice('no')}
                          style={{ minWidth: 140 }}
                        >
                          <i className="fas fa-times"></i> No, Incorrect
                        </button>
                      </div>

                      {feedbackChoice === 'no' && (
                        <div style={{ marginTop: 12 }}>
                          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                            Why was the prediction wrong? (Reinforcement Note for AI):
                          </label>
                          <textarea
                            className="form-control"
                            rows="2"
                            placeholder="e.g. False alarm on minor glare; or overlooked surface scratch on upper neck"
                            value={feedbackReason}
                            onChange={(e) => setFeedbackReason(e.target.value)}
                            style={{ marginBottom: 10, width: '100%' }}
                          />
                        </div>
                      )}

                      {feedbackChoice && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleFeedbackSubmit}
                          style={{ marginTop: 6 }}
                        >
                          <i className="fas fa-paper-plane"></i> Submit Feedback to AI
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px', background: 'rgba(46,204,113,0.15)', color: 'var(--success)', borderRadius: 4, fontWeight: 500 }}>
                      {feedbackMsg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {!loadingInspection && !latestInspection && (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <p>No recent inspections found. Run an inspection from Live Inspection first.</p>
            <Link to="/inspection" className="btn btn-primary mt-8">
              <i className="fas fa-camera"></i> Go to Live Inspection
            </Link>
          </div>
        )}
      </Card>

      {/* 2. MODEL TRAINING SUMMARY */}
      <Card title="Product Training & Baseline Calibration">
        <div className="row">
          <div className="col-4">
            <div className="d-flex align-center gap-8 mb-8">
              <i className="fas fa-box" style={{ color: 'var(--primary)' }}></i>
              <span style={{ fontSize: 13 }}>Selected Product</span>
            </div>
            {products.length > 0 ? (
              <select
                className="form-control"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name || p.name || `Product #${p.id}`}
                  </option>
                ))}
              </select>
            ) : (
              <strong>{currentProduct.product_name || 'Bottle'}</strong>
            )}
          </div>
          <div className="col-4">
            <div className="d-flex align-center gap-8 mb-8">
              <i className="fas fa-images" style={{ color: 'var(--primary)' }}></i>
              <span style={{ fontSize: 13 }}>Reference Images</span>
            </div>
            <strong>25 Good Reference Units</strong>
          </div>
          <div className="col-4">
            <div className="d-flex align-center gap-8 mb-8">
              <i className="fas fa-info-circle" style={{ color: 'var(--primary)' }}></i>
              <span style={{ fontSize: 13 }}>Model Status</span>
            </div>
            {status === 'complete' ? (
              <Badge type="ready">Ready</Badge>
            ) : status === 'training' ? (
              <Badge type="training">Training</Badge>
            ) : (
              <Badge type="ready">Calibrated & Ready</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* 3. TRAINING CONTROLS & LOGS */}
      <Card title="Learn Normal Execution">
        {status === 'idle' && (
          <div className="text-center" style={{ padding: '20px 0' }}>
            <p style={{ marginBottom: 16, color: 'var(--text)' }}>
              Train PatchCore memory bank to learn the normal baseline features for <strong>{currentProduct.product_name || 'Selected Product'}</strong>.
            </p>
            <button className="btn btn-primary btn-lg" onClick={startTraining}>
              <i className="fas fa-brain"></i> Train PatchCore Model
            </button>
          </div>
        )}

        {(status === 'training' || status === 'complete') && (
          <div>
            <div className="d-flex justify-between align-center mb-8">
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {status === 'complete' ? 'Training Complete' : 'Training PatchCore Anomaly Model...'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                <i className="fas fa-clock"></i> {formatElapsed(elapsed)}
              </span>
            </div>

            <ProgressBar
              value={progress}
              max={100}
              color={status === 'complete' ? 'green' : ''}
              label
              large
            />

            <div className="mt-16" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {Math.round(progress)}% complete
            </div>
          </div>
        )}
      </Card>

      {(status === 'training' || status === 'complete') && (
        <Card title="Training Logs">
          <div className="training-log" ref={logRef}>
            {(visibleLogs || []).filter(Boolean).map((log, i) => {
              const level = (log.level || 'INFO').toLowerCase();
              return (
                <div key={i} className="log-line">
                  <span className="log-time">[{log.time || '00:00:00'}]</span>{' '}
                  <span className={`log-${level}`}>[{log.level || 'INFO'}]</span>{' '}
                  {log.msg || ''}
                </div>
              );
            })}
            {status === 'training' && (
              <div className="log-line" style={{ opacity: 0.5 }}>
                <span className="log-info">Extracting WideResNet50 feature embeddings...</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {status === 'complete' && (
        <Card title="Model Status">
          <div className="text-center" style={{ padding: '16px 0' }}>
            <Badge type="ready" large>Ready</Badge>
            <p style={{ margin: '16px 0', color: 'var(--text)' }}>
              The model has learned normal variations and is ready for live industrial inspection.
            </p>
            <Link to="/inspection" className="btn btn-success btn-lg">
              <i className="fas fa-camera"></i> Go to Live Inspection
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
