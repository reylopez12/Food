import type { AuthUser } from '@workspace/api-zod';
import { isEmbeddedDatabase } from '@workspace/db';
import type { Request } from 'express';

/**
 * Local demo login: enabled only off-Replit, outside production, and on the
 * embedded database — i.e. someone running the app on their own machine.
 * It signs in a single demo account (an admin) without any OIDC round-trip.
 */
export const isLocalDevAuth =
  !process.env.REPL_ID &&
  process.env.NODE_ENV !== 'production' &&
  isEmbeddedDatabase;

export const LOCAL_DEV_USER: AuthUser = {
  id: 'local-dev-user',
  email: process.env.LOCAL_DEV_EMAIL ?? 'owner@eatlocal.test',
  firstName: 'Local',
  lastName: 'Owner',
  profileImageUrl: null,
};

/** Emails from ADMIN_EMAILS (comma-separated), plus the demo user locally. */
export function getAdminEmails(): string[] {
  const emails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (isLocalDevAuth && LOCAL_DEV_USER.email) {
    emails.push(LOCAL_DEV_USER.email.toLowerCase());
  }
  return emails;
}

export function isAdmin(req: Request): boolean {
  if (!req.isAuthenticated()) return false;
  const email = (req.user.email ?? '').toLowerCase();
  return email !== '' && getAdminEmails().includes(email);
}
