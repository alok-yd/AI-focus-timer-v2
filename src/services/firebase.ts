import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  OAuthCredential
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// In-memory access token cache (MANDATORY: Never store access token in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export async function signInWithGoogle(): Promise<{ user: User; accessToken: string | null }> {
  const provider = new GoogleAuthProvider();
  SCOPES.forEach(scope => provider.addScope(scope));

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result) as OAuthCredential | null;
  const token = credential?.accessToken || null;
  
  if (token) {
    cachedAccessToken = token;
  }

  return {
    user: result.user,
    accessToken: token
  };
}

export async function signOutGoogle(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
}

// Ensure token is purged when user logs out
export function onAuthChanged(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
    }
    cb(user);
  });
}
