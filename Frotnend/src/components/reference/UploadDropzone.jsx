import { useState, useRef } from 'react';

export default function UploadDropzone({ onUpload }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    // Mock: just call onUpload
    if (onUpload) onUpload();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <div
      className={`dropzone ${dragOver ? 'dragover' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={() => onUpload && onUpload()}
      />
      <i className="fas fa-cloud-upload-alt"></i>
      <p>
        Drag & drop images here, or <span className="browse-link">browse files</span>
      </p>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
        Supports PNG, JPG, BMP — max 30 images
      </p>
    </div>
  );
}
