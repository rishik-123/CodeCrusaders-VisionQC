import Breadcrumbs from '../components/layout/Breadcrumbs';
import InspectionPanel from '../components/inspection/InspectionPanel';

export default function LiveInspectionPage() {
  return (
    <>
      <Breadcrumbs title="Live Product Inspection" trail={['Inspection']} />
      <div className="page-body">
        <InspectionPanel />
      </div>
    </>
  );
}
