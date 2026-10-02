import Breadcrumbs from '../components/layout/Breadcrumbs';
import ChatPanel from '../components/copilot/ChatPanel';

export default function AICopilotPage() {
  return (
    <>
      <Breadcrumbs title="AI Copilot" />
      <div className="page-body"><ChatPanel /></div>
    </>
  );
}
