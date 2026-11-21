import { Printer } from 'lucide-react';

export default function Logo({ light = false }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark">
        <Printer size={18} strokeWidth={2.4} />
      </span>
      <span className="logo-text">
        Print<b>Flow</b>
      </span>
    </div>
  );
}
