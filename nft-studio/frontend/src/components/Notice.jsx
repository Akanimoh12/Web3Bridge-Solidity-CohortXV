export default function Notice({ tone = 'info', children, onDismiss }) {
  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <p className="notice__text">{children}</p>
      {onDismiss && (
        <button
          type="button"
          className="notice__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  )
}
