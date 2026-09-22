import { createHash, randomBytes } from 'node:crypto';

export const OFFER_CONSENT = 'offer-check-v1';
export const OFFER_CONSENT_TEXT = 'Eine Bestätigungsmail und nach Bestätigung eine Nachricht zum Start des Angebotschecks. Kein Newsletter.';
export function waitlistToken() { return randomBytes(32).toString('hex'); }
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export function validWaitlistToken(token: string) { return /^[a-f0-9]{64}$/.test(token); }
export function waitlistInput(value: unknown): { email: string; trap: boolean } | null {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
 const p = value as Record<string, unknown>;
 if (typeof p.website === 'string' && p.website.trim()) return { email: '', trap: true };
 const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
 if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || p.consent !== OFFER_CONSENT) return null;
 if (typeof p.elapsedMs !== 'number' || p.elapsedMs < 1500) return { email: '', trap: true };
 return { email, trap: false };
}
