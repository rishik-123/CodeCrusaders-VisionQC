import { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../common/Card';
import { rejectionThisWeek, rejectionLastWeek } from '../../data/mockData';
import { COLORS } from '../../utils/helpers';

export default function RejectionRateChart() {
  const [week, setWeek] = useState('this');
  const data = week === 'this' ? rejectionThisWeek : rejectionLastWeek;

  return (
    <Card
      title="Rejection Rate"
      actions={
        <select className="select-sm" value={week} onChange={(e) => setWeek(e.target.value)} aria-label="Period">
          <option value="this">This Week</option>
          <option value="last">Last Week</option>
        </select>
      }
    >
      <div style={{ height: 330 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <YAxis unit="%" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [`${v}%`, 'Rejection']} />
            <Bar dataKey="rate" fill={COLORS.danger} radius={[2, 2, 0, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
