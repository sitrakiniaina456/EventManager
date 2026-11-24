import "./Modal.css";

function Modal({ title, subtitle, onClose, children, size = "medium" }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <section
        className={`app-modal app-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="app-modal-header">
          <div className="app-modal-heading">
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="app-modal-close"
            onClick={onClose}
            aria-label="Fermer la fenêtre"
          >
            ×
          </button>
        </header>

        <div className="app-modal-body">{children}</div>
      </section>
    </div>
  );
}

export default Modal;
