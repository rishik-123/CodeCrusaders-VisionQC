import { Link } from 'react-router-dom';

export default function InfoStrip() {
  const actions = [
    {
      title: 'Live Product Inspection',
      desc: 'Real-time camera feed & defect heatmap',
      icon: 'fas fa-camera',
      path: '/inspection',
      color: '#2bb3c0',
      badge: 'ML Active',
    },
    {
      title: 'Reference Images',
      desc: 'Capture normal 20-image baseline dataset',
      icon: 'fas fa-images',
      path: '/setup/references',
      color: '#009378',
      badge: '20 Samples',
    },
    {
      title: 'Model Training',
      desc: 'Train PatchCore anomaly detection model',
      icon: 'fas fa-brain',
      path: '/setup/training',
      color: '#e16123',
      badge: 'Ready',
    },
    {
      title: 'AI Quality Copilot',
      desc: 'Instant QA insights & drift diagnostics',
      icon: 'fas fa-robot',
      path: '/copilot',
      color: '#3498db',
      badge: 'Qwen3:8b',
    },
  ];

  return (
    <div className="row" style={{ marginBottom: 25 }}>
      {actions.map((act) => (
        <div className="col-3" key={act.title}>
          <Link
            to={act.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '16px 18px',
              background: '#fff',
              borderRadius: 4,
              boxShadow: '0 0 10px rgba(0,0,0,0.06)',
              borderLeft: `4px solid ${act.color}`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              color: 'inherit',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,0,0,0.06)';
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `${act.color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: act.color,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              <i className={act.icon} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.title}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: `${act.color}20`, color: act.color }}>
                  {act.badge}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {act.desc}
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
