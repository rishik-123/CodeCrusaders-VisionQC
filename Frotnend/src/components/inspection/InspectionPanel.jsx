import { useState } from 'react';
import Card from '../common/Card';
import { Badge, Spinner } from '../common/UIComponents';

export default function InspectionPanel() {
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState(null);
  const [threshold, setThreshold] = useState(0.65);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const handleInspect = () => {
    setInspecting(true);
    setResult(null);
    setTimeout(() => {
      setResult({
        score: 0.82,
        imageUrl: 'https://picsum.photos/seed/inspectlive/500/500',
      });
      setInspecting(false);
    }, 1500);
  };

  const isPassing = result ? result.score < threshold : null;

  return (
    <div className="row">
      {/* Left: Image / Capture */}
      <div className="col-8">
        <Card title="Capture / Upload Image">
          {!result && !inspecting && (
            <div className="text-center" style={{ padding: '40px 0' }}>
              <div style={{ fontSize: 64, color: 'var(--border)', marginBottom: 20 }}>
                <i className="fas fa-camera"></i>
              </div>
              <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
                Capture an image or upload one for inspection
              </p>
              <div className="d-flex justify-between" style={{ justifyContent: 'center', gap: 12 }}>
                <button className="btn btn-outline" onClick={handleInspect}>
                  <i className="fas fa-upload"></i> Upload Image
                </button>
                <button className="btn btn-primary" onClick={handleInspect}>
                  <i className="fas fa-camera"></i> Capture & Inspect
                </button>
              </div>
            </div>
          )}

          {inspecting && (
            <div className="spinner-overlay">
              <Spinner size="lg" />
              <span>Analyzing image...</span>
            </div>
          )}

          {result && !inspecting && (
            <div>
              <div className="heatmap-container" style={{ marginBottom: 12 }}>
                <img src={result.imageUrl} alt="Inspected product" />
                {showHeatmap && <div className="heatmap-overlay"></div>}
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
                  Show Heatmap
                </label>
              </div>
              <div className="mt-16 text-center">
                <button className="btn btn-primary" onClick={handleInspect}>
                  <i className="fas fa-redo"></i> Inspect Again
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right: Result */}
      <div className="col-4">
        <Card title="Inspection Result">
          {!result && !inspecting && (
            <div className="empty-state">
              <i className="fas fa-chart-bar"></i>
              <p>Inspect a product to see results</p>
            </div>
          )}

          {inspecting && (
            <div className="spinner-overlay">
              <Spinner />
              <span>Processing...</span>
            </div>
          )}

          {result && !inspecting && (
            <div>
              <div className="score-display">
                <div className={`score-value ${isPassing ? 'score-pass' : 'score-fail'}`}>
                  {result.score}
                </div>
                <div className="score-label">Anomaly Score</div>
              </div>

              <div className="threshold-slider">
                <label>
                  <span>Threshold</span>
                  <span>{threshold}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                />
              </div>

              <div className="text-center mt-16">
                <Badge type={isPassing ? 'pass' : 'fail'} large>
                  {isPassing ? 'PASS' : 'FAIL'}
                </Badge>
              </div>

              <div style={{ marginTop: 20, padding: '12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12, color: 'var(--muted)' }}>
                <p><strong>Score:</strong> {result.score}</p>
                <p><strong>Threshold:</strong> {threshold}</p>
                <p><strong>Decision:</strong> Score {result.score >= threshold ? '≥' : '<'} threshold → {isPassing ? 'PASS' : 'FAIL'}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
