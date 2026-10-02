import Card from '../common/Card';
import { ProgressBar } from '../common/UIComponents';
import { failureRegions } from '../../data/mockData';

export default function FailureSummary() {
  return (
    <Card title="Failure Summary by Region">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {failureRegions.map((fr) => (
          <div key={fr.region}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#5a6272' }}>{fr.region}</span>
              <span style={{ fontSize: 12, color: '#9aa3b2' }}>
                {fr.count} ({fr.percentage}%)
              </span>
            </div>
            <ProgressBar
              value={fr.percentage}
              max={100}
              color={fr.percentage > 25 ? 'red' : fr.percentage > 15 ? 'orange' : ''}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
