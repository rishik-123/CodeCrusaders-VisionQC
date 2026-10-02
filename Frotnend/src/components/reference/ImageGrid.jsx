import { useState } from 'react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { ProgressBar } from '../common/UIComponents';

export default function ImageGrid({ images = [], onDelete }) {
  const [preview, setPreview] = useState(null);
  const count = images.length;

  return (
    <>
      <Card title="Reference Images">
        <div className="d-flex justify-between align-center mb-16">
          <div className="d-flex align-center gap-8">
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {count} / 20 images saved
            </span>
            {count >= 20 ? (
              <span className="badge badge-pass">Sufficient</span>
            ) : (
              <span className="badge badge-pending">Need {20 - count} more</span>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <ProgressBar value={Math.min(100, (count / 20) * 100)} color={count >= 20 ? 'var(--success)' : 'var(--warning)'} />
        </div>

        <p style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 16 }}>
          <i className="fas fa-exclamation-triangle"></i> These are training images, not test images.
        </p>

        <div className="image-grid">
          {images.map((img) => (
            <div key={img.id} className="image-grid-item" onClick={() => setPreview(img)}>
              <img src={img.url} alt={`Reference image ${img.image_number ?? img.id}`} loading="lazy" crossOrigin="use-credentials" />
              {onDelete && (
                <button
                  className="delete-btn"
                  onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                  title="Remove image"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              {img.valid && (
                <span className="valid-badge text-success">
                  <i className="fas fa-check-circle"></i>
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {preview && (
        <Modal title={`Reference Image #${preview.id}`} onClose={() => setPreview(null)}>
          <img
            src={preview.url}
            alt={`Reference ${preview.id}`}
            crossOrigin="use-credentials"
            style={{ width: '100%', borderRadius: 4 }}
          />
          <div className="mt-16" style={{ fontSize: 13, color: 'var(--muted)' }}>
            Captured: {new Date(preview.captured_at || preview.uploadedAt).toLocaleString()}
          </div>
        </Modal>
      )}
    </>
  );
}
