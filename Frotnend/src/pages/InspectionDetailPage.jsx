import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import { Badge, Spinner } from '../components/common/UIComponents';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import { inspectionApi, API_BASE_URL } from '../services/api';
import { formatDateTime } from '../utils/helpers';

export default function InspectionDetailPage({ addToast }) {
  const { id } = useParams();
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    inspectionApi.getInspectionById(id)
      .then((res) => {
        const hUrl = res.heatmap_url ? (res.heatmap_url.startsWith('http') ? res.heatmap_url : `${API_BASE_URL}${res.heatmap_url}`) : null;
        const oUrl = res.overlay_url ? (res.overlay_url.startsWith('http') ? res.overlay_url : `${API_BASE_URL}${res.overlay_url}`) : hUrl;
        setInspection({
          id: res.inspection_id || id,
          score: typeof res.anomaly_score === 'number' ? res.anomaly_score.toFixed(4) : res.anomaly_score,
          threshold: typeof res.threshold === 'number' ? res.threshold.toFixed(4) : res.threshold,
          result: res.decision,
          product: res.product_name || `Product #${res.product_id}`,
          time: res.created_at,
          imageUrl: oUrl || hUrl || '',
          feedbackLabel: res.feedback_label,
          feedbackNotes: res.feedback_notes,
        });
      })
      .catch((err) => setError(err.message || 'Unable to load inspection'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaveFeedback = async (feedbackData) => {
    try {
      await inspectionApi.submitFeedback(id, feedbackData);
      if (addToast) addToast('Operator feedback saved successfully!', 'success');
    } catch (err) {
      if (addToast) addToast('Failed to save feedback: ' + err.message, 'danger');
    }
  };

  if (loading) {
    return (
      <>
        <Breadcrumbs title={`Inspection #${id}`} trail={['Inspection History']} />
        <div className="page-body">
          <div className="spinner-overlay" style={{ minHeight: 300 }}><Spinner size="lg" /><span>Loading inspection details...</span></div>
        </div>
      </>
    );
  }

  if (error || !inspection) {
    return (
      <>
        <Breadcrumbs title={`Inspection #${id}`} trail={['Inspection History']} />
        <div className="page-body">
          <div className="empty-state"><p>{error || 'Inspection not found'}</p><Link to="/history" className="btn btn-outline mt-16">Back to History</Link></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs title={`Inspection Detail #${inspection.id}`} trail={['Inspection History']} />
      <div className="page-body">
        <div style={{ marginBottom: 16 }}>
          <Link to="/history" className="btn btn-outline">
            <i className="fas fa-arrow-left"></i> Back to History
          </Link>
        </div>

        <div className="row mb-24">
          {/* Images */}
          <div className="col-8">
            <Card title="Image & Heatmap Analysis">
              <div className="heatmap-container" style={{ marginBottom: 12, background: '#000', display: 'flex', justifyContent: 'center' }}>
                {inspection.imageUrl ? (
                  <img src={inspection.imageUrl} alt="Inspection detail" style={{ maxHeight: 420, objectFit: 'contain' }} />
                ) : (
                  <div className="empty-state"><p>No visual artifact available</p></div>
                )}
              </div>
              <div className="d-flex justify-between align-center">
                <div className="heatmap-legend">
                  <span>Normal</span>
                  <div className="legend-bar"></div>
                  <span>Anomalous</span>
                </div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                >
                  {showHeatmap ? 'Hide Heatmap Overlay' : 'Show Heatmap Overlay'}
                </button>
              </div>

              {/* Color vs Attributes Index */}
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--page-bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, color: 'var(--heading)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-palette" style={{ color: 'var(--primary)' }}></i>
                  Heatmap Color vs Attributes Index
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e74c3c', display: 'inline-block', boxShadow: '0 0 6px #e74c3c' }}></span>
                    <div style={{ fontSize: 11 }}>
                      <strong style={{ color: 'var(--danger)', display: 'block' }}>RED: DANGER</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>Defect (≥ Threshold)</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', borderRadius: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2ecc71', display: 'inline-block', boxShadow: '0 0 6px #2ecc71' }}></span>
                    <div style={{ fontSize: 11 }}>
                      <strong style={{ color: 'var(--success)', display: 'block' }}>GREEN: OK</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>Passed / In-Tolerance</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(52,152,219,0.12)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3498db', display: 'inline-block', boxShadow: '0 0 6px #3498db' }}></span>
                    <div style={{ fontSize: 11 }}>
                      <strong style={{ color: '#3498db', display: 'block' }}>BLUE: NORMAL</strong>
                      <span style={{ color: 'var(--muted)', fontSize: 10 }}>Baseline Background</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Info */}
          <div className="col-4">
            <Card title="Inspection Info">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="d-flex justify-between align-center">
                  <span className="text-muted">Result</span>
                  <Badge type={inspection.result === 'PASS' ? 'pass' : 'fail'} large>
                    {inspection.result}
                  </Badge>
                </div>

                <div className="d-flex justify-between align-center">
                  <span className="text-muted">Anomaly Score</span>
                  <strong style={{ fontSize: 24, color: inspection.result === 'PASS' ? 'var(--success)' : 'var(--danger)' }}>
                    {inspection.score}
                  </strong>
                </div>

                <div className="d-flex justify-between align-center">
                  <span className="text-muted">Threshold</span>
                  <strong>{inspection.threshold}</strong>
                </div>

                <div className="d-flex justify-between align-center">
                  <span className="text-muted">Product</span>
                  <strong>{inspection.product}</strong>
                </div>

                <div className="d-flex justify-between align-center">
                  <span className="text-muted">Timestamp</span>
                  <span style={{ fontSize: 13 }}>{formatDateTime(inspection.time)}</span>
                </div>
              </div>
            </Card>

            <FeedbackPanel inspection={inspection} onSave={handleSaveFeedback} />
          </div>
        </div>
      </div>
    </>
  );
}

