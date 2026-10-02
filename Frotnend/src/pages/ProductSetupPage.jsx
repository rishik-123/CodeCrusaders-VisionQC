import { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import ModelStatusCard from '../components/product/ModelStatusCard';
import { product, referenceImages } from '../data/mockData';

export default function ProductSetupPage({ addToast }) {
  const [productName, setProductName] = useState(product.name);
  const [desc, setDesc] = useState(product.description);

  const handleSave = (e) => {
    e.preventDefault();
    if (addToast) addToast('Product information updated successfully!', 'success');
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Setup' }, { label: 'Product Setup' }]} />
      <div className="page-title">
        <h1>Product Setup</h1>
      </div>

      <div className="row">
        <div className="col-8">
          <Card title="Product Details">
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Bottle Cap 28mm"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Describe the product variant or inspection criteria..."
                />
              </div>

              <div className="d-flex gap-12 mt-24">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Save Product
                </button>
                <Link to="/setup/references" className="btn btn-outline">
                  <i className="fas fa-images"></i> Manage Reference Images ({referenceImages.length})
                </Link>
              </div>
            </form>
          </Card>
        </div>

        <div className="col-4">
          <ModelStatusCard />
        </div>
      </div>
    </div>
  );
}
