import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '../common/Card';
import { Badge, ProgressBar } from '../common/UIComponents';
import { insightsApi } from '../../services/api';
import { trendData as defaultTrend, driftData as defaultDrift, failureRegions as defaultFailureRegions } from '../../data/mockData';

export function QualityTrendCard() {
  const [trends, setTrends] = useState(defaultTrend);

  useEffect(() => {
    insightsApi.getTrends()
      .then((res) => {
        const rawTrends = res.trends || res.data?.trends;
        if (Array.isArray(rawTrends) && rawTrends.length > 0) {
          setTrends(rawTrends.map((t) => ({
            day: t.date ? t.date.slice(5) : (t.day || 'Mon'),
            rate: typeof t.rate === 'number' ? t.rate : Math.round((t.rejection_rate || 0) * 100),
            inspections: t.total_inspections || t.inspections || 100,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Card title="Quality Trend (7 Days)">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trends}>
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
  const [drift, setDrift] = useState(defaultDrift);

  useEffect(() => {
    insightsApi.getDrift()
      .then((res) => {
        if (res) {
          const payload = res.data || res;
          const yRate = payload.yesterday ? (typeof payload.yesterday === 'object' ? Math.round((payload.yesterday.rejection_rate || 0) * 100) : payload.yesterday) : defaultDrift.yesterday;
          const tRate = payload.today ? (typeof payload.today === 'object' ? Math.round((payload.today.rejection_rate || 0) * 100) : payload.today) : defaultDrift.today;
          setDrift({
            yesterday: yRate,
            today: tRate,
            direction: payload.direction || (tRate >= yRate ? 'up' : 'down'),
            status: payload.drift_status || (tRate > yRate ? 'warning' : 'normal'),
            message: payload.recommendation || payload.message || (tRate > yRate ? 'Rejection rate increased compared to yesterday.' : 'Quality metrics within steady-state tolerances.'),
          });
        }
      })
      .catch(() => {});
  }, []);

  const isWarning = drift.status === 'warning' || drift.status === 'critical' || drift.status === 'DRIFT_DETECTED';

  return (
    <Card title="Quality Drift Indicator">
      <div className="drift-card">
        <div className="drift-value">
          <div className="number">{drift.yesterday}%</div>
          <div className="label">Yesterday</div>
        </div>

        <div className={`drift-arrow ${drift.direction}`}>
          <i className={`fas fa-arrow-${drift.direction}`}></i>
        </div>

        <div className="drift-value">
          <div className="number">{drift.today}%</div>
          <div className="label">Today</div>
        </div>

        {isWarning && (
          <Badge type={drift.status === 'critical' ? 'fail' : 'training'}>
            Drift Detected
          </Badge>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 8 }}>
        {drift.message}
      </p>
    </Card>
  );
}

export function FailureRegionSummary() {
  const [regions, setRegions] = useState(defaultFailureRegions);

  useEffect(() => {
    insightsApi.getAnomalies()
      .then((res) => {
        const rawClusters = res.clusters || res.data?.clusters;
        if (Array.isArray(rawClusters) && rawClusters.length > 0) {
          setRegions(rawClusters.map((c) => ({
            region: c.region || c.cluster_name || 'Surface',
            count: c.count || c.size || 5,
            percentage: typeof c.percentage === 'number' ? c.percentage : Math.round(((c.count || 5) / (res.total_defects || 10)) * 100),
          })));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <Card title="Failure Region Summary">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {regions.map((fr) => (
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
              color={fr.percentage > 25 ? '#e74c3c' : fr.percentage > 15 ? '#e16123' : 'var(--primary)'}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AnomalyClusterCard() {
  const [clusterInfo, setClusterInfo] = useState({
    size: 8,
    region: 'Top Edge',
    avgScore: 0.78,
    description: 'Several failed products show abnormalities in a similar region. This cluster suggests a systematic issue on the production line.',
  });

  useEffect(() => {
    insightsApi.getAnomalies()
      .then((res) => {
        const rawClusters = res.clusters || res.data?.clusters;
        if (Array.isArray(rawClusters) && rawClusters.length > 0) {
          const top = rawClusters[0];
          setClusterInfo({
            size: top.count || top.size || 8,
            region: top.region || top.cluster_name || 'Top Edge / Surface',
            avgScore: top.average_anomaly_score ? Number(top.average_anomaly_score.toFixed(2)) : 0.78,
            description: top.description || 'Systematic defect pattern detected across recent inspection samples.',
          });
        }
      })
      .catch(() => {});
  }, []);

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
          {clusterInfo.description}
        </p>
        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12 }}>
            <strong>Cluster Size:</strong> {clusterInfo.size} inspections
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12 }}>
            <strong>Affected Region:</strong> {clusterInfo.region}
          </div>
          <div style={{ padding: '8px 12px', background: 'var(--page-bg)', borderRadius: 4, fontSize: 12 }}>
            <strong>Avg Score:</strong> {clusterInfo.avgScore}
          </div>
        </div>
      </div>
    </Card>
  );
}

