import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  const adminUid = request.nextUrl.searchParams.get("adminUid");
  if (!adminUid) {
    return NextResponse.json(
      { error: "adminUid query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const adminDoc = await db.collection("userRoles").doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const snap = await db.collection("userRoles").get();
    const users = snap.docs.map((d) => ({ ...d.data(), uid: d.id }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    return NextResponse.json(
      { error: "Failed to fetch users." },
      { status: 500 }
    );
  }
}
