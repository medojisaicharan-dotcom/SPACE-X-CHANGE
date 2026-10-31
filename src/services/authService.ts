import { IS_SUPABASE_MODE } from '@/lib/config';
import { getDb, getSessionUserId, mutateDb, refreshRemoteData, setSessionUserId } from '@/lib/db';
import {
  authCreateOwnProfileIfMissing,
  authSendPasswordReset,
  authSessionUserId,
  authSignIn,
  authSignOut,
  authSignUp,
  authUpdateMetadata,
  authUpdatePassword,
} from '@/lib/supabaseRepo';
import { createId, hashPassword } from '@/utils/crypto';
import { getProfile, nowISO, pushAudit, ServiceError } from '@/services/core';
import type { Institution, Profile, Role } from '@/types';

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  role: Extract<Role, 'user' | 'resource_owner' | 'institution_manager'>;
  institutionId: string;
  institutionName: string;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function findProfileByEmail(email: string): Profile | undefined {
  return getDb().profiles.find((p) => p.email.toLowerCase() === normaliseEmail(email));
}

async function waitForProfile(userId: string, attempts = 6): Promise<Profile> {
  let triedFallback = false;
  for (let index = 0; index < attempts; index += 1) {
    const profile = getDb().profiles.find((p) => p.id === userId);
    if (profile) return profile;
    if (!triedFallback) {
      triedFallback = true;
      await authCreateOwnProfileIfMissing().catch(() => false);
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    await refreshRemoteData();
  }
  throw new ServiceError(
    'profile_missing',
    'Your sign-in worked, but no SPACEXCHANGE profile was found. Apply database/migrations/0002_app_integration.sql in Supabase so new accounts receive a profile automatically.',
  );
}

async function finishSupabaseSignIn(userId: string | null, email: string): Promise<Profile> {
  await refreshRemoteData();
  const profile = userId
    ? getDb().profiles.find((p) => p.id === userId)
    : findProfileByEmail(email);
  if (!profile) {
    if (userId) return waitForProfile(userId);
    throw new ServiceError('profile_missing', 'Your account has no profile record yet.');
  }
  if (profile.suspended) {
    await authSignOut().catch(() => undefined);
    throw new ServiceError(
      'suspended',
      'This account is suspended. Contact a platform administrator.',
    );
  }
  return profile;
}

export async function signUp(input: SignUpInput): Promise<Profile> {
  const email = normaliseEmail(input.email);

  if (IS_SUPABASE_MODE) {
    let result;
    try {
      result = await authSignUp({
        fullName: input.fullName.trim(),
        email,
        password: input.password,
        role: input.role,
        institutionId: input.institutionId,
        institutionName: input.institutionName.trim(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (/already registered|already exists/i.test(message)) {
        throw new ServiceError('duplicate_email', 'An account already exists with this email address.');
      }
      if (/over_email_send_rate_limit|rate limit/i.test(message)) {
        throw new ServiceError(
          'email_rate_limited',
          'Supabase has temporarily stopped sending confirmation emails from this project, so the account could not be created. Disable "Confirm email" in Supabase Authentication settings (or connect a custom SMTP provider) and try again.',
        );
      }
      throw error;
    }

    if (result.needsEmailConfirmation) {
      throw new ServiceError(
        'email_confirmation_required',
        'Account created. Check your email to confirm the address, then sign in. For local demos you can disable "Confirm email" in Supabase Authentication settings.',
      );
    }

    return finishSupabaseSignIn(result.userId, email);
  }

  const db = getDb();
  if (db.profiles.some((p) => p.email.toLowerCase() === email)) {
    throw new ServiceError('duplicate_email', 'An account already exists with this email address.');
  }
  const institution = input.institutionId
    ? db.institutions.find((i) => i.id === input.institutionId)
    : undefined;
  const passwordHash = await hashPassword(input.password);
  const now = nowISO();
  const profile: Profile = {
    id: createId('usr'),
    email,
    fullName: input.fullName.trim(),
    role: input.role,
    institutionId: institution?.id ?? null,
    institutionName: institution?.name ?? input.institutionName.trim(),
    verified: input.role === 'user',
    suspended: false,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  mutateDb((database) => {
    database.profiles.push(profile);
    pushAudit(
      database,
      { id: profile.id, fullName: profile.fullName },
      'Account created',
      `Registered as ${profile.role.replace('_', ' ')}${institution ? ` for ${institution.name}` : ''}.`,
    );
    database.notifications.unshift({
      id: createId('notif'),
      userId: profile.id,
      type: 'system',
      title: 'Welcome to SPACEXCHANGE',
      message:
        profile.role === 'user'
          ? 'Your account is ready. Explore resources and submit your first booking request.'
          : 'Your account has been created. An administrator must verify it before you can manage resources.',
      link: profile.role === 'user' ? '/explore' : '/dashboard',
      read: false,
      createdAt: now,
    });
    if (profile.role !== 'user') {
      database.profiles
        .filter((p) => p.role === 'administrator')
        .forEach((admin) => {
          database.notifications.unshift({
            id: createId('notif'),
            userId: admin.id,
            type: 'system',
            title: 'New account awaiting verification',
            message: `${profile.fullName} registered as a ${profile.role.replace('_', ' ')} and needs verification.`,
            link: '/admin/users',
            read: false,
            createdAt: now,
          });
        });
    }
  });

  setSessionUserId(profile.id);
  return profile;
}

export async function signIn(email: string, password: string): Promise<Profile> {
  if (IS_SUPABASE_MODE) {
    try {
      const result = await authSignIn(normaliseEmail(email), password);
      return await finishSupabaseSignIn(result.userId, normaliseEmail(email));
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      const message = error instanceof Error ? error.message : '';
      if (/email not confirmed/i.test(message)) {
        throw new ServiceError(
          'email_not_confirmed',
          'This email address has not been confirmed yet. Open the confirmation link in your inbox, or disable "Confirm email" in Supabase Authentication settings while testing locally.',
        );
      }
      if (/invalid login credentials/i.test(message)) {
        throw new ServiceError('invalid_credentials', 'Invalid email or password.');
      }
      throw error;
    }
  }

  const db = getDb();
  const profile = db.profiles.find((p) => p.email.toLowerCase() === normaliseEmail(email));
  if (!profile) {
    throw new ServiceError('invalid_credentials', 'Invalid email or password.');
  }
  if (profile.suspended) {
    throw new ServiceError('suspended', 'This account is suspended. Contact a platform administrator.');
  }
  const passwordHash = await hashPassword(password);
  if (passwordHash !== profile.passwordHash) {
    throw new ServiceError('invalid_credentials', 'Invalid email or password.');
  }
  setSessionUserId(profile.id);
  return profile;
}

export function signOut(): void {
  if (IS_SUPABASE_MODE) {
    setSessionUserId(null);
    void authSignOut()
      .catch((error) => console.warn('[SPACEXCHANGE] Supabase sign-out failed.', error))
      .finally(() => refreshRemoteData().catch(() => undefined));
    return;
  }
  setSessionUserId(null);
}

export function getCurrentProfile(): Profile | null {
  const id = getSessionUserId();
  if (!id) return null;
  const db = getDb();
  const profile = getProfile(db, id);
  if (!profile) return null;
  if (profile.suspended) {
    if (IS_SUPABASE_MODE) {
      signOut();
    } else {
      setSessionUserId(null);
    }
    return null;
  }
  return profile;
}

export function listInstitutions(): Institution[] {
  return [...getDb().institutions].sort((a, b) => a.name.localeCompare(b.name));
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    await authSendPasswordReset(normaliseEmail(email));
    return;
  }
  const db = getDb();
  const profile = db.profiles.find((p) => p.email.toLowerCase() === normaliseEmail(email));
  if (!profile) {
    throw new ServiceError('not_found', 'No account was found with that email address.');
  }
}

export async function resetPassword(email: string, newPassword: string): Promise<void> {
  if (IS_SUPABASE_MODE) {
    const userId = await authSessionUserId();
    if (!userId) {
      throw new ServiceError(
        'recovery_required',
        'Open the password-reset link from your email, then set a new password on that page.',
      );
    }
    const profile = getDb().profiles.find((p) => p.id === userId);
    if (email && profile && profile.email.toLowerCase() !== normaliseEmail(email)) {
      throw new ServiceError(
        'recovery_required',
        'The signed-in account does not match this reset link. Open the link from your email again.',
      );
    }
    await authUpdatePassword(newPassword);
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  mutateDb((db) => {
    const profile = db.profiles.find((p) => p.email.toLowerCase() === normaliseEmail(email));
    if (!profile) throw new ServiceError('not_found', 'No account was found with that email address.');
    profile.passwordHash = passwordHash;
    profile.updatedAt = nowISO();
    pushAudit(
      db,
      { id: profile.id, fullName: profile.fullName },
      'Password reset',
      'Password was reset using the demo account recovery flow.',
    );
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (IS_SUPABASE_MODE) {
    const db = getDb();
    const profile = getProfile(db, userId);
    if (!profile) throw new ServiceError('not_found', 'Account not found.');
    if (!profile.email) {
      throw new ServiceError('not_found', 'Account email is unavailable for password verification.');
    }
    try {
      await authSignIn(profile.email, currentPassword);
    } catch {
      throw new ServiceError('invalid_credentials', 'Your current password is incorrect.');
    }
    await authUpdatePassword(newPassword);
    mutateDb((database) => {
      const target = getProfile(database, userId);
      if (!target) return;
      pushAudit(
        database,
        { id: target.id, fullName: target.fullName },
        'Password changed',
        'Account password was updated through Supabase Auth.',
      );
    });
    return;
  }

  const db = getDb();
  const profile = getProfile(db, userId);
  if (!profile) throw new ServiceError('not_found', 'Account not found.');
  const currentHash = await hashPassword(currentPassword);
  if (currentHash !== profile.passwordHash) {
    throw new ServiceError('invalid_credentials', 'Your current password is incorrect.');
  }
  const newHash = await hashPassword(newPassword);
  mutateDb((database) => {
    const target = getProfile(database, userId);
    if (!target) throw new ServiceError('not_found', 'Account not found.');
    target.passwordHash = newHash;
    target.updatedAt = nowISO();
    pushAudit(
      database,
      { id: target.id, fullName: target.fullName },
      'Password changed',
      'Account password was updated.',
    );
  });
}

export function updateProfile(
  userId: string,
  input: { fullName: string; institutionId: string },
): void {
  mutateDb((db) => {
    const profile = getProfile(db, userId);
    if (!profile) throw new ServiceError('not_found', 'Account not found.');
    const institution = db.institutions.find((i) => i.id === input.institutionId);
    profile.fullName = input.fullName.trim();
    profile.institutionId = institution?.id ?? null;
    profile.institutionName = institution?.name ?? '';
    profile.updatedAt = nowISO();
    pushAudit(db, profile, 'Profile updated', 'Updated display name or institution membership.');
  });

  if (IS_SUPABASE_MODE) {
    const profile = getProfile(getDb(), userId);
    if (profile) {
      void authUpdateMetadata({
        full_name: profile.fullName,
        institution_id: profile.institutionId,
        institution_name: profile.institutionName,
      }).catch((error) => console.warn('[SPACEXCHANGE] Could not update auth metadata.', error));
    }
  }
}
