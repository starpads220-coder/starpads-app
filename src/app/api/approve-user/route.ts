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

  let body: { uid?: string; action?: string; adminUid?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { uid, action, adminUid } = body;

  if (!uid || !action || !adminUid) {
    return NextResponse.json(
      { error: "uid, action, and adminUid are required" },
      { status: 400 }
    );
  }

  if (action !== "approve" && action !== "reject" && action !== "suspend") {
    return NextResponse.json(
      { error: "action must be 'approve', 'reject', or 'suspend'" },
      { status: 400 }
    );
  }

  try {
    const adminRoleDoc = await db.collection("userRoles").doc(adminUid).get();
    if (!adminRoleDoc.exists || adminRoleDoc.data()?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "approve") {
      await db.collection("userRoles").doc(uid).update({
        status: "active",
      });

      return NextResponse.json({ success: true, action: "approved" });
    } else if (action === "suspend") {
      await db.collection("userRoles").doc(uid).update({
        status: "pending",
      });

      return NextResponse.json({ success: true, action: "suspended" });
    } else {
      await auth.deleteUser(uid);
      await db.collection("userRoles").doc(uid).delete();

      return NextResponse.json({ success: true, action: "rejected" });
    }
  } catch (err: unknown) {
    const fbErr = err as { code?: string; message?: string };
    console.error("Failed to process approval:", err);
    if (fbErr.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "User not found in authentication system." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process approval." },
      { status: 500 }
    );
  }
}
