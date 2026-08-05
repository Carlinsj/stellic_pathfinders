import { ShieldCheck } from 'lucide-react';

export function VisitPrivacyPicker() {
  return <aside className="privacy-picker" aria-label="Check-in privacy note">
    <ShieldCheck size={16} />
    <small>Your name is never shared. This check-in only helps estimate how many people are at the gym and which workout areas may be busier.</small>
  </aside>;
}
