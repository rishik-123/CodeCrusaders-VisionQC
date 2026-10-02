import Breadcrumbs from '../components/layout/Breadcrumbs';
import InspectionHistoryTable from '../components/history/InspectionHistoryTable';

export default function InspectionHistoryPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Inspection History' }]} />
      <div className="page-title">
        <h1>Inspection History</h1>
      </div>

      <InspectionHistoryTable />
    </div>
  );
}
