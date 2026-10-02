import Breadcrumbs from '../components/layout/Breadcrumbs';
import ChatPanel from '../components/copilot/ChatPanel';

export default function AICopilotPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Analytics' }, { label: 'AI Copilot' }]} />
      <div className="page-title">
        <h1>AI Quality Copilot</h1>
      </div>

      <ChatPanel />
    </div>
  );
}
