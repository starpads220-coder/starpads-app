import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { EmployeeRole } from "@/types";

const VALID_ROLES: EmployeeRole[] = [
  "ADMIN",
  "PRODUCTION_SUPERVISOR",
  "WORKER",
  "STORE_MANAGER",
  "SALES_STAFF",
  "FINANCE",
];

export async function POST(request: NextRequest) {
  const auth = getAdminAuth();
  const db = getAdminDb();
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

  if (!VALID_ROLES.includes(role as EmployeeRole)) {
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
