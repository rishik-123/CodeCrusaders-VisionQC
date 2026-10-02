import { MiniBars } from '../common/UIComponents';
import { kpis } from '../../data/mockData';

export default function KPIGrid() {
  return (
    <div className="row">
      {kpis.map((k) => (
        <div className="col-3" key={k.label}>
          <div className="stat-card">
            <div className="stat-top">
              <MiniBars data={k.data} color={k.color} width={100} height={30} />
              <span className="stat-badge" style={{ background: k.color }}>
                <i className={`fas fa-long-arrow-alt-${k.up ? 'up' : 'down'}`} />
                {k.change}
              </span>
            </div>
            <div className="stat-body" style={{ color: k.color }}>
              <div className="stat-sub">Monthly</div>
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
