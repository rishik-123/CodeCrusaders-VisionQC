import { MiniBars } from '../common/UIComponents';

// Page-title band: title + breadcrumb on the left, optional bar-chart stats on the right
export default function Breadcrumbs({ title, trail = [], stats = [] }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <div className="crumbs">{[...trail, title].join(' / ')}</div>
      </div>

      {stats.length > 0 && (
        <div className="page-stats">
          {stats.map((s) => (
            <div className="page-stat" key={s.label}>
              <div>
                <div className="page-stat-label">{s.label}</div>
                <div className="page-stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
              <MiniBars data={s.data} color={s.color} width={70} height={38} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
