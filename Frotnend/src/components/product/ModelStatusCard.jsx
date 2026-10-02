import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge, ProgressBar } from '../common/UIComponents';
import { product, referenceImages } from '../../data/mockData';
import { getStatusClass } from '../../utils/helpers';

export default function ModelStatusCard() {
  const count = referenceImages.length;
  const target = 30;

  return (
    <Card title="Model Status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="d-flex justify-between align-center">
          <span style={{ fontSize: 13 }}>Reference Images</span>
          <span style={{ fontWeight: 600, color: 'var(--heading)' }}>
            {count} / {target}
          </span>
        </div>
        <ProgressBar value={count} max={target} color={count >= 20 ? 'green' : 'orange'} />

        <div className="d-flex justify-between align-center">
          <span style={{ fontSize: 13 }}>Model Status</span>
          <Badge type={getStatusClass(product.modelStatus).replace('badge-', '')}>
            {product.modelStatus}
          </Badge>
        </div>

        <Link
          to="/setup/training"
          className={`btn btn-primary ${count < 20 ? 'disabled' : ''}`}
          style={count < 20 ? { pointerEvents: 'none', opacity: 0.55 } : {}}
        >
          <i className="fas fa-brain"></i> Learn Normal
        </Link>

        {count < 20 && (
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            <i className="fas fa-info-circle"></i> Upload at least 20 reference images to enable training.
          </p>
        )}
      </div>
    </Card>
  );
}
