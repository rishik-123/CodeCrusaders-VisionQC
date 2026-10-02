import { MiniBars } from '../common/UIComponents';
import { COLORS } from '../../utils/helpers';

export default function KPIGrid({ summary }) {
  const kpis = [
    { label: 'Products', value: summary.productCount.toLocaleString(), color: COLORS.primary, icon: 'fas fa-cubes', data: [0, 1, summary.productCount] },
    { label: 'Collections', value: summary.collectionCount.toLocaleString(), color: COLORS.success, icon: 'fas fa-camera', data: [0, summary.collectionCount] },
    { label: 'Images Captured', value: summary.imagesCaptured.toLocaleString(), color: COLORS.warning, icon: 'fas fa-images', data: [0, summary.imagesCaptured] },
    { label: 'Completion Rate', value: `${summary.completionRate}%`, color: COLORS.danger, icon: 'fas fa-check-circle', data: [0, summary.completionRate] },
  ];

  return (
    <div className="row">
      {kpis.map((k) => (
        <div className="col-3" key={k.label}>
          <div className="stat-card">
            <div className="stat-top">
              <MiniBars data={k.data} color={k.color} width={100} height={30} />
              <span className="stat-badge" style={{ background: k.color }}>Database</span>
            </div>
            <div className="stat-body" style={{ color: k.color }}>
              <div className="stat-sub">All time</div>
              <div className="stat-title">{k.label}</div>
              <div className="stat-value">{k.value}</div>
              <i className={`${k.icon} stat-icon`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
