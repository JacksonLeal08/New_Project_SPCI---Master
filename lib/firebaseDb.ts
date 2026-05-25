import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { auth } from '@/lib/firebaseAuth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App and Firestore without duplicating
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const db = firestoreDb;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure database connection works on startup
export async function testConnection() {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Por favor, verifique sua configuração de Firebase (Cliente Offline).");
    }
  }
}

/**
 * Generic Asset operations for Extintores, Hidrantes, etc
 */
export async function getAssetsList(collectionName: string): Promise<any[]> {
  try {
    const colSnap = await getDocs(collection(db, collectionName));
    const list: any[] = [];
    colSnap.forEach(docSnap => {
      list.push(docSnap.data());
    });
    return list;
  } catch (error) {
    console.warn(`Could not get ${collectionName} from Firebase.`, error);
    return [];
  }
}

export async function saveAssetToDb(collectionName: string, id: string, asset: any): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, id), asset);
  } catch (error) {
    console.warn(`Could not save asset to ${collectionName} in Firebase.`, error);
  }
}
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  logoUrl: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * Recovers or registers a user profile on login.
 * If the user's email matches 'jackson602@gmail.com', they are bootstrapped as an 'admin'.
 */
export async function registerOrLoginUserProfile(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    
    // Auto-bootstrap jackson602@gmail.com as Admin, others as User
    const isBootstrappedAdmin = user.email?.toLowerCase() === 'jackson602@gmail.com';
    const initialRole = isBootstrappedAdmin ? 'admin' : 'user';
    
    const newProfile: UserProfile = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Usuário SPCI',
      email: user.email || '',
      photoURL: user.photoURL || '',
      logoUrl: '', // No custom logo initially
      role: initialRole,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(docRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Updates a user's chosen custom logo
 */
export async function updateUserLogo(uid: string, logoUrl: string, name?: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const updatePayload: any = { 
      logoUrl,
      updatedAt: new Date().toISOString()
    };
    if (name) {
      updatePayload.name = name;
    }
    await updateDoc(docRef, updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin updates a user's role and/or status
 */
export async function updateUserRoleAndStatus(uid: string, role: 'admin' | 'user', status: 'active' | 'pending' | 'inactive'): Promise<void> {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, { 
      role, 
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin fetches all users registered in the system
 */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const colSnap = await getDocs(collection(db, 'users'));
    const list: UserProfile[] = [];
    colSnap.forEach(docSnap => {
      list.push(docSnap.data() as UserProfile);
    });
    // Sort by role then name
    return list.sort((a,b) => {
      if(a.role !== b.role) return a.role === 'admin' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Admin deletes a user profile
 */
export async function deleteUserProfileByAdmin(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
