import "./ConfirmModal.css";

export default function ConfirmModal({ open, title, body, confirmLabel="Confirm", cancelLabel="Cancel", danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card animate-fadeUp" onClick={e => e.stopPropagation()}>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-body">{body}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary confirm-cancel" onClick={onCancel}>{cancelLabel}</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"} confirm-ok`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
