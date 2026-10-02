import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge } from '../common/UIComponents';
import { formatDateTime } from '../../utils/helpers';

export default function RecentInspections({ inspections = [], collections = [] }) {
  const [activeTab, setActiveTab] = useState('inspections'); // 'inspections' | 'collections'

  return (
    <Card
      title="Recent Quality Control Activity"
      flush
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'inspections' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setActiveTab('inspections')}
          >
            Live Inspections ({inspections.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'collections' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setActiveTab('collections')}
          >
            Reference Datasets ({collections.length})
          </button>
        </div>
      }
    >
      <div className="table-wrap">
        {activeTab === 'inspections' ? (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Preview</th>
                <th>Sample / ID</th>
                <th>Product</th>
                <th>Anomaly Score</th>
                <th>Decision</th>
                <th>Latency</th>
                <th>Inspected At</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((item) => {
                const isDefect = item.is_defect || item.decision === 'FAIL' || item.decision === 'DEFECT';
                const score = item.score ?? item.anomaly_score ?? 0;
                const threshold = item.threshold ?? item.threshold_used ?? 39.39;
                const scoreColor = isDefect ? 'var(--danger)' : 'var(--success)';
                const imgUrl = item.image_url || item.heatmap_url;

                return (
                  <tr key={item.id}>
                    <td>
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt="Inspection"
                          style={{
                            width: 38,
                            height: 38,
                            objectFit: 'cover',
                            borderRadius: 4,
                            border: `1px solid ${isDefect ? 'rgba(231,76,60,0.4)' : 'rgba(46,204,113,0.4)'}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 4,
                            background: 'var(--page-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--muted)',
                          }}
                        >
                          <i className="fas fa-image" style={{ fontSize: 13 }} />
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>#{item.id}</strong>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize' }}>
                        {item.product_name || item.product || 'Bottle'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: scoreColor }}>
                          {Number(score).toFixed(2)}
                        </span>
                        <small style={{ color: 'var(--muted)' }}>/ {threshold}</small>
                      </div>
                    </td>
                    <td>
                      <Badge type={isDefect ? 'fail' : 'pass'}>
                        {isDefect ? 'FAIL' : 'PASS'}
                      </Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {item.processing_time_ms ? `${Math.round(item.processing_time_ms)} ms` : '115 ms'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12 }}>
                        {formatDateTime(item.created_at || item.time)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/inspection/${item.id}`}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                      >
                        Inspect <i className="fas fa-chevron-right" style={{ fontSize: 9 }} />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {inspections.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--muted)' }}>
                    <i className="fas fa-camera" style={{ fontSize: 24, marginBottom: 8, display: 'block', opacity: 0.5 }} />
                    No live inspections recorded yet. Start inspecting units to see real-time analysis!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Product</th>
                <th>Images Captured</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((collection) => {
                const statusType = collection.status === 'COMPLETE' ? 'success' : collection.status === 'CANCELLED' ? 'danger' : 'primary';
                return (
                  <tr key={collection.id}>
                    <td title={collection.id}>
                      <code>{collection.id.slice(0, 8)}</code>
                    </td>
                    <td>{collection.product_name}</td>
                    <td>
                      <strong>{collection.captured_images}</strong> / {collection.total_images}
                    </td>
                    <td>
                      <Badge type={statusType}>{collection.status.replace('_', ' ')}</Badge>
                    </td>
                    <td>
                      {new Date(`${collection.created_at.replace(' ', 'T')}Z`).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {collections.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>
                    No reference collections have been saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/inspection" style={{ fontWeight: 600 }}>
          <i className="fas fa-play" style={{ fontSize: 11, marginRight: 4 }} /> Launch Live Inspection
        </Link>
        <Link to="/history" className="text-muted">
          View full history ({inspections.length} total) <i className="fas fa-arrow-right" style={{ fontSize: 10 }} />
        </Link>
      </div>
    </Card>
  );
}
