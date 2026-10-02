import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import Card from '../common/Card';
import { trendData } from '../../data/mockData';

export default function RejectionRateChart() {
  return (
    <Card title="Rejection Rate (%)">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9aa3b2' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9aa3b2' }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e9ecef',
                borderRadius: 4,
                fontSize: 12,
              }}
              formatter={(val) => [`${val}%`, 'Rejection Rate']}
            />
            <Bar dataKey="rate" name="Rejection Rate" fill="#f5a623" radius={[4, 4, 0, 0]} barSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
