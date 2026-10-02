import { MiniBars } from '../common/UIComponents';

// Page-title band: title + breadcrumb on the left, optional bar-chart stats on the right
export default function Breadcrumbs({ title, trail = [], items, stats = [] }) {
  let displayTitle = title;
  let displayTrail = [...trail];

  if (items && Array.isArray(items) && items.length > 0) {
    if (!displayTitle) {
      const lastItem = items[items.length - 1];
      displayTitle = typeof lastItem === 'object' ? lastItem.label : lastItem;
      displayTrail = items.slice(0, -1).map((i) => (typeof i === 'object' ? i.label : i));
    }
  }

  const crumbsList = [...displayTrail, displayTitle].filter(Boolean);

  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{displayTitle}</h1>
        {crumbsList.length > 0 && <div className="crumbs">{crumbsList.join(' / ')}</div>}
      </div>

      {stats && stats.length > 0 && (
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
