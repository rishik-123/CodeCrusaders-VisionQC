import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge, ProgressBar } from '../common/UIComponents';
import { product, referenceImages, trainingLogs } from '../../data/mockData';

export default function TrainingPanel({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | training | complete
  const [elapsed, setElapsed] = useState(0);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const logRef = useRef();
  const timerRef = useRef();

  const startTraining = () => {
    setStatus('training');
    setProgress(0);
    setElapsed(0);
    setVisibleLogs([]);

    let p = 0;
    let t = 0;
    let logIndex = 0;

    timerRef.current = setInterval(() => {
      p += Math.random() * 4 + 1;
      t += 1;

      if (logIndex < trainingLogs.length && p > (logIndex + 1) * 10) {
        setVisibleLogs((prev) => [...prev, trainingLogs[logIndex]]);
        logIndex++;
      }

      setElapsed(t);

      if (p >= 100) {
        p = 100;
        setProgress(100);
        clearInterval(timerRef.current);
        // Add remaining logs
        setVisibleLogs([...trainingLogs]);
        setTimeout(() => {
          setStatus('complete');
          if (onComplete) onComplete();
        }, 500);
        return;
      }

      setProgress(Math.min(p, 99));
    }, 400);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Training Summary */}
      <Card title="Training Summary">
        <div className="row">
          <div className="col-4">
            <div className="d-flex align-center gap-8 mb-8">
              <i className="fas fa-box" style={{ color: 'var(--primary)' }}></i>
              <span style={{ fontSize: 13 }}>Product</span>
            </div>
            <strong>{product.name}</strong>
          </div>
          <div className="col-4">
            <div className="d-flex align-center gap-8 mb-8">
              <i className="fas fa-images" style={{ color: 'var(--primary)' }}></i>
              <span style={{ fontSize: 13 }}>Reference Images</span>
            </div>
            <strong>{referenceImages.length}</strong>
          </div>
          <div className="col-4">
            <div className="d-flex align-center gap-8 mb-8">
              <i className="fas fa-info-circle" style={{ color: 'var(--primary)' }}></i>
              <span style={{ fontSize: 13 }}>Status</span>
            </div>
            {status === 'complete' ? (
              <Badge type="ready">Ready</Badge>
            ) : status === 'training' ? (
              <Badge type="training">Training</Badge>
            ) : (
              <Badge type="pending">Pending</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Training Progress */}
      <Card title="Training Progress">
        {status === 'idle' && (
          <div className="text-center" style={{ padding: '20px 0' }}>
            <p style={{ marginBottom: 16, color: 'var(--text)' }}>
              Ready to train the anomaly detection model with {referenceImages.length} reference images.
            </p>
            <button className="btn btn-primary btn-lg" onClick={startTraining}>
              <i className="fas fa-play"></i> Start Training
            </button>
          </div>
        )}

        {(status === 'training' || status === 'complete') && (
          <div>
            <div className="d-flex justify-between align-center mb-8">
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {status === 'complete' ? 'Training Complete' : 'Training in Progress...'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                <i className="fas fa-clock"></i> {formatElapsed(elapsed)}
              </span>
            </div>

            <ProgressBar
              value={progress}
              max={100}
              color={status === 'complete' ? 'green' : ''}
              label
              large
            />

            <div className="mt-16" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {Math.round(progress)}% complete
            </div>
          </div>
        )}
      </Card>

      {/* Training Logs */}
      {(status === 'training' || status === 'complete') && (
        <Card title="Training Logs">
          <div className="training-log" ref={logRef}>
            {visibleLogs.map((log, i) => (
              <div key={i} className="log-line">
                <span className="log-time">[{log.time}]</span>{' '}
                <span className={`log-${log.level.toLowerCase()}`}>[{log.level}]</span>{' '}
                {log.msg}
              </div>
            ))}
            {status === 'training' && (
              <div className="log-line" style={{ opacity: 0.5 }}>
                <span className="log-info">Processing...</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Done → Go to inspection */}
      {status === 'complete' && (
        <Card title="Model Status">
          <div className="text-center" style={{ padding: '16px 0' }}>
            <Badge type="ready" large>Ready</Badge>
            <p style={{ margin: '16px 0', color: 'var(--text)' }}>
              The model has been trained successfully and is ready for inspection.
            </p>
            <Link to="/inspection" className="btn btn-success btn-lg">
              <i className="fas fa-search"></i> Start Inspection
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
