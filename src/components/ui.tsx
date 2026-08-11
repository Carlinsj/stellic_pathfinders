import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { crowdLabel } from '../lib/format';
import type { Forecast } from '../domain/types';
import { approximateExpectedVisitors } from '../services/forecasting';

export function Button({ variant = 'primary', size = 'medium', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'small' | 'medium' | 'large' }) {
  return <button className={`button button--${variant} button--${size} ${className}`} {...props} />;
}

export function StatusPill({ level, children }: { level: string; children?: ReactNode }) {
  return <span className={`status-pill status-pill--${level}`}><span className="status-dot" aria-hidden="true" />{children ?? crowdLabel(level)}</span>;
}

export function DataLabel({ children }: { children: ReactNode }) {
  return <span className="data-label">{children}</span>;
}

export function DataSourceLabel({ children }: { children: ReactNode }) {
  return <span className="data-source-label">{children}</span>;
}

export function ForecastEstimate({ forecast, compact = false, className = '' }: { forecast: Forecast; compact?: boolean; className?: string }) {
  const approximate = approximateExpectedVisitors(forecast);
  return <div className={`forecast-estimate ${compact ? 'forecast-estimate--compact' : ''} ${className}`.trim()}>
    <strong>About {approximate}</strong>
    <span>expected from past data</span>
    <small>(Mock data — a real estimate requires live CampusFit use or university data.)</small>
    {compact ? <span className="sr-only">Underlying model range {forecast.expectedRange[0]}–{forecast.expectedRange[1]}; {forecast.confidence} confidence. {forecast.sourceExplanation}</span> : <details><summary>Model details</summary><p>Underlying range: {forecast.expectedRange[0]}–{forecast.expectedRange[1]} · {forecast.confidence} confidence. {forecast.sourceExplanation}</p></details>}
  </div>;
}

export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`page-stack page-container ${className}`}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, titleId, description, action }: { eyebrow?: ReactNode; title: string; titleId?: string; description?: string; action?: ReactNode }) {
  return <div className="section-header"><div>{eyebrow ? <DataLabel>{eyebrow}</DataLabel> : null}<h2 id={titleId}>{title}</h2>{description ? <p>{description}</p> : null}</div>{action}</div>;
}

export function Metric({ value, label, note }: { value: ReactNode; label: string; note?: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span>{note ? <small>{note}</small> : null}</div>;
}

export function ManagementPageHeader({ eyebrow, title, description, badge, actions }: { eyebrow: ReactNode; title: string; description: string; badge?: ReactNode; actions?: ReactNode }) {
  return <header className="management-page-header">
    <div className="management-page-header__copy"><DataLabel>{eyebrow}</DataLabel><h1>{title}</h1><p>{description}</p></div>
    {badge || actions ? <div className="management-page-header__actions">{badge}{actions}</div> : null}
  </header>;
}

export function ManagementMetricGrid({ children, label }: { children: ReactNode; label: string }) {
  return <section className="management-metric-grid" aria-label={label}>{children}</section>;
}

export function ManagementMetric({ icon, value, label, note, tone = 'neutral' }: { icon: ReactNode; value: ReactNode; label: string; note: string; tone?: 'neutral' | 'positive' | 'warning' }) {
  return <article className={`management-metric management-metric--${tone}`}>
    <span className="management-metric__icon" aria-hidden="true">{icon}</span>
    <div><strong>{value}</strong><span>{label}</span><small>{note}</small></div>
  </article>;
}

export function ManagementSectionHeader({ eyebrow, title, description, icon, status }: { eyebrow?: ReactNode; title: string; description?: string; icon?: ReactNode; status?: ReactNode }) {
  return <div className="management-section-header">
    <div className="management-section-header__copy">{icon ? <span className="management-section-header__icon" aria-hidden="true">{icon}</span> : null}<div>{eyebrow ? <DataLabel>{eyebrow}</DataLabel> : null}<h2>{title}</h2>{description ? <p>{description}</p> : null}</div></div>
    {status}
  </div>;
}

export function ManagementToolbar({ children, label }: { children: ReactNode; label: string }) {
  return <div className="management-toolbar" role="group" aria-label={label}>{children}</div>;
}

export function ManagementDataList({ children, label }: { children: ReactNode; label: string }) {
  return <ul className="management-data-list" aria-label={label}>{children}</ul>;
}

export function ManagementDataRow({ title, meta, details, status, action, selected = false, expanded = true, detailsId }: { title: string; meta: string; details: ReactNode; status: ReactNode; action?: ReactNode; selected?: boolean; expanded?: boolean; detailsId?: string }) {
  return <li className={`management-data-row ${selected ? 'is-selected' : ''} ${expanded ? 'is-expanded' : 'is-collapsed'}`} aria-current={selected ? 'true' : undefined}><div className="management-data-row__identity"><strong>{title}</strong>{expanded ? <small>{meta}</small> : null}</div><div className="management-data-row__details" id={detailsId} hidden={!expanded}>{details}</div><div className="management-data-row__status">{status}{action ? <div className="management-data-row__action">{action}</div> : null}</div></li>;
}

export function FormMessage({ children, tone = 'hint', id }: { children: ReactNode; tone?: 'hint' | 'error' | 'success'; id?: string }) {
  return <small id={id} className={`form-message form-message--${tone}`} role={tone === 'error' ? 'alert' : undefined}>{children}</small>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="progress-wrap"><div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={bounded}><span style={{ width: `${bounded}%` }} /></div><span>{label}</span></div>;
}

export function Modal({ open, title, description, onClose, children, label = 'CampusFit action' }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode; label?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={sheetRef} className="modal-sheet bottom-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
      <div className="modal-handle" aria-hidden="true" />
      <div className="modal-heading"><div><DataLabel>{label}</DataLabel><h2 id={titleId}>{title}</h2>{description ? <p id={descriptionId}>{description}</p> : null}</div><button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
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

export function LoadingSkeleton({ rows = 3, label = 'Loading CampusFit information' }: { rows?: number; label?: string }) {
  return <div className="loading-skeleton" role="status" aria-label={label}>{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}

export function ErrorState({ title = 'Something didn’t load', body, action }: { title?: string; body: string; action?: ReactNode }) {
  return <div className="error-state" role="alert"><AlertCircle /><div><h3>{title}</h3><p>{body}</p>{action}</div></div>;
}

export function QuickAction({ icon, label, note, onClick, to }: { icon: ReactNode; label: string; note: string; onClick?: () => void; to?: string }) {
  const content = <><span className="quick-action__icon" aria-hidden="true">{icon}</span><span><strong>{label}</strong><small>{note}</small></span><ArrowRight className="quick-action__arrow" aria-hidden="true" /></>;
  return to ? <Link className="quick-action" to={to}>{content}</Link> : <button type="button" className="quick-action" onClick={onClick}>{content}</button>;
}

export function ConfirmationDialog({ open, title, description, confirmLabel, onConfirm, onClose, tone = 'primary' }: { open: boolean; title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; tone?: 'primary' | 'danger' }) {
  return <Modal open={open} title={title} description={description} onClose={onClose} label="Please confirm"><div className="confirmation-actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={tone} onClick={onConfirm}>{confirmLabel}</Button></div></Modal>;
}
