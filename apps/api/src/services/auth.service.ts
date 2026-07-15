import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { firebaseAuth, firebaseEnabled, firestore } from '../config/firebase.js';
import { prisma } from '../config/prisma.js';
import { userRepository } from '../repositories/user.repository.js';
import { createTokenId, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import type { AuthUserRecord, UserRole } from '../types/auth.js';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

type UserDocument = AuthUserRecord & {
  emailVerificationToken?: string | null;
  emailVerificationExpiresAt?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpiresAt?: Date | null;
  lastLoginAt?: Date | null;
  organizationId?: string | null;
};

type LegacyUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeUser = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatarUrl: user.avatarUrl,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const parseDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }

  return new Date();
};

const firebaseResponseBody = async <T>(url: string, body: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Firebase request failed.');
  }

  return payload as T;
};

const signInWithPassword = async (email: string, password: string) => {
  if (!env.FIREBASE_WEB_API_KEY.trim()) {
    throw new Error('FIREBASE_WEB_API_KEY is required for Firebase auth.');
  }

  return firebaseResponseBody<{
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
  }>(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_WEB_API_KEY.trim()}`, {
    email,
    password,
    returnSecureToken: true
  });
};

const signInWithCustomToken = async (customToken: string) => {
  if (!env.FIREBASE_WEB_API_KEY.trim()) {
    throw new Error('FIREBASE_WEB_API_KEY is required for Firebase auth.');
  }

  return firebaseResponseBody<{
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
  }>(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.FIREBASE_WEB_API_KEY.trim()}`, {
    token: customToken,
    returnSecureToken: true
  });
};

const refreshWithToken = async (refreshToken: string) => {
  if (!env.FIREBASE_WEB_API_KEY.trim()) {
    throw new Error('FIREBASE_WEB_API_KEY is required for Firebase auth.');
  }

  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${env.FIREBASE_WEB_API_KEY.trim()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    access_token?: string;
    refresh_token?: string;
    user_id?: string;
    expires_in?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Firebase token refresh failed.');
  }

  return {
    accessToken: payload.access_token ?? '',
    refreshToken: payload.refresh_token ?? refreshToken,
    userId: payload.user_id ?? ''
  };
};

const userCollection = () => {
  if (!firestore) {
    throw new Error('Firestore is not configured.');
  }

  return firestore.collection('users');
};

const mapFirebaseUser = (id: string, data: FirebaseFirestore.DocumentData): UserDocument => {
  const createdAt = parseDate(data.createdAt);
  const updatedAt = parseDate(data.updatedAt);

  return {
    id,
    firstName: String(data.firstName ?? '').trim(),
    lastName: String(data.lastName ?? '').trim(),
    email: String(data.email ?? '').trim().toLowerCase(),
    phone: typeof data.phone === 'string' ? data.phone : null,
    role: (data.role as UserRole) ?? 'CUSTOMER',
    avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
    isEmailVerified: Boolean(data.isEmailVerified),
    createdAt,
    updatedAt,
    emailVerificationToken: typeof data.emailVerificationToken === 'string' ? data.emailVerificationToken : null,
    emailVerificationExpiresAt: data.emailVerificationExpiresAt ? parseDate(data.emailVerificationExpiresAt) : null,
    passwordResetToken: typeof data.passwordResetToken === 'string' ? data.passwordResetToken : null,
    passwordResetExpiresAt: data.passwordResetExpiresAt ? parseDate(data.passwordResetExpiresAt) : null,
    lastLoginAt: data.lastLoginAt ? parseDate(data.lastLoginAt) : null,
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : null
  };
};

const readFirebaseUserById = async (id: string): Promise<UserDocument | null> => {
  const snapshot = await userCollection().doc(id).get();
  return snapshot.exists ? mapFirebaseUser(snapshot.id, snapshot.data() ?? {}) : null;
};

const readFirebaseUserByEmail = async (email: string): Promise<UserDocument | null> => {
  const snapshot = await userCollection().where('email', '==', normalizeEmail(email)).limit(1).get();
  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  if (!doc) {
    return null;
  }

  return mapFirebaseUser(doc.id, doc.data());
};

const saveFirebaseUser = async (id: string, data: Partial<UserDocument>) => {
  const existing = await readFirebaseUserById(id);
  const now = new Date();
  const record: UserDocument = {
    id,
    firstName: data.firstName ?? existing?.firstName ?? '',
    lastName: data.lastName ?? existing?.lastName ?? '',
    email: normalizeEmail(data.email ?? existing?.email ?? ''),
    phone: data.phone ?? existing?.phone ?? null,
    role: (data.role ?? existing?.role ?? 'CUSTOMER') as UserRole,
    avatarUrl: data.avatarUrl ?? existing?.avatarUrl ?? null,
    isEmailVerified: data.isEmailVerified ?? existing?.isEmailVerified ?? false,
    createdAt: data.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
    emailVerificationToken: data.emailVerificationToken ?? existing?.emailVerificationToken ?? null,
    emailVerificationExpiresAt: data.emailVerificationExpiresAt ?? existing?.emailVerificationExpiresAt ?? null,
    passwordResetToken: data.passwordResetToken ?? existing?.passwordResetToken ?? null,
    passwordResetExpiresAt: data.passwordResetExpiresAt ?? existing?.passwordResetExpiresAt ?? null,
    lastLoginAt: data.lastLoginAt ?? existing?.lastLoginAt ?? null,
    organizationId: data.organizationId ?? existing?.organizationId ?? null
  };

  await userCollection().doc(id).set(record, { merge: true });
  return record;
};

const profileFromAuthRecord = async (id: string, email?: string | null, displayName?: string | null) => {
  const existing = await readFirebaseUserById(id);
  if (existing) {
    return existing;
  }

  const nameParts = (displayName ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? 'User';
  const lastName = nameParts.slice(1).join(' ') || 'QueueLess';
  const profile = await saveFirebaseUser(id, {
    firstName,
    lastName,
    email: normalizeEmail(email ?? ''),
    role: 'CUSTOMER',
    isEmailVerified: false
  });

  return profile;
};

const firebaseAuthService = {
  async register(input: RegisterInput) {
    if (!firebaseAuth || !firestore) {
      throw new Error('Firebase is not configured.');
    }

    const email = normalizeEmail(input.email);
    const existing = await readFirebaseUserByEmail(email);
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const authUser = await firebaseAuth.createUser({
      email,
      password: input.password,
      displayName: `${input.firstName} ${input.lastName}`,
      emailVerified: false
    });

    await firebaseAuth.setCustomUserClaims(authUser.uid, {
      role: 'CUSTOMER',
      organizationId: null
    });

    const verificationToken = randomBytes(32).toString('hex');
    const profile = await saveFirebaseUser(authUser.uid, {
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      phone: input.phone ?? null,
      role: 'CUSTOMER',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });

    const session = await signInWithCustomToken(await firebaseAuth.createCustomToken(authUser.uid));

    return {
      user: sanitizeUser(profile),
      accessToken: session.idToken,
      refreshToken: session.refreshToken,
      emailVerificationToken: env.NODE_ENV === 'production' ? undefined : verificationToken
    };
  },

  async login(input: LoginInput) {
    if (!firebaseAuth || !firestore) {
      throw new Error('Firebase is not configured.');
    }

    const email = normalizeEmail(input.email);
    const session = await signInWithPassword(email, input.password);
    const profile = await profileFromAuthRecord(session.localId, email);

    await saveFirebaseUser(session.localId, {
      lastLoginAt: new Date(),
      email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      isEmailVerified: profile.isEmailVerified
    });

    return {
      user: sanitizeUser(profile),
      accessToken: session.idToken,
      refreshToken: session.refreshToken
    };
  },

  async refresh(refreshToken: string) {
    if (!firebaseAuth || !firestore) {
      throw new Error('Firebase is not configured.');
    }

    const session = await refreshWithToken(refreshToken);
    const profile = await profileFromAuthRecord(session.userId);

    return {
      user: sanitizeUser(profile),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken
    };
  },

  async logout(accessToken: string) {
    if (!firebaseAuth) {
      throw new Error('Firebase is not configured.');
    }

    const decoded = await firebaseAuth.verifyIdToken(accessToken, true);
    await firebaseAuth.revokeRefreshTokens(decoded.uid);
    return { success: true };
  },

  async requestPasswordReset(email: string) {
    const profile = await readFirebaseUserByEmail(email);
    if (!profile) {
      return { success: true };
    }

    const resetToken = randomBytes(32).toString('hex');
    await saveFirebaseUser(profile.id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: new Date(Date.now() + 1000 * 60 * 30)
    });

    return {
      success: true,
      resetToken: env.NODE_ENV === 'production' ? undefined : resetToken
    };
  },

  async resetPassword(input: ResetPasswordInput) {
    const snapshot = await userCollection().where('passwordResetToken', '==', input.token).limit(1).get();
    if (snapshot.empty) {
      throw new Error('Password reset token is invalid or expired.');
    }

    const doc = snapshot.docs[0];
    if (!doc) {
      throw new Error('Password reset token is invalid or expired.');
    }

    const profile = mapFirebaseUser(doc.id, doc.data());
    if (!profile.passwordResetExpiresAt || profile.passwordResetExpiresAt < new Date()) {
      throw new Error('Password reset token is invalid or expired.');
    }

    if (!firebaseAuth) {
      throw new Error('Firebase is not configured.');
    }

    await firebaseAuth.updateUser(profile.id, { password: input.password });
    await saveFirebaseUser(profile.id, {
      passwordResetToken: null,
      passwordResetExpiresAt: null
    });

    return { success: true };
  },

  async requestEmailVerification(email: string) {
    const profile = await readFirebaseUserByEmail(email);
    if (!profile) {
      return { success: true };
    }

    const verificationToken = randomBytes(32).toString('hex');
    await saveFirebaseUser(profile.id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });

    return {
      success: true,
      verificationToken: env.NODE_ENV === 'production' ? undefined : verificationToken
    };
  },

  async verifyEmail(token: string) {
    const snapshot = await userCollection().where('emailVerificationToken', '==', token).limit(1).get();
    if (snapshot.empty) {
      throw new Error('Email verification token is invalid or expired.');
    }

    const doc = snapshot.docs[0];
    if (!doc) {
      throw new Error('Email verification token is invalid or expired.');
    }

    const profile = mapFirebaseUser(doc.id, doc.data());
    if (!profile.emailVerificationExpiresAt || profile.emailVerificationExpiresAt < new Date()) {
      throw new Error('Email verification token is invalid or expired.');
    }

    if (!firebaseAuth) {
      throw new Error('Firebase is not configured.');
    }

    await firebaseAuth.updateUser(profile.id, { emailVerified: true });
    await saveFirebaseUser(profile.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null
    });

    return { success: true };
  },

  async me(userId: string) {
    const profile = await readFirebaseUserById(userId);
    if (!profile) {
      if (!firebaseAuth) {
        throw new Error('User not found.');
      }

      const authUser = await firebaseAuth.getUser(userId);
      const createdProfile = await profileFromAuthRecord(userId, authUser.email, authUser.displayName);
      return sanitizeUser(createdProfile);
    }

    return sanitizeUser(profile);
  }
};

const legacyAuthService = {
  async register(input: RegisterInput) {
    const existingUser = await userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const user = await userRepository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      passwordHash,
      role: Prisma.UserRole.CUSTOMER,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationTokenExpiresAt
    });

    const tokenId = createTokenId();
    const accessToken = signAccessToken({ sub: user.id, role: user.role, organizationId: null });
    const refreshToken = signRefreshToken({ sub: user.id, tokenId });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      emailVerificationToken: env.NODE_ENV === 'production' ? undefined : verificationToken
    };
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, organizationId: null });
    const refreshToken = signRefreshToken({ sub: user.id, tokenId: createTokenId() });

    await userRepository.updateById(user.id, { lastLoginAt: new Date() });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken
    };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    const user = await userRepository.findById(payload.sub);

    if (!user) {
      throw new Error('User not found.');
    }

    const nextAccessToken = signAccessToken({ sub: user.id, role: user.role, organizationId: null });
    const nextRefreshToken = signRefreshToken({ sub: user.id, tokenId: createTokenId() });

    return {
      user: sanitizeUser(user),
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken
    };
  },

  async logout(_accessToken: string) {
    return { success: true };
  },

  async requestPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return { success: true };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await userRepository.updateById(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: resetExpiresAt
    });

    return {
      success: true,
      resetToken: env.NODE_ENV === 'production' ? undefined : resetToken
    };
  },

  async resetPassword(input: ResetPasswordInput) {
    const user = await userRepository.findByPasswordResetToken(input.token);
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new Error('Password reset token is invalid or expired.');
    }

    const passwordHash = await hashPassword(input.password);
    await userRepository.updateById(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    return { success: true };
  },

  async requestEmailVerification(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return { success: true };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await userRepository.updateById(user.id, {
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt
    });

    return {
      success: true,
      verificationToken: env.NODE_ENV === 'production' ? undefined : token
    };
  },

  async verifyEmail(token: string) {
    const user = await userRepository.findByEmailVerificationToken(token);
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new Error('Email verification token is invalid or expired.');
    }

    await userRepository.updateById(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null
    });

    return { success: true };
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    return sanitizeUser(user);
  }
};

export const authService = firebaseEnabled ? firebaseAuthService : legacyAuthService;