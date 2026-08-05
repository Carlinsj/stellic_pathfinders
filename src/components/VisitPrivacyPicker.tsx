import { ShieldCheck } from 'lucide-react';
import type { PrivacyLevel } from '../domain/types';
import { selectableVisitPrivacy } from '../services/visitPrivacy';

interface VisitPrivacyPickerProps { value: PrivacyLevel; onChange: (value: PrivacyLevel) => void; compact?: boolean; }

export function VisitPrivacyPicker({ value, onChange, compact = false }: VisitPrivacyPickerProps) {
  return <fieldset className={`privacy-picker${compact ? ' privacy-picker--compact' : ''}`}>
    <legend>Privacy for this visit</legend>
    <p><ShieldCheck size={16} /> Choose whether this visit helps the anonymous live estimate.</p>
    <div>{selectableVisitPrivacy.map((option) => <label key={option.value} className={value === option.value ? 'is-selected' : ''}>
      <input type="radio" name={compact ? 'checkin-privacy' : 'plan-privacy'} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
      <span><strong>{option.label}</strong><small>{option.description}</small></span>
    </label>)}</div>
  </fieldset>;
}
