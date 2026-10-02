import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../common/Card';
import { COLORS } from '../../utils/helpers';

export default function InspectionTrendChart({ data, summary }) {
  return (
    <Card title="Reference Collection Activity">
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="collections" name="Collections" stroke={COLORS.primary} strokeWidth={2} fill={COLORS.primary} fillOpacity={0.25} />
            <Area type="monotone" dataKey="images" name="Images captured" stroke={COLORS.success} strokeWidth={2} fill={COLORS.success} fillOpacity={0.35} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="stat-tiles">
        <div className="stat-tile"><b>{summary.collectionCount.toLocaleString()}</b><span>Total collections</span></div>
        <div className="stat-tile"><b>{summary.completedCount.toLocaleString()}</b><span>Completed</span></div>
        <div className="stat-tile"><b>{summary.imagesCaptured.toLocaleString()}</b><span>Images captured</span></div>
      </div>
    </Card>
  );
}
