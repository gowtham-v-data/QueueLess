import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from './env.js';

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const parseServiceAccount = (): ServiceAccount | null => {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as Record<string, unknown>;
      const projectId = String(parsed.project_id ?? parsed.projectId ?? '').trim();
      const clientEmail = String(parsed.client_email ?? parsed.clientEmail ?? '').trim();
      const privateKey = String(parsed.private_key ?? parsed.privateKey ?? '').replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        return { projectId, clientEmail, privateKey };
      }
    } catch {
      return null;
    }
  }

  const projectId = env.FIREBASE_PROJECT_ID.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY.trim().replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
};

const serviceAccount = parseServiceAccount();

export const firebaseEnabled = Boolean(serviceAccount && env.FIREBASE_WEB_API_KEY.trim());

const app = firebaseEnabled
  ? getApps()[0] ?? initializeApp({ credential: cert(serviceAccount!), projectId: serviceAccount!.projectId })
  : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;