import Breadcrumbs from '../components/layout/Breadcrumbs';
import {
  QualityTrendCard,
  DriftIndicator,
  FailureRegionSummary,
  AnomalyClusterCard,
} from '../components/quality/QualityComponents';

export default function QualityInsightsPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Analytics' }, { label: 'Quality Insights' }]} />
      <div className="page-title">
        <h1>Quality Insights & Drift Analysis</h1>
      </div>

      <div className="row">
        <div className="col-8">
          <QualityTrendCard />
        </div>
        <div className="col-4">
          <DriftIndicator />
        </div>
      </div>

      <div className="row">
        <div className="col-6">
          <FailureRegionSummary />
        </div>
        <div className="col-6">
          <AnomalyClusterCard />
        </div>
      </div>
    </div>
  );
}
