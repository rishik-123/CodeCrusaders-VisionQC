import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { dashboardStats, sparklines } from '../../data/mockData';

const items = [
  {
    label: 'Total Inspections',
    value: dashboardStats.totalInspections,
    data: sparklines.totalInspections.map((v, i) => ({ v })),
    color: '#2f80ed',
  },
  {
    label: 'Passed',
    value: dashboardStats.passed,
    data: sparklines.passed.map((v) => ({ v })),
    color: '#2ecc71',
  },
  {
    label: 'Failed',
    value: dashboardStats.failed,
    data: sparklines.failed.map((v) => ({ v })),
    color: '#e74c3c',
  },
  {
    label: 'Rejection Rate',
    value: `${dashboardStats.rejectionRate}%`,
    data: sparklines.rejectionRate.map((v) => ({ v })),
    color: '#f5a623',
  },
  {
    label: 'Avg Anomaly Score',
    value: dashboardStats.avgAnomalyScore,
    data: sparklines.avgScore.map((v) => ({ v })),
    color: '#3cb8e6',
  },
];

export default function InfoStrip() {
  return (
    <div className="info-strip">
      {items.map((item) => (
        <div key={item.label} className="info-strip-item">
          <div className="sparkline-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={item.data}>
                <defs>
                  <linearGradient id={`g-${item.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={item.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={item.color}
                  strokeWidth={2}
                  fill={`url(#g-${item.label})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div className="info-strip-value">{item.value}</div>
            <div className="info-strip-label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
