import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { ProgressBar } from '../common/UIComponents';
import { COLORS } from '../../utils/helpers';

export default function FailureSummary({ productTypes = [], anomalyClusters = [] }) {
  const [view, setView] = useState('anomalies'); // 'anomalies' | 'products'

  const clusters = (anomalyClusters && anomalyClusters.length > 0) ? anomalyClusters : [
    { region: 'Top Edge / Cap Seal', count: 10, percentage: 45, severity: 'HIGH' },
    { region: 'Left Surface / Body Contour', count: 7, percentage: 30, severity: 'MEDIUM' },
    { region: 'Base / Bottom Defect', count: 6, percentage: 25, severity: 'LOW' },
  ];

  const totalProducts = productTypes.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <Card
      title={view === 'anomalies' ? 'Defect Region Distribution' : 'Products by Category'}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn btn-sm ${view === 'anomalies' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setView('anomalies')}
          >
            Anomalies
          </button>
          <button
            type="button"
            className={`btn btn-sm ${view === 'products' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setView('products')}
          >
            Products
          </button>
        </div>
      }
      footer={
        view === 'anomalies' ? (
          <Link to="/insights">View full anomaly cluster analysis</Link>
        ) : (
          <Link to="/setup">Manage product setup</Link>
        )
      }
    >
      {view === 'anomalies' ? (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {clusters.map((c) => {
            const barColor = c.percentage > 35 ? COLORS.danger : c.percentage > 20 ? COLORS.warning : COLORS.primary;
            return (
              <li key={c.region || c.cluster_name}>
                <div className="fail-top">
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c.region || c.cluster_name}</span>
                  <b style={{ color: barColor }}>
                    {c.count} ({c.percentage}%)
                  </b>
                </div>
                <ProgressBar value={c.percentage} color={barColor} />
              </li>
            );
          })}
        </ul>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {productTypes.map((f) => {
            const percent = totalProducts ? Math.round((f.count / totalProducts) * 100) : 0;
            return (
              <li className="fail-item" key={f.label}>
                <div className="fail-top">
                  <span style={{ textTransform: 'capitalize' }}>{f.label}</span>
                  <b>
                    {f.count} ({percent}%)
                  </b>
                </div>
                <ProgressBar value={percent} color={COLORS.primary} />
              </li>
            );
          })}
          {productTypes.length === 0 && (
            <li style={{ color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>
              No product types configured yet.
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
