import { Check } from 'lucide-react';
import { useId } from 'react';
import { workoutFocuses } from '../data/catalog';
import { toggleWorkoutFocusSelection } from '../services/workoutFocus';

interface WorkoutFocusPickerProps {
  selected: string[];
  onChange: (focuses: string[]) => void;
  legend?: string;
  description?: string;
  compact?: boolean;
}

export function WorkoutFocusPicker({
  selected,
  onChange,
  legend = 'Muscle groups',
  description = 'Choose one or more. CampusFit combines the equipment demand for all of them.',
  compact = false
}: WorkoutFocusPickerProps) {
  const descriptionId = useId();
  return <fieldset className={`workout-focus-picker ${compact ? 'workout-focus-picker--compact' : ''}`} aria-describedby={descriptionId}>
    <legend>{legend}</legend>
    <p id={descriptionId}>{description}</p>
    <div className="workout-focus-options">
      {workoutFocuses.map((focus) => {
        const isSelected = selected.includes(focus.key);
        return <button
          type="button"
          key={focus.key}
          className={isSelected ? 'is-selected' : ''}
          aria-pressed={isSelected}
          onClick={() => onChange(toggleWorkoutFocusSelection(selected, focus.key))}
        >
          <span aria-hidden="true">{isSelected ? <Check size={15} /> : focus.label.slice(0, 1)}</span>
          {focus.label}
        </button>;
      })}
    </div>
  </fieldset>;
}
