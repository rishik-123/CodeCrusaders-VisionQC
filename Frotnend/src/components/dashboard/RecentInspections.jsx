import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge } from '../common/UIComponents';
import { recentInspections } from '../../data/mockData';

export default function RecentInspections() {
  return (
    <Card title="Recent Inspections" flush>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Inspection ID</th>
              <th>Product</th>
              <th>Score</th>
              <th>Threshold</th>
              <th>Result</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recentInspections.map((r) => {
              const fail = r.score > r.threshold;
              return (
                <tr key={r.id}>
                  <td><div className="thumb"><i className="far fa-image" /></div></td>
                  <td>{r.id}</td>
                  <td>{r.product}</td>
                  <td>{r.score.toFixed(2)}</td>
                  <td>{r.threshold.toFixed(2)}</td>
                  <td><Badge type={fail ? 'danger' : 'success'}>{fail ? 'FAIL' : 'PASS'}</Badge></td>
                  <td><Link to={`/inspection/${r.id}`}>View</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
