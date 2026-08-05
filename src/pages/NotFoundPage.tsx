import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function NotFoundPage() {
  return <main id="main-content" className="not-found"><Brand /><div><span>404</span><h1>That route missed the gym.</h1><p>The page you requested is not part of this CampusFit demo.</p><Link className="button button--primary button--medium" to="/"><ArrowLeft />Return home</Link></div></main>;
}
