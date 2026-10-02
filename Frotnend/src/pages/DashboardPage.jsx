import Breadcrumbs from '../components/layout/Breadcrumbs';
import KPIGrid from '../components/dashboard/KPIGrid';
import InspectionTrendChart from '../components/dashboard/InspectionTrendChart';
import RejectionRateChart from '../components/dashboard/RejectionRateChart';
import RecentInspections from '../components/dashboard/RecentInspections';
import FailureSummary from '../components/dashboard/FailureSummary';
import { pageStats } from '../data/mockData';

export default function DashboardPage() {
  return (
    <>
      <Breadcrumbs title="Dashboard" stats={pageStats} />
      <div className="page-body">
        <KPIGrid />
        <div className="row">
          <div className="col-8"><InspectionTrendChart /></div>
          <div className="col-4"><RejectionRateChart /></div>
        </div>
        <div className="row">
          <div className="col-8"><RecentInspections /></div>
          <div className="col-4"><FailureSummary /></div>
        </div>
      </div>
    </>
  );
}
