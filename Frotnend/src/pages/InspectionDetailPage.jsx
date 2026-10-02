import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import { Badge } from '../components/common/UIComponents';
import FeedbackPanel from '../components/feedback/FeedbackPanel';
import { inspections } from '../data/mockData';
import { formatDateTime } from '../utils/helpers';

export default function InspectionDetailPage({ addToast }) {
  const { id } = useParams();
  const [showHeatmap, setShowHeatmap] = useState(true);

  const inspection = inspections.find((ins) => ins.id === Number(id)) || inspections[0];

  const handleSaveFeedback = () => {
    if (addToast) addToast('Operator feedback saved successfully!', 'success');
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Inspection History', path: '/history' }, { label: `Inspection #${inspection.id}` }]} />
      <div className="page-title">
        <h1>Inspection Detail #{inspection.id}</h1>
        <Link to="/history" className="btn btn-outline">
          <i className="fas fa-arrow-left"></i> Back to History
        </Link>
      </div>

      <div className="row mb-24">
        {/* Images */}
        <div className="col-8">
          <Card title="Image & Heatmap Analysis">
            <div className="heatmap-container" style={{ marginBottom: 12 }}>
              <img src={inspection.imageUrl} alt="Inspection detail" />
              {showHeatmap && <div className="heatmap-overlay"></div>}
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
  );
}
