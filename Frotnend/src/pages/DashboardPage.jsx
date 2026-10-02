import { useEffect, useState } from 'react';
import Breadcrumbs from '../components/layout/Breadcrumbs';
import KPIGrid from '../components/dashboard/KPIGrid';
import InspectionTrendChart from '../components/dashboard/InspectionTrendChart';
import RejectionRateChart from '../components/dashboard/RejectionRateChart';
import RecentInspections from '../components/dashboard/RecentInspections';
import FailureSummary from '../components/dashboard/FailureSummary';
import { dashboardApi } from '../services/api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    dashboardApi.get()
      .then((result) => { if (active) setData(result); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  if (error) return <><Breadcrumbs title="Dashboard" /><div className="page-body"><div className="empty-state" role="alert">{error}</div></div></>;
  if (!data) return <><Breadcrumbs title="Dashboard" /><div className="page-body"><p role="status">Loading dashboard data…</p></div></>;

  const pageStats = [
    { label: 'Products', value: data.summary.productCount, color: '#4e73df', data: data.dailyCollections.map((item) => item.collections) },
    { label: 'Reference Images', value: data.summary.imagesCaptured, color: '#1cc88a', data: data.dailyCollections.map((item) => item.images) },
  ];

  return (
    <>
      <Breadcrumbs title="Dashboard" stats={pageStats} />
      <div className="page-body">
        <KPIGrid summary={data.summary} />
        <div className="row">
          <div className="col-8"><InspectionTrendChart data={data.dailyCollections} summary={data.summary} /></div>
          <div className="col-4"><RejectionRateChart data={data.collectionStatuses} /></div>
        </div>
        <div className="row">
          <div className="col-8"><RecentInspections collections={data.recentCollections} /></div>
          <div className="col-4"><FailureSummary productTypes={data.productTypes} /></div>
        </div>
      </div>
    </>
  );
}
