import { useState } from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import UploadDropzone from '../components/reference/UploadDropzone';
import ImageGrid from '../components/reference/ImageGrid';
import { referenceImages as initialImages } from '../data/mockData';

export default function ReferenceImagesPage({ addToast }) {
  const [images, setImages] = useState(initialImages);
  const [cameraModal, setCameraModal] = useState(false);

  const handleUpload = () => {
    const newImg = {
      id: images.length + 1,
      url: `https://picsum.photos/seed/newref${Date.now()}/300/300`,
      valid: true,
      uploadedAt: new Date().toISOString(),
    };
    setImages((prev) => [...prev, newImg]);
    if (addToast) addToast('Reference image added successfully!', 'success');
  };

  const handleDelete = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (addToast) addToast('Reference image removed.', 'info');
  };

  const handleCameraCapture = () => {
    handleUpload();
    setCameraModal(false);
    if (addToast) addToast('Captured photo added to reference dataset!', 'success');
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Setup', path: '/setup' }, { label: 'Reference Images' }]} />
      <div className="page-title">
        <h1>Reference Images</h1>
        <div className="d-flex gap-12">
          <button className="btn btn-outline" onClick={() => setCameraModal(true)}>
            <i className="fas fa-camera"></i> Camera Capture
          </button>
          <Link
            to="/setup/training"
            className={`btn btn-primary ${images.length < 20 ? 'disabled' : ''}`}
            style={images.length < 20 ? { pointerEvents: 'none', opacity: 0.55 } : {}}
          >
            <i className="fas fa-brain"></i> Learn Normal ({images.length}/20 min)
          </Link>
        </div>
      </div>

      <div className="row mb-24">
        <div className="col-12">
          <Card title="Upload Normal / Good Product Samples">
            <UploadDropzone onUpload={handleUpload} />
          </Card>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <ImageGrid images={images} onDelete={handleDelete} />
        </div>
      </div>

      {cameraModal && (
        <Modal
          title="Camera Image Capture"
          onClose={() => setCameraModal(false)}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setCameraModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleCameraCapture}>
                <i className="fas fa-camera"></i> Snap & Save
              </button>
            </>
          }
        >
          <div className="text-center" style={{ padding: '20px 0' }}>
            <div
              style={{
                width: '100%',
                height: 280,
                background: '#111',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <i className="fas fa-video" style={{ fontSize: 40, opacity: 0.7 }}></i>
              <span style={{ fontSize: 13, color: '#aaa' }}>Live Camera Feed (Mock)</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
