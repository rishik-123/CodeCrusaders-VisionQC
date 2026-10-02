import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="breadcrumbs">
      <Link to="/dashboard">Dashboard</Link>
      {items.map((item, idx) => (
        <span key={idx}>
          <span className="sep"><i className="fas fa-chevron-right"></i></span>
          {idx === items.length - 1 ? (
            <span className="current">{item.label}</span>
          ) : (
            <Link to={item.path}>{item.label}</Link>
          )}
        </span>
      ))}
    </div>
  );
}
