import { Sparkline } from '../common/UIComponents';
import { summary } from '../../data/mockData';

export default function InfoStrip() {
  return (
    <section className="info-strip" aria-label="Information summary">
      {summary.map((s) => (
        <div className="info-item" key={s.label}>
          <Sparkline data={s.data} color={s.color} />
          <div>
            <div className="info-label">{s.label}</div>
            <div className="info-value">{s.value}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
