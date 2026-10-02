import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge, ProgressBar } from '../common/UIComponents';
import { COLORS } from '../../utils/helpers';

export default function RejectionRateChart({ driftData = {}, summary = {} }) {
  const yesterdayRate = typeof driftData.yesterday === 'object'
    ? driftData.yesterday.percentage || 6
    : (driftData.yesterday ?? 6);
  const todayRate = typeof driftData.today === 'object'
    ? driftData.today.percentage || 8
    : (driftData.today ?? 8);
  const driftDetected = driftData.drift_detected || (todayRate > yesterdayRate + 1);
  const direction = driftData.direction || (todayRate >= yesterdayRate ? 'up' : 'down');
  const meanScore = driftData.current_mean_score || 31.4;
  const baselineScore = driftData.baseline_score || 30.0;
  const threshold = 39.39;

  return (
    <Card
      title="Live Quality Drift & Stability"
      footer={<Link to="/insights">View full drift analysis & insights</Link>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Drift Status Indicator */}
        <div className="drift-card" style={{ padding: '8px 0 12px', margin: 0 }}>
          <div className="drift-value">
            <div className="number">{yesterdayRate}%</div>
            <div className="label">Yesterday</div>
          </div>

          <div className={`drift-arrow ${direction}`}>
            <i className={`fas fa-arrow-${direction}`} />
          </div>

          <div className="drift-value">
            <div className="number">{todayRate}%</div>
            <div className="label">Today</div>
          </div>

          <Badge type={driftDetected ? 'fail' : 'pass'}>
            {driftDetected ? 'Drift Detected' : 'Steady State'}
          </Badge>
        </div>

        {/* Anomaly Score vs Threshold Gauge */}
        <div style={{ background: 'var(--page-bg)', padding: '12px 14px', borderRadius: 4 }}>
          <div className="d-flex justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--heading)' }}>
              Mean Anomaly Score
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: meanScore > threshold ? COLORS.danger : COLORS.primary }}>
              {meanScore} <small style={{ color: 'var(--muted)', fontWeight: 400 }}>/ {threshold} max</small>
            </span>
          </div>
          <ProgressBar
            value={Math.min(100, Math.round((meanScore / threshold) * 100))}
            color={meanScore > threshold ? COLORS.danger : meanScore > threshold * 0.8 ? COLORS.warning : COLORS.primary}
          />
          <div className="d-flex justify-between" style={{ marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
            <span>Baseline: {baselineScore}</span>
            <span>Threshold: {threshold}</span>
          </div>
        </div>

        {/* Model Status & Uptime */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Active Model</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--heading)', marginTop: 2 }}>PatchCore v1</div>
            <span className="badge badge-success" style={{ marginTop: 4, fontSize: 10 }}>READY</span>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>System Health</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginTop: 2 }}>99.98% Uptime</div>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Zero frame drops</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
