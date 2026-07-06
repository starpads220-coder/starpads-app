import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = [
  "ADMIN",
  "PRODUCTION_SUPERVISOR",
  "WORKER",
  "STORE_MANAGER",
  "SALES_STAFF",
  "FINANCE",
] as const;

export async function POST(request: NextRequest) {
  let auth: import("firebase-admin/auth").Auth | null = null;
  let db: import("firebase-admin/firestore").Firestore | null = null;
  try {
    const admin = await import("@/lib/firebase-admin");
    auth = admin.getAdminAuth();
    db = admin.getAdminDb();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Firebase Admin SDK init error:", e);
    return NextResponse.json(
      { error: "Firebase Admin SDK init failed", details: msg },
      { status: 500 }
    );
  }

  if (!auth || !db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string; role?: string; employeeId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password, role, employeeId } = body;

  if (!email || !password || !role) {
    return NextResponse.json(
      { error: "Email, password, and role are required" },
      { status: 400 }
    );
  }

  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
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
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });

    const status = "pending";

    await db.collection("userRoles").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      role,
      employeeId: employeeId ?? null,
      status,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
    });
  } catch (err: unknown) {
    const fbErr = err as { code?: string; message?: string };
    if (fbErr.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 }
      );
    }
    console.error("Failed to create user account:", err);
    return NextResponse.json(
      { error: "Failed to create user account." },
      { status: 500 }
    );
  }
}
