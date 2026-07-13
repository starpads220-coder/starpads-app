"use client";

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { UserRole } from "@/types";
import { doc, onSnapshot } from "firebase/firestore";

interface AuthState {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  roleLoaded: boolean;
  configured: boolean;
}

interface AuthMethods {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthStateContext = createContext<AuthState | null>(null);
const AuthMethodsContext = createContext<AuthMethods | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const configured = isFirebaseConfigured();
  const fbReady = configured && !!auth && !!db;
  const [loading, setLoading] = useState(fbReady);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    if (!fbReady) return;
    const _auth = auth!;
    const _db = db!;

    const unsubAuth = onAuthStateChanged(_auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserRole(null);
        setRoleLoaded(false);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
    };
  }, [fbReady]);

  useEffect(() => {
    if (!user || !db) {
      if (!user) setLoading(false);
      return;
    }
    const _db = db;
    const roleRef = doc(_db, "userRoles", user.uid);
    const unsubRole = onSnapshot(roleRef, (snap) => {
      if (snap.exists()) {
        setUserRole(snap.data() as UserRole);
      } else {
        setUserRole(null);
      }
      setRoleLoaded(true);
      setLoading(false);
    });
    return () => {
      unsubRole();
    };
  }, [user]);

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
      resetPassword: async (email: string) => {
        if (!auth) throw new Error("Firebase is not configured");
        const actionCodeSettings = {
          url: `${typeof window !== "undefined" ? window.location.origin : ""}/login`,
          handleCodeInApp: false,
        };
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
      },
    }),
    []
  );

  const state = useMemo(
    () => ({ user, userRole, loading, roleLoaded, configured }),
    [user, userRole, loading, roleLoaded, configured]
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
