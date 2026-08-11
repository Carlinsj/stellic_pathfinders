import { ArrowUpRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { activities } from '../data/catalog';
import type { Facility } from '../domain/types';
import { isFacilityOpen, isSpecialClosureActive } from '../services/forecasting';
import { StatusPill } from './ui';

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatOperatingTime = (value: string): string => {
  const [rawHour = 0, rawMinute = 0] = value.split(':').map(Number);
  const suffix = rawHour >= 12 ? 'PM' : 'AM';
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(rawMinute).padStart(2, '0')} ${suffix}`;
};

export function FacilityAvailability({ facility, at }: { facility: Facility; at: string }) {
  const open = isFacilityOpen(facility, at);
  const specialClosure = isSpecialClosureActive(facility, at);
  const today = facility.hours.find((entry) => entry.weekday === new Date(at).getDay());
  const status = specialClosure ? 'Temporarily closed' : open ? 'Open now' : 'Closed now';
  const schedule = specialClosure
    ? facility.specialClosure?.reason
    : today?.closureReason ?? (today ? `${formatOperatingTime(today.openingTime)}–${formatOperatingTime(today.closingTime)} today` : 'Hours unavailable');

  return <div className="facility-availability">
    <StatusPill level={open ? 'low' : 'unknown'}>{status}</StatusPill>
    <span><Clock3 aria-hidden="true" />{schedule}</span>
  </div>;
}

export function FacilityHoursList({ facility, at }: { facility: Facility; at: string }) {
  const currentWeekday = new Date(at).getDay();
  const specialClosure = isSpecialClosureActive(facility, at);
  const orderedHours = Array.from({ length: 7 }, (_, offset) => {
    const weekday = (currentWeekday + offset) % 7;
    return { offset, weekday, hours: facility.hours.find((entry) => entry.weekday === weekday) };
  });

  return <ol className="facility-hours-list" aria-label={`${facility.shortName} operating hours, starting today`}>
    {orderedHours.map(({ offset, weekday, hours }) => {
      const closed = !hours || Boolean(hours.closureReason) || (offset === 0 && specialClosure);
      const closureReason = offset === 0 && specialClosure ? facility.specialClosure?.reason : hours?.closureReason;
      return <li className={offset === 0 ? 'is-today' : ''} key={weekday}>
        <span><strong>{offset === 0 ? 'Today' : weekdayNames[weekday]}</strong>{offset === 1 ? <small>Tomorrow</small> : null}</span>
        {closed ? <span className="facility-hours-list__closed">{closureReason ?? 'Closed'}</span> : <span><time dateTime={hours.openingTime}>{formatOperatingTime(hours.openingTime)}</time><span aria-hidden="true">–</span><time dateTime={hours.closingTime}>{formatOperatingTime(hours.closingTime)}</time></span>}
      </li>;
    })}
  </ol>;
}

export function FacilityActivityList({ activityKeys, limit = 4, getActivityHref }: { activityKeys: string[]; limit?: number; getActivityHref?: (activityKey: string) => string }) {
  const items = activityKeys.map((key) => ({ key, label: activities.find((activity) => activity.key === key)?.label ?? key.replaceAll('_', ' ') }));
  const remaining = Math.max(0, items.length - limit);

  return <ul className={`facility-activity-list${getActivityHref ? ' facility-activity-list--actionable' : ''}`} aria-label="Supported activities">
    {items.slice(0, limit).map(({ key, label }) => <li key={key}>{getActivityHref ? <Link to={getActivityHref(key)}><span>{label}</span><ArrowUpRight aria-hidden="true" /></Link> : label}</li>)}
    {remaining ? <li className="facility-activity-list__more">+{remaining} more</li> : null}
  </ul>;
}

export function FacilityActivityGrid({ facility, getActivityHref }: { facility: Facility; getActivityHref: (activityKey: string) => string }) {
  return <ul className="facility-activity-grid" aria-label={`Activities supported at ${facility.shortName}`}>
    {facility.activities.map((key) => {
      const label = activities.find((activity) => activity.key === key)?.label ?? key.replaceAll('_', ' ');
      return <li key={key}>
        <span aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span>
        <div><h3>{label}</h3><p>Supported at {facility.shortName}</p></div>
        <Link to={getActivityHref(key)} aria-label={`Plan ${label} at ${facility.shortName}`}><ArrowUpRight aria-hidden="true" /></Link>
      </li>;
    })}
  </ul>;
}
