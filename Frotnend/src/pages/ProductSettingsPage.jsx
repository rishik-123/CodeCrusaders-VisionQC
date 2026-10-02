import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import { Badge } from '../components/common/UIComponents';
import { productApi, settingsApi, trainingApi } from '../services/api';
import { getStatusClass } from '../utils/helpers';

export default function ProductSettingsPage({ addToast }) {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(1);
  const [threshold, setThreshold] = useState(39.39);
  const [productData, setProductData] = useState({ name: 'Bottle', id: 1, createdAt: '', modelStatus: 'READY' });
  const [retrainModal, setRetrainModal] = useState(false);

  useEffect(() => {
    productApi.getProducts()
      .then((res) => {
        if (res.products && res.products.length > 0) {
          setProducts(res.products);
          const p = res.products[0];
          setSelectedProductId(p.id);
          setProductData({
            name: p.product_name || p.name || `Product #${p.id}`,
            id: p.id,
            createdAt: p.created_at || new Date().toLocaleDateString(),
            modelStatus: p.model_status || 'READY',
          });
          loadSettings(p.id);
        }
      })
      .catch(() => {});
  }, []);

  const loadSettings = (pid) => {
    settingsApi.getSettings(pid)
      .then((res) => {
        if (res.current_threshold) {
          setThreshold(Number(res.current_threshold));
        }
      })
      .catch(() => {});
  };

  const handleProductSelect = (pid) => {
    setSelectedProductId(pid);
    const p = products.find((item) => item.id === pid);
    if (p) {
      setProductData({
        name: p.product_name || p.name || `Product #${p.id}`,
        id: p.id,
        createdAt: p.created_at || '',
        modelStatus: p.model_status || 'READY',
      });
    }
    loadSettings(pid);
  };

  const handleSaveThreshold = async () => {
    try {
      await settingsApi.updateSettings(selectedProductId, {
        threshold: Number(threshold),
        reason: 'Supervisor sensitivity tuning',
      });
      if (addToast) addToast(`Anomaly threshold for ${productData.name} updated to ${threshold}`, 'success');
    } catch (err) {
      if (addToast) addToast('Failed to save threshold: ' + err.message, 'danger');
    }
  };

  const handleRetrain = async () => {
    setRetrainModal(false);
    try {
      await trainingApi.train(selectedProductId, { backbone: 'wide_resnet50_2' });
      if (addToast) addToast(`Retraining process triggered for ${productData.name}.`, 'info');
    } catch (err) {
      if (addToast) addToast('Retraining error: ' + err.message, 'danger');
    }
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Product Settings' }]} />
      <div className="page-title">
        <h1>Product Settings: {productData.name}</h1>
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-8">
          <Card title="Product Information">
            {products.length > 0 && (
              <div className="form-group mb-16">
                <label>Select Product</label>
                <select
                  className="form-control"
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(Number(e.target.value))}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name || p.name || `Product #${p.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Product Name</label>
              <input
                type="text"
                className="form-control"
                value={productData.name}
                onChange={(e) => setProductData({ ...productData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Product ID</label>
              <input type="text" className="form-control" value={productData.id} disabled />
            </div>
            <div className="form-group">
              <label>Created Date</label>
              <input type="text" className="form-control" value={productData.createdAt} disabled />
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
                min="10"
                max="80"
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveThreshold}>
              <i className="fas fa-save"></i> Save Threshold
            </button>
          </Card>
        </div>

        {/* Right Column */}
        <div className="col-4">
          <Card title="Model Status & Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="d-flex justify-between align-center">
                <span className="text-muted">Current Status</span>
                <Badge type={getStatusClass(productData.modelStatus).replace('badge-', '')}>
                  {productData.modelStatus}
                </Badge>
              </div>

              <div className="d-flex justify-between align-center">
                <span className="text-muted">Active Model</span>
                <strong>PatchCore v1</strong>
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
            Are you sure you want to retrain the anomaly detection model for <strong>{productData.name}</strong> using current reference images?
          </p>
        </Modal>
      )}
    </div>
  );
}

