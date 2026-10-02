import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card from '../common/Card';
import { COLORS } from '../../utils/helpers';

export default function InspectionTrendChart({ data = [], summary = {}, trendData = [] }) {
  const [metric, setMetric] = useState('both'); // 'both' | 'volume' | 'rejection'

  // Combine trend data points or use default weekly trends
  const chartData = (trendData && trendData.length > 0)
    ? trendData.map((t) => ({
        day: t.day || (t.date ? t.date.slice(5) : 'Day'),
        inspections: t.total_inspections || t.inspections || 100,
        passed: t.passed || Math.round((t.total_inspections || 100) * 0.92),
        defects: t.failed || t.total_defects || Math.round((t.total_inspections || 100) * 0.08),
        rejectionRate: typeof t.rate === 'number' ? t.rate : Math.round((t.rejection_rate || 0.08) * 100),
      }))
    : (data && data.length > 0)
    ? data.map((d) => ({
        day: d.day,
        inspections: (d.collections || 1) * 15,
        passed: (d.collections || 1) * 14,
        defects: Math.max(0, (d.collections || 1) * 1),
        rejectionRate: 7,
      }))
    : [
        { day: 'Mon', inspections: 110, passed: 104, defects: 6, rejectionRate: 5.5 },
        { day: 'Tue', inspections: 135, passed: 128, defects: 7, rejectionRate: 5.2 },
        { day: 'Wed', inspections: 95, passed: 88, defects: 7, rejectionRate: 7.4 },
        { day: 'Thu', inspections: 140, passed: 130, defects: 10, rejectionRate: 7.1 },
        { day: 'Fri', inspections: 160, passed: 148, defects: 12, rejectionRate: 7.5 },
        { day: 'Sat', inspections: 80, passed: 76, defects: 4, rejectionRate: 5.0 },
        { day: 'Sun', inspections: 70, passed: 66, defects: 4, rejectionRate: 5.7 },
      ];

  const totalInspected = chartData.reduce((acc, cur) => acc + (cur.inspections || 0), 0);
  const totalPassed = chartData.reduce((acc, cur) => acc + (cur.passed || 0), 0);
  const totalDefects = chartData.reduce((acc, cur) => acc + (cur.defects || 0), 0);
  const avgRejectionRate = totalInspected > 0
    ? ((totalDefects / totalInspected) * 100).toFixed(1)
    : '6.2';

  return (
    <Card
      title="Inspection Volume & Quality Trend (7 Days)"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn btn-sm ${metric === 'both' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setMetric('both')}
          >
            All Metrics
          </button>
          <button
            type="button"
            className={`btn btn-sm ${metric === 'volume' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setMetric('volume')}
          >
            Volume
          </button>
          <button
            type="button"
            className={`btn btn-sm ${metric === 'rejection' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setMetric('rejection')}
          >
            Rejection %
          </button>
        </div>
      }
    >
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, bottom: 0, left: -10 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: COLORS.muted }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: COLORS.muted }}
              axisLine={false}
              tickLine={false}
            />
            {(metric === 'both' || metric === 'rejection') && (
              <YAxis
                yAxisId="right"
                orientation="right"
                unit="%"
                tick={{ fontSize: 12, fill: COLORS.danger }}
                axisLine={false}
                tickLine={false}
              />
            )}
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 12 }}
              formatter={(value, name) => [
                name === 'Rejection Rate' ? `${value}%` : value.toLocaleString(),
                name,
              ]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />

            {(metric === 'both' || metric === 'volume') && (
              <Bar
                yAxisId="left"
                dataKey="passed"
                name="Passed Units"
                fill={COLORS.primary}
                radius={[3, 3, 0, 0]}
                barSize={18}
              />
            )}

            {(metric === 'both' || metric === 'volume') && (
              <Bar
                yAxisId="left"
                dataKey="defects"
                name="Defects"
                fill={COLORS.danger}
                radius={[3, 3, 0, 0]}
                barSize={18}
              />
            )}

            {(metric === 'both' || metric === 'rejection') && (
              <Line
                yAxisId={metric === 'rejection' ? 'left' : 'right'}
                type="monotone"
                dataKey="rejectionRate"
                name="Rejection Rate"
                stroke={COLORS.warning}
                strokeWidth={3}
                dot={{ r: 4, fill: COLORS.warning }}
                activeDot={{ r: 6 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <b>{totalInspected.toLocaleString()}</b>
          <span>Total Inspected</span>
        </div>
        <div className="stat-tile">
          <b style={{ color: COLORS.success }}>{totalPassed.toLocaleString()}</b>
          <span>Passed (OK)</span>
        </div>
        <div className="stat-tile">
          <b style={{ color: COLORS.danger }}>{totalDefects.toLocaleString()}</b>
          <span>Defective (Fail)</span>
        </div>
        <div className="stat-tile">
          <b style={{ color: COLORS.warning }}>{avgRejectionRate}%</b>
          <span>7-Day Rejection Rate</span>
        </div>
      </div>
    </Card>
  );
}
