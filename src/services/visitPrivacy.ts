import type { PrivacyLevel } from '../domain/types';

export const selectableVisitPrivacy = [
  { value: 'anonymous_aggregate' as const, label: 'Anonymous aggregate', description: 'Adds to CampusFit counts and demand estimates. Your name and exact visit are never shown to other students.' },
  { value: 'private' as const, label: 'Private', description: 'Keeps the visit in your account only. It does not contribute to live CampusFit counts or demand.' }
];

export const contributesToLiveAggregate = (privacyLevel: PrivacyLevel): boolean => privacyLevel !== 'private';
