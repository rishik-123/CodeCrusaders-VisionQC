import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { ProgressBar } from '../common/UIComponents';
import { failureRegions } from '../../data/mockData';
import { COLORS } from '../../utils/helpers';

export default function FailureSummary() {
  return (
    <Card title="Failure Summary" footer={<Link to="/insights">View All</Link>}>
      <ul>
        {failureRegions.map((f) => (
          <li className="fail-item" key={f.label}>
            <div className="fail-top">
              <span>{f.label}</span>
              <b>{f.percent}%</b>
            </div>
            <ProgressBar value={f.percent} color={COLORS.primary} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
