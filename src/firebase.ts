import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocFromServer,
  addDoc,
  deleteDoc,
  getDocs,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, Conversation, Message, CallRecord, ContactRequest, AbuseReport } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test as required by skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: Client currently appears offline or uninitialized.');
    }
    return false;
  }
}
testConnection();

// Pre-seeded Admin Email from metadata
export const DEFAULT_ADMIN_EMAIL = 'streetotp001@gmail.com';

// User Helpers
export async function syncUserProfile(user: FirebaseUser, additionalData?: Partial<UserProfile>): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    const isAdminUser = user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      const updated: Partial<UserProfile> = {
        online: true,
        lastSeen: new Date().toISOString(),
        fullName: additionalData?.fullName || user.displayName || existing.fullName || 'User',
        photoURL: additionalData?.photoURL || user.photoURL || existing.photoURL || '',
        email: user.email || existing.email,
        role: isAdminUser ? 'admin' : (existing.role || 'user'),
      };
      await updateDoc(userRef, updated);
      return { ...existing, ...updated } as UserProfile;
    } else {
      const newProfile: UserProfile = {
        id: user.uid,
        fullName: additionalData?.fullName || user.displayName || 'FLEXchat User',
        email: user.email || '',
        photoURL: additionalData?.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
        statusMessage: additionalData?.statusMessage || 'Available on FLEXchat',
        online: true,
        lastSeen: new Date().toISOString(),
        role: isAdminUser ? 'admin' : 'user',
        blockedUserIds: [],
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newProfile);

      // If default admin, also add to admins collection
      if (isAdminUser) {
        try {
          await setDoc(doc(db, 'admins', user.uid), {
            id: user.uid,
            email: user.email,
            assignedAt: new Date().toISOString(),
          });
        } catch {
          // Ignore if permission denied on self-seed
        }
      }

      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      online: isOnline,
      lastSeen: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Failed to update presence', e);
  }
}

// Find user by exact Gmail/email
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const q = query(collection(db, 'users'), where('email', '==', cleanEmail), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}
