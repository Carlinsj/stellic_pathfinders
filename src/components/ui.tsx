import { X } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { crowdLabel } from '../lib/format';

export function Button({ variant = 'primary', size = 'medium', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'small' | 'medium' | 'large' }) {
  return <button className={`button button--${variant} button--${size} ${className}`} {...props} />;
}

export function StatusPill({ level, children }: { level: string; children?: ReactNode }) {
  return <span className={`status-pill status-pill--${level}`}><span className="status-dot" aria-hidden="true" />{children ?? crowdLabel(level)}</span>;
}

export function DataLabel({ children }: { children: ReactNode }) {
  return <span className="data-label">{children}</span>;
}

export function Metric({ value, label, note }: { value: ReactNode; label: string; note?: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span>{note ? <small>{note}</small> : null}</div>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="progress-wrap" aria-label={`${label}: ${bounded}%`}><div className="progress-track"><span style={{ width: `${bounded}%` }} /></div><span>{label}</span></div>;
}

export function Modal({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined}>
      <div className="modal-handle" aria-hidden="true" />
      <div className="modal-heading"><div><DataLabel>CampusFit action</DataLabel><h2 id="modal-title">{title}</h2>{description ? <p id="modal-description">{description}</p> : null}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
      {children}
    </section>
  </div>;
}

export function SegmentedControl({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; label: string }) {
  return <fieldset className="segmented-field"><legend className="sr-only">{label}</legend><div className="segmented-control">{options.map((option) => <button type="button" aria-pressed={value === option.value} className={value === option.value ? 'is-active' : ''} onClick={() => onChange(option.value)} key={option.value}>{option.label}</button>)}</div></fieldset>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-orbit" aria-hidden="true"><span /></div><h3>{title}</h3><p>{body}</p>{action}</div>;
}
