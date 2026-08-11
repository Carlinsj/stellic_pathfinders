import { Link } from 'react-router-dom';

export function Brand({ to = '/', inverted = false, linked = true }: { to?: string; inverted?: boolean; linked?: boolean }) {
  const content = <>
    <span className="brand-mark" aria-hidden="true"><i /><i /><b /></span>
    <span>Campus<span>Fit</span></span>
  </>;
  return linked
    ? <Link className={`brand ${inverted ? 'brand--inverted' : ''}`} to={to} aria-label="CampusFit home">{content}</Link>
    : <span className={`brand ${inverted ? 'brand--inverted' : ''}`} aria-hidden="true">{content}</span>;
}
