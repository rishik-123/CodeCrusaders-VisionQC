import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { inspections } from '../../data/mockData';
import { formatTime } from '../../utils/helpers';

export default function RecentInspections() {
  const recent = inspections.slice(0, 8);

  return (
    <Card title="Recent Inspections">
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Product</th>
              <th>Score</th>
              <th>Threshold</th>
              <th>Result</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recent.map((ins) => (
              <tr key={ins.id}>
                <td>{formatTime(ins.time)}</td>
                <td>{ins.product}</td>
                <td>{ins.score}</td>
                <td>{ins.threshold}</td>
                <td>
                  <span className={`badge ${ins.result === 'PASS' ? 'badge-pass' : 'badge-fail'}`}>
                    {ins.result}
                  </span>
                </td>
                <td>
                  <Link to={`/inspection/${ins.id}`} className="btn btn-sm btn-outline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
