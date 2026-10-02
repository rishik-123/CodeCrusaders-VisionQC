import { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import { Badge } from '../components/common/UIComponents';
import { product, referenceImages } from '../data/mockData';
import { getStatusClass } from '../utils/helpers';

export default function ProductSettingsPage({ addToast }) {
  const [threshold, setThreshold] = useState(product.threshold);
  const [name, setName] = useState(product.name);
  const [retrainModal, setRetrainModal] = useState(false);

  const handleSaveThreshold = () => {
    if (addToast) addToast(`Anomaly threshold updated to ${threshold}`, 'success');
  };

  const handleRetrain = () => {
    setRetrainModal(false);
    if (addToast) addToast('Retraining process triggered.', 'info');
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Product Settings' }]} />
      <div className="page-title">
        <h1>Product Settings: {product.name}</h1>
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-8">
          <Card title="Product Information">
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Product ID</label>
              <input type="text" className="form-control" value={product.id} disabled />
            </div>
            <div className="form-group">
              <label>Created Date</label>
              <input type="text" className="form-control" value={product.createdAt} disabled />
            </div>
          </Card>

          <Card title="Anomaly Sensitivity Threshold">
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Images with an anomaly score higher than this threshold will be flagged as FAIL.
            </p>
            <div className="threshold-slider" style={{ marginBottom: 20 }}>
              <label>
                <span>Sensitivity Threshold</span>
                <strong style={{ fontSize: 16 }}>{threshold}</strong>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveThreshold}>
              <i className="fas fa-save"></i> Save Threshold
            </button>
          </Card>

          <Card title="Reference Image Gallery">
            <div className="d-flex justify-between align-center mb-16">
              <span>{referenceImages.length} Reference Images</span>
              <Link to="/setup/references" className="btn btn-sm btn-outline">
                View All Images
              </Link>
            </div>
            <div className="image-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {referenceImages.slice(0, 8).map((img) => (
                <div key={img.id} className="image-grid-item">
                  <img src={img.url} alt={`Ref ${img.id}`} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="col-4">
          <Card title="Model Status & Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="d-flex justify-between align-center">
                <span className="text-muted">Current Status</span>
                <Badge type={getStatusClass(product.modelStatus).replace('badge-', '')}>
                  {product.modelStatus}
                </Badge>
              </div>

              <div className="d-flex justify-between align-center">
                <span className="text-muted">Training Images</span>
                <strong>{referenceImages.length}</strong>
              </div>

              <button className="btn btn-warning" onClick={() => setRetrainModal(true)}>
                <i className="fas fa-sync-alt"></i> Retrain Model
              </button>
            </div>
          </Card>
        </div>
      </div>

      {retrainModal && (
        <Modal
          title="Confirm Retrain Model"
          onClose={() => setRetrainModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setRetrainModal(false)}>
                Cancel
              </button>
              <button className="btn btn-warning" onClick={handleRetrain}>
                Confirm Retrain
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14 }}>
            Are you sure you want to retrain the anomaly detection model for <strong>{product.name}</strong> using current reference images?
          </p>
        </Modal>
      )}
    </div>
  );
}
