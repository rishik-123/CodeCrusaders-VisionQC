import Breadcrumbs from '../components/layout/Breadcrumbs';
import TrainingPanel from '../components/training/TrainingPanel';

export default function TrainingPage({ addToast }) {
  const handleComplete = () => {
    if (typeof addToast === 'function') {
      addToast('Model training completed successfully! Status set to Ready.', 'success');
    }
  };

  return (
    <>
      <Breadcrumbs title="Learn Normal (Model Training)" trail={['Setup']} />
      <div className="page-body">
        <TrainingPanel onComplete={handleComplete} />
      </div>
    </>
  );
}
