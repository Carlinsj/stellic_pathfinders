import { ShieldCheck } from 'lucide-react';

export function VisitPrivacyPicker() {
  return <aside className="privacy-picker" aria-label="Anonymous demand contribution">
    <ShieldCheck size={18} />
    <span><strong>Anonymous demand contribution</strong><small>Your visit helps estimate how many CampusFit users are at the gym and which workout areas may be in demand. Your name, exact routine, and individual visit are never shown to other students.</small></span>
  </aside>;
}
