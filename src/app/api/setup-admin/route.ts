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

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  try {
    const rolesSnap = await db
      .collection("userRoles")
      .where("role", "==", "ADMIN")
      .limit(1)
      .get();

    if (!rolesSnap.empty) {
      return NextResponse.json(
        { error: "Admin already exists. Please log in instead." },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error("Failed to check for existing admins, proceeding with signup:", err);
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });

    await db.collection("userRoles").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      role: "ADMIN",
      employeeId: null,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
    });
  } catch (err: unknown) {
    const fbErr = err as { code?: string; message?: string };
    if (fbErr.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "This email is already registered. Please log in." },
        { status: 409 }
      );
    }
    console.error("Failed to create admin account:", err);
    return NextResponse.json(
      { error: "Failed to create admin account. Ensure Firestore is enabled in your Firebase project." },
      { status: 500 }
    );
  }
}
