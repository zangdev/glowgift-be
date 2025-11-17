// Client-side Firebase initialization helper for Next.js App Router
import { initializeApp, getApps, getApp } from 'firebase/app'

// Read from env (preferred) with safe fallbacks to provided constants
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBSFwFd-RXzqc7-SoKxhlgjn_GNw1ZPuQQ',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'glowgift-4552a.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'glowgift-4552a',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'glowgift-4552a.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1090460712148',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1090460712148:web:0acb2d32e245c61c634f41',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-7CVXZC6425',
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Analytics only works in the browser and when supported
export async function getAnalyticsIfSupported() {
  if (typeof window === 'undefined') return null
  try {
    const { isSupported, getAnalytics } = await import('firebase/analytics')
    if (await isSupported()) {
      return getAnalytics(app)
    }
  } catch (_) {
    // ignore if not supported (e.g., Node/SSR or disabled environment)
  }
  return null
}

export default app
