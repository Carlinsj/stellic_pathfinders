import { Link } from 'react-router-dom';

export function Brand({ to = '/', inverted = false }: { to?: string; inverted?: boolean }) {
  return <Link className={`brand ${inverted ? 'brand--inverted' : ''}`} to={to} aria-label="CampusFit home">
    <span className="brand-mark" aria-hidden="true"><i /><i /><b /></span>
    <span>Campus<span>Fit</span></span>
  </Link>;
}
