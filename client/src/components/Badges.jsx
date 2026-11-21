import { statusInfo, priorityLabel } from '../lib/constants.js';

export function StatusBadge({ status }) {
  const info = statusInfo(status);
  return (
    <span className="badge" style={{ '--badge-color': info.color }}>
      <span className="badge-dot" />
      {info.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return <span className={`priority priority-${priority}`}>{priorityLabel(priority)}</span>;
}
