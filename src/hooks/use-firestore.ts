import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  FirestoreError,
  QueryConstraint,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!db);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as T[];
        setData(docs);
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, JSON.stringify(constraints)]);

  return { data, loading, error };
}

export function useDocument<T>(collectionName: string, docId: string | null) {
  const isReady = !!docId && !!db;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(isReady);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    const docRef = doc(db, collectionName, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [collectionName, docId, isReady]);

  return { data, loading, error };
}

export async function addDocument(collectionName: string, data: Record<string, unknown>) {
  if (!db) throw new Error("Firestore is not initialized");
  return addDoc(collection(db, collectionName), {
    ...data,
    createdAt: Timestamp.now(),
  });
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
) {
  if (!db) throw new Error("Firestore is not initialized");
  return updateDoc(doc(db, collectionName, docId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteDocument(collectionName: string, docId: string) {
  if (!db) throw new Error("Firestore is not initialized");
  return deleteDoc(doc(db, collectionName, docId));
}

export async function getNextBatchNumber(): Promise<string> {
  if (!db) throw new Error("Firestore is not initialized");
  const counterRef = doc(db, "counters", "batchCounter");
  const counterSnap = await getDocs(
    query(collection(db, "counters"), where("__name__", "==", "batchCounter"))
  );

  let seq = 1;
  if (!counterSnap.empty) {
    const data = counterSnap.docs[0].data();
    seq = (data.currentSeq || 0) + 1;
  }

  await updateDoc(counterRef, { currentSeq: seq });
  const padded = String(seq).padStart(4, "0");
  return `P${padded}`;
}
