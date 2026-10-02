export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'error':   return 'fa-exclamation-circle';
      case 'warning': return 'fa-exclamation-triangle';
      default:        return 'fa-info-circle';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`fas ${getIcon(t.type)}`}></i>
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => onRemove(t.id)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
