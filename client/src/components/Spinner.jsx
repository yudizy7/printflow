export default function Spinner({ fullscreen = false, label = 'Carregando…' }) {
  return (
    <div className={fullscreen ? 'spinner-fullscreen' : 'spinner-wrap'} role="status">
      <span className="spinner" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
