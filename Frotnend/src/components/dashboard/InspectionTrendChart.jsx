import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Card from '../common/Card';
import { trendData } from '../../data/mockData';

export default function InspectionTrendChart() {
  return (
    <Card title="Inspection Trend (7 Days)">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="trendPassed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ecc71" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2ecc71" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="trendFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e74c3c" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#e74c3c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9aa3b2' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#9aa3b2' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e9ecef',
                borderRadius: 4,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="passed" name="Passed" stroke="#2ecc71" strokeWidth={2} fill="url(#trendPassed)" dot={{ r: 3, fill: '#2ecc71' }} />
            <Area type="monotone" dataKey="failed" name="Failed" stroke="#e74c3c" strokeWidth={2} fill="url(#trendFailed)" dot={{ r: 3, fill: '#e74c3c' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
