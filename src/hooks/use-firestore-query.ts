import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  QueryConstraint,
  FirestoreError,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

async function fetchCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  if (!db) throw new Error("Firestore not initialized");
  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T);
}

export function useCollectionQuery<T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options?: Partial<UseQueryOptions<T[]>>
) {
  return useQuery<T[]>({
    queryKey: [collectionName, ...constraints.map((c) => c.toString())],
    queryFn: () => fetchCollection<T>(collectionName, constraints),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCollectionQueryByIds<T>(
  collectionName: string,
  ids: string[],
  options?: Partial<UseQueryOptions<(T & { id: string })[]>>
) {
  return useQuery<(T & { id: string })[]>({
    queryKey: [collectionName, "ids", ...ids],
    queryFn: async () => {
      if (!db) throw new Error("Firestore not initialized");
      if (ids.length === 0) return [];
      const results: (T & { id: string })[] = [];
      for (const id of ids) {
        const snap = await getDocs(query(collection(db, collectionName)));
        const found = snap.docs.find((d) => d.id === id);
        if (found) results.push({ id: found.id, ...found.data() } as T & { id: string });
      }
      return results;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useRealtimeCollection<T>(
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
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setLoading(false);
      },
      (err: FirestoreError) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, ...constraints]);

  return { data, loading, error };
}

export function useFirestoreMutation(collectionName: string) {
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!db) throw new Error("Firestore not initialized");
      return addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ docId, data }: { docId: string; data: Record<string, unknown> }) => {
      if (!db) throw new Error("Firestore not initialized");
      return updateDoc(doc(db, collectionName, docId), {
        ...data,
        updatedAt: Timestamp.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });

  const remove = useMutation({
    mutationFn: async (docId: string) => {
      if (!db) throw new Error("Firestore not initialized");
      return deleteDoc(doc(db, collectionName, docId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collectionName] });
    },
  });

  return { add, update, remove };
}
