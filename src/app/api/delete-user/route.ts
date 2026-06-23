import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  let body: { uid?: string; adminUid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { uid, adminUid } = body;

  if (!uid || !adminUid) {
    return NextResponse.json(
      { error: "uid and adminUid are required" },
      { status: 400 }
    );
  }

  try {
    const adminRoleDoc = await db.collection("userRoles").doc(adminUid).get();
    if (!adminRoleDoc.exists || adminRoleDoc.data()?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await auth.deleteUser(uid);
    await db.collection("userRoles").doc(uid).delete();

    return NextResponse.json({ success: true, action: "deleted" });
  } catch (err: unknown) {
    const fbErr = err as { code?: string; message?: string };
    console.error("Failed to delete user:", err);
    if (fbErr.code === "auth/user-not-found") {
      await db.collection("userRoles").doc(uid).delete();
      return NextResponse.json(
        { error: "Auth user not found; removed role document." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 }
    );
  }
}
