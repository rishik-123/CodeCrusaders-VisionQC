import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { ProgressBar } from '../common/UIComponents';
import { COLORS } from '../../utils/helpers';

export default function FailureSummary({ productTypes }) {
  const total = productTypes.reduce((sum, item) => sum + item.count, 0);
  return (
    <Card title="Products by Type" footer={<Link to="/setup">Manage products</Link>}>
      <ul>
        {productTypes.map((f) => {
          const percent = total ? Math.round((f.count / total) * 100) : 0;
          return <li className="fail-item" key={f.label}>
            <div className="fail-top">
              <span>{f.label}</span>
              <b>{f.count} ({percent}%)</b>
            </div>
            <ProgressBar value={percent} color={COLORS.primary} />
          </li>
        })}
        {productTypes.length === 0 && <li>No products have been added yet.</li>}
      </ul>
    </Card>
  );
}
