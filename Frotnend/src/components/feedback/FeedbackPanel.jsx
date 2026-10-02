import { useState } from 'react';
import Card from '../common/Card';

export default function FeedbackPanel({ inspection, onSave }) {
  const [feedbackType, setFeedbackType] = useState(inspection?.feedbackType || null);
  const [notes, setNotes] = useState(inspection?.feedbackNotes || '');

  const handleSave = () => {
    if (onSave) onSave({ feedbackType, notes });
  };

  return (
    <Card title="Operator Feedback">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        Was this inspection result correct? Your feedback improves the model.
      </p>

      <div className="d-flex gap-12 mb-16">
        <button
          className={`btn ${feedbackType === 'confirmed' ? 'btn-danger' : 'btn-outline-danger'}`}
          onClick={() => setFeedbackType('confirmed')}
          style={{ flex: 1 }}
        >
          <i className="fas fa-exclamation-triangle"></i> Real Defect
        </button>
        <button
          className={`btn ${feedbackType === 'false_alarm' ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => setFeedbackType('false_alarm')}
          style={{ flex: 1 }}
        >
          <i className="fas fa-check"></i> False Alarm
        </button>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          className="form-control"
          placeholder="Add any notes about this inspection..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        <i className="fas fa-save"></i> Save Feedback
      </button>
    </Card>
  );
}
