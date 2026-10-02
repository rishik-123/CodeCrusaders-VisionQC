import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { dashboardStats, sparklines } from '../../data/mockData';

const kpis = [
  {
    title: 'Total Inspections',
    value: dashboardStats.totalInspections,
    change: '+12%',
    changeDir: 'up',
    icon: 'fa-clipboard-list',
    bg: '#2f80ed',
    data: sparklines.totalInspections.map((v) => ({ v })),
    color: '#2f80ed',
  },
  {
    title: 'Passed',
    value: dashboardStats.passed,
    change: '+10%',
    changeDir: 'up',
    icon: 'fa-check-circle',
    bg: '#2ecc71',
    data: sparklines.passed.map((v) => ({ v })),
    color: '#2ecc71',
  },
  {
    title: 'Failed',
    value: dashboardStats.failed,
    change: '+18%',
    changeDir: 'up',
    icon: 'fa-times-circle',
    bg: '#e74c3c',
    data: sparklines.failed.map((v) => ({ v })),
    color: '#e74c3c',
  },
  {
    title: 'Rejection Rate',
    value: `${dashboardStats.rejectionRate}%`,
    change: '-2%',
    changeDir: 'down',
    icon: 'fa-percentage',
    bg: '#f5a623',
    data: sparklines.rejectionRate.map((v) => ({ v })),
    color: '#f5a623',
  },
];

export default function KPIGrid() {
  return (
    <div className="row">
      {kpis.map((kpi) => (
        <div key={kpi.title} className="col-3">
          <div className="card">
            <div className="card-body">
              <div className="kpi-card">
                <div className="kpi-icon" style={{ background: kpi.bg }}>
                  <i className={`fas ${kpi.icon}`}></i>
                </div>
                <div className="kpi-info">
                  <h4>{kpi.value}</h4>
                  <p>{kpi.title}</p>
                  <div className={`kpi-change ${kpi.changeDir === 'up' ? (kpi.title === 'Failed' ? 'down' : 'up') : (kpi.title === 'Failed' ? 'up' : 'down')}`}>
                    <i className={`fas fa-arrow-${kpi.changeDir}`}></i> {kpi.change} monthly
                  </div>
                </div>
              </div>
              <div style={{ height: 40, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.data}>
                    <defs>
                      <linearGradient id={`kpi-${kpi.title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={kpi.color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={kpi.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={kpi.color} strokeWidth={1.5} fill={`url(#kpi-${kpi.title})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
