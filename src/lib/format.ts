export const formatTime = (iso: string, timeZone?: string): string =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));

export const formatTimeInput = (iso: string, timeZone?: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone
  }).formatToParts(new Date(iso));
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
};

export const formatDate = (iso: string, timeZone?: string): string =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone }).format(new Date(iso));

export const formatDateTime = (iso: string, timeZone?: string): string =>
  `${formatDate(iso, timeZone)} · ${formatTime(iso, timeZone)}`;

export const addMinutes = (iso: string, minutes: number): string =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString();

export const replaceTime = (iso: string, time: string): string => {
  const date = new Date(iso);
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const crowdLabel = (level: string): string => level === 'unknown'
  ? 'Unknown'
  : level.replace('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export const initials = (name: string): string => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export const campusFitCheckInText = (count: number): string =>
  `${count} ${count === 1 ? 'person' : 'people'} checked in with CampusFit`;
