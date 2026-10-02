import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '../common/Card';
import { Badge, ProgressBar } from '../common/UIComponents';
import { trendData, driftData, failureRegions } from '../../data/mockData';

export function QualityTrendCard() {
  return (
    <Card title="Quality Trend (7 Days)">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9aa3b2' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9aa3b2' }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 4, fontSize: 12 }}
              formatter={(val) => [`${val}%`, 'Rejection Rate']}
            />
            <Line type="monotone" dataKey="rate" name="Rejection Rate" stroke="#e74c3c" strokeWidth={2} dot={{ r: 4, fill: '#e74c3c' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function DriftIndicator() {
  const isWarning = driftData.status === 'warning' || driftData.status === 'critical';

  return (
    <Card title="Quality Drift Indicator">
      <div className="drift-card">
        <div className="drift-value">
          <div className="number">{driftData.yesterday}%</div>
          <div className="label">Yesterday</div>
        </div>

        <div className={`drift-arrow ${driftData.direction}`}>
          <i className={`fas fa-arrow-${driftData.direction}`}></i>
        </div>

        <div className="drift-value">
          <div className="number">{driftData.today}%</div>
          <div className="label">Today</div>
        </div>

        {isWarning && (
          <Badge type={driftData.status === 'critical' ? 'fail' : 'training'}>
            Drift Detected
          </Badge>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 8 }}>
        {driftData.message}
      </p>
    </Card>
  );
}

export function FailureRegionSummary() {
  return (
    <Card title="Failure Region Summary">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {failureRegions.map((fr) => (
          <div key={fr.region}>
            <div className="d-flex justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{fr.region}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {fr.count} failures ({fr.percentage}%)
              </span>
            </div>
            <ProgressBar
              value={fr.percentage}
              max={100}
              color={fr.percentage > 25 ? 'red' : fr.percentage > 15 ? 'orange' : ''}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AnomalyClusterCard() {
  return (
    <Card title="Anomaly Cluster Analysis">
      <div style={{ padding: '8px 0' }}>
        <div className="d-flex align-center gap-12 mb-16">
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(231,76,60,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--danger)', fontSize: 18,
          }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--heading)' }}>
              Pattern Detected
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Cluster of similar anomalies found
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
          Several failed products show abnormalities in a similar region (Top Edge).
          This cluster suggests a systematic issue, possibly related to the die-cutting
          alignment. Consider checking the manufacturing line setup.
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12 }}>
            <strong>Cluster Size:</strong> 8 inspections
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12 }}>
            <strong>Affected Region:</strong> Top Edge
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12 }}>
            <strong>Avg Score:</strong> 0.78
          </div>
        </div>
      </div>
    </Card>
  );
}
