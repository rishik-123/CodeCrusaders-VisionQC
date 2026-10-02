import Breadcrumbs from '../components/layout/Breadcrumbs';
import InspectionHistoryTable from '../components/history/InspectionHistoryTable';

export default function InspectionHistoryPage() {
  return (
    <>
      <Breadcrumbs title="Inspection History" trail={['Inspection']} />
      <div className="page-body">
        <InspectionHistoryTable />
      </div>
    </>
  );
}
