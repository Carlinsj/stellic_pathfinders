import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { useCampusFit } from '../data/CampusFitContext';
import { universities } from '../data/universities';
import { initials } from '../lib/format';
import { defaultRouteForRole, isStaffPortalRole, isStudentRole, roleLabels } from '../services/accessControl';

export function LoginPage({ audience }: { audience: 'student' | 'staff' }) {
  const tenant = 'nyu' as const;
  const university = universities[tenant];
  const { accounts, signInAs } = useCampusFit();
  const navigate = useNavigate();
  const staffPortal = audience === 'staff';
  const eligibleAccounts = accounts[tenant].filter((account) => staffPortal ? isStaffPortalRole(account.role) : isStudentRole(account.role));

  const handleLogin = (userId: string) => {
    const user = eligibleAccounts.find((account) => account.id === userId);
    if (!user) return;
    signInAs(tenant, user);
    navigate(`/${tenant}/${defaultRouteForRole(user.role)}`);
  };

  return <main id="main-content" className={`login-page ${staffPortal ? 'login-page--staff' : ''}`} tabIndex={-1} style={{ '--tenant-primary': university.primaryColor, '--tenant-secondary': university.secondaryColor, '--tenant-accent': university.accentColor } as React.CSSProperties}>
    <div className="login-brand-panel"><div><Brand inverted /><div className="login-story"><span className="tenant-mark tenant-mark--large">{staffPortal ? <ShieldCheck /> : university.mark}</span><p className="eyebrow">{staffPortal ? `${university.recreationOfficeName} staff portal` : university.recreationOfficeName}</p><h1>{staffPortal ? <>Operate campus recreation,<br /><em>securely.</em></> : <>Plan the visit,<br />not the <em>waiting.</em></>}</h1><p>{staffPortal ? `A separate demonstration workspace for authorized ${university.shortName} recreation staff and university administrators.` : `Explore a fully synthetic ${university.shortName} CampusFit environment with realistic facility, activity, and equipment demand.`}</p></div></div><ul>{staffPortal ? <><li><ShieldCheck /> Role-gated operations</li><li><KeyRound /> Separate staff entry</li><li><LockKeyhole /> Tenant-scoped mutations</li></> : <><li><ShieldCheck /> Privacy thresholds applied</li><li><LockKeyhole /> Tenant-isolated demo data</li><li><UsersRound /> No real student locations</li></>}</ul></div>
    <div className="login-accounts"><Link className="back-link" to="/"><ArrowLeft size={17} /> Back to CampusFit</Link><div className="login-heading"><span className="data-label">{staffPortal ? 'Staff demonstration login' : 'Student demonstration login'}</span><h2>{staffPortal ? 'Authorized staff accounts' : 'Choose a student account'}</h2><p>No password is required in this prototype. Real {university.shortName} authentication is not connected.</p></div><div className="account-list">{eligibleAccounts.map((account) => <button key={account.id} onClick={() => handleLogin(account.id)} className="account-card"><span className="account-avatar">{initials(account.fullName)}</span><span><strong>{account.fullName}</strong><small>{roleLabels[account.role]} · {account.email}</small></span><ArrowRight size={18} /></button>)}</div><Link className="portal-switch" to={`/${tenant}/${staffPortal ? 'login' : 'staff-login'}`}>{staffPortal ? <UsersRound /> : <ShieldCheck />}<span><strong>{staffPortal ? 'Student access' : 'Recreation staff access'}</strong><small>Open the separate {staffPortal ? 'student experience' : 'staff and administration portal'}.</small></span><ArrowRight /></Link><div className="login-disclaimer"><LockKeyhole size={18} /><p><strong>{staffPortal ? 'Security model' : 'Demo environment'}</strong><br />{staffPortal ? 'This UI guard demonstrates role separation. Production authorization must also be enforced by university SSO and database RLS.' : 'Every person, plan, visit, forecast, and live count shown here is synthetic.'}</p></div></div>
  </main>;
}
