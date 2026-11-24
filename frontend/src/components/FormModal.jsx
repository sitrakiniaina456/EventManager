import "./FormModal.css";

function FormModal({ title, description, onClose, children, size = "medium" }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="form-modal-overlay" onMouseDown={handleOverlayClick}>
      <section
        className={`form-modal form-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
      >
        <header className="form-modal-header">
          <div className="form-modal-heading">
            <span className="form-modal-icon">✦</span>

            <div>
              <h2 id="form-modal-title">{title}</h2>

              {description && <p>{description}</p>}
            </div>
          </div>

          <button
            type="button"
            className="form-modal-close"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
            title="Fermer"
          >
            ×
          </button>
        </header>

        <div className="form-modal-body">{children}</div>
      </section>
    </div>
  );
}

export default FormModal;
