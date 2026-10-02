import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { Badge } from '../common/UIComponents';

export default function RecentInspections({ collections }) {
  return (
    <Card title="Recent Reference Collections" flush>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Product</th>
              <th>Images</th>
              <th>Result</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((collection) => {
              const statusType = collection.status === 'COMPLETE' ? 'success' : collection.status === 'CANCELLED' ? 'danger' : 'primary';
              return (
                <tr key={collection.id}>
                  <td title={collection.id}>{collection.id.slice(0, 8)}</td>
                  <td>{collection.product_name}</td>
                  <td>{collection.captured_images}/{collection.total_images}</td>
                  <td><Badge type={statusType}>{collection.status.replace('_', ' ')}</Badge></td>
                  <td>{new Date(`${collection.created_at.replace(' ', 'T')}Z`).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {collections.length === 0 && <tr><td colSpan="5">No reference collections have been saved yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card-footer"><Link to="/setup/references">Open reference image collection</Link></div>
    </Card>
  );
}
