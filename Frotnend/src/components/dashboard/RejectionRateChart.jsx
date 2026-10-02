import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../common/Card';
import { COLORS } from '../../utils/helpers';

export default function RejectionRateChart({ data }) {
  const chartData = [{
    period: 'Collections',
    completed: data.find((item) => item.status === 'COMPLETE')?.count || 0,
    inProgress: data.find((item) => item.status === 'IN_PROGRESS')?.count || 0,
    cancelled: data.find((item) => item.status === 'CANCELLED')?.count || 0,
  }];
  return (
    <Card title="Collection Status">
      <div style={{ height: 330 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="completed" name="Complete" stackId="status" fill={COLORS.success} />
            <Bar dataKey="inProgress" name="In progress" stackId="status" fill={COLORS.primary} />
            <Bar dataKey="cancelled" name="Cancelled" stackId="status" fill={COLORS.danger} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
