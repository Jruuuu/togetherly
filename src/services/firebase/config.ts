import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, getDocs } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Track if emulators are connected to avoid reconnecting
let emulatorsConnected = false;

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true' && !emulatorsConnected) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8082);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  emulatorsConnected = true;
  
  // Debug: Verify emulator connection
  console.log('🔌 Connected to Firestore emulator at localhost:8082');
  console.log('🔌 Connected to Auth emulator at localhost:9099');
  console.log('🔌 Connected to Functions emulator at localhost:5001');
  
  // Expose functions and db helpers to window for console testing
  if (typeof window !== 'undefined') {
    (window as any).__firebaseFunctions = functions;
    (window as any).__firebaseDb = db;
    
    // Helper function to query date nights from console
    (window as any).__checkDateNights = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'dateNights'));
        const dateNights: any[] = [];
        querySnapshot.forEach((doc) => {
          dateNights.push({ id: doc.id, ...doc.data() });
        });
        console.log(`📅 Found ${dateNights.length} date night(s) in Firestore:`, dateNights);
        return dateNights;
      } catch (error) {
        console.error('❌ Error querying date nights:', error);
        throw error;
      }
    };
    
    console.log('💡 Functions exposed to window.__firebaseFunctions for testing');
    console.log('💡 Firestore db exposed to window.__firebaseDb for testing');
    console.log('💡 Helper function: window.__checkDateNights() to query all date nights');
  }
}

// Initialize Analytics only in browser environment and production
export const analytics = typeof window !== 'undefined' && process.env.NODE_ENV === 'production' 
  ? getAnalytics(app) 
  : null;

export default app;

