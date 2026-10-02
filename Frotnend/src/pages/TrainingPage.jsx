import Breadcrumbs from '../components/layout/Breadcrumbs';
import TrainingPanel from '../components/training/TrainingPanel';

export default function TrainingPage({ addToast }) {
  const handleComplete = () => {
    if (addToast) addToast('Model training completed successfully! Status set to Ready.', 'success');
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Setup', path: '/setup' }, { label: 'Learn Normal (Training)' }]} />
      <div className="page-title">
        <h1>Learn Normal (Model Training)</h1>
      </div>

      <TrainingPanel onComplete={handleComplete} />
    </div>
  );
}
