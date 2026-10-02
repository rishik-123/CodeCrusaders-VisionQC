import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../common/Card';
import { inspectionTrend, trendStats } from '../../data/mockData';
import { COLORS } from '../../utils/helpers';

export default function InspectionTrendChart() {
  return (
    <Card title="Inspection Trend">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={inspectionTrend} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="passed" name="Passed" stroke={COLORS.success} strokeWidth={2} fill={COLORS.success} fillOpacity={0.5} />
            <Area type="monotone" dataKey="failed" name="Failed" stroke={COLORS.warning} strokeWidth={2} fill={COLORS.warning} fillOpacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="stat-tiles">
        {trendStats.map((s) => (
          <div className="stat-tile" key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
