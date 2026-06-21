"use client";

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { UserRole } from "@/types";
import { doc, getDoc } from "firebase/firestore";

interface AuthState {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  configured: boolean;
}

interface AuthMethods {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthStateContext = createContext<AuthState | null>(null);
const AuthMethodsContext = createContext<AuthMethods | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const configured = isFirebaseConfigured();
  const fbReady = configured && !!auth && !!db;
  const [loading, setLoading] = useState(fbReady);

  useEffect(() => {
    if (!fbReady) return;
    const _auth = auth!;
    const _db = db!;
    const unsubscribe = onAuthStateChanged(_auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const roleDoc = await getDoc(doc(_db, "userRoles", firebaseUser.uid));
          if (roleDoc.exists()) {
            setUserRole(roleDoc.data() as UserRole);
          } else {
            setUserRole(null);
          }
        } catch {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fbReady]);

  const methods = useMemo(
    () => ({
      login: async (email: string, password: string) => {
        if (!auth) throw new Error("Firebase is not configured");
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        if (!auth) return;
        await signOut(auth);
      },
    }),
    []
  );

  const state = useMemo(
    () => ({ user, userRole, loading, configured }),
    [user, userRole, loading, configured]
  );

  return (
    <AuthStateContext.Provider value={state}>
      <AuthMethodsContext.Provider value={methods}>
        {children}
      </AuthMethodsContext.Provider>
    </AuthStateContext.Provider>
  );
}

export function useAuth(): AuthState & AuthMethods {
  const state = useContext(AuthStateContext);
  const methods = useContext(AuthMethodsContext);
  if (!state || !methods) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return { ...state, ...methods };
}
