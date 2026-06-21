import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  try {
    const rolesSnap = await db
      .collection("userRoles")
      .where("role", "==", "ADMIN")
      .limit(1)
      .get();

    return NextResponse.json({ adminExists: !rolesSnap.empty });
  } catch (err) {
    console.error("Failed to check admin existence:", err);
    return NextResponse.json({ adminExists: false });
  }
}
