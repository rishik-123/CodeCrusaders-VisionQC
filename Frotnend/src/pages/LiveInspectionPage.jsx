import Breadcrumbs from '../components/layout/Breadcrumbs';
import InspectionPanel from '../components/inspection/InspectionPanel';

export default function LiveInspectionPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Live Inspection' }]} />
      <div className="page-title">
        <h1>Live Product Inspection</h1>
      </div>

      <InspectionPanel />
    </div>
  );
}
