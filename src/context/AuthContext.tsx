
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, GeoPoint } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react'; 

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'buyer' | 'seller' | 'admin' | null;
  contactName?: string;
  phoneNumber?: string;
  location?: GeoPoint | { latitude: number, longitude: number } | null; 
  address?: string; // Buyer's physical address
  approved?: boolean; 
  active?: boolean; 
  cylindersAvailable?: number;
  licenseNumber?: string;
  licenseeNameAddress?: string;
  licenseValidity?: string;
  licenseType?: string;
  createdAt?: any; 
  updatedAt?: any; 
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>; // Added to allow optimistic updates
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { 
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as Omit<UserProfile, 'uid' | 'email' | 'displayName'>;
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: userData.contactName || firebaseUser.displayName || 'User',
            ...userData,
          });
        } else {
          console.warn("User document not found in Firestore for UID:", firebaseUser.uid, "Logging out.");
          
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    if (!auth) return; 
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg text-foreground mt-4">Loading OxyConnect...</p>
      </div>
    );
  }


  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

