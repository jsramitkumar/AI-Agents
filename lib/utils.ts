import { randomBytes } from 'crypto';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Generate a cryptographically random hex string of the given byte length. */
function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

/** Generate a safe MySQL database name: wp_ + 12 random hex chars. */
export function generateDbName(): string {
  return `wp_${randomHex(6)}`;
}

/** Generate a safe MySQL username: wu_ + 12 random hex chars. */
export function generateDbUser(): string {
  return `wu_${randomHex(6)}`;
}

/** Generate a strong 32-character random database password. */
export function generateDbPassword(): string {
  return randomHex(16);
}

/** Convert a display name to a URL-safe subdomain slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}
