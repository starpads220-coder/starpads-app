import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin SDK is not configured" },
      { status: 500 }
    );
  }

  try {
    const snap = await db
      .collection("userRoles")
      .where("role", "==", "ADMIN")
      .get();

    if (snap.empty) {
      return NextResponse.json({
        success: true,
        message: "No admin users found to migrate.",
        migratedCount: 0,
      });
    }

    const batch = db.batch();
    let migratedCount = 0;

    snap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "active") {
        batch.update(doc.ref, { status: "active" });
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `${migratedCount} admin(s) migrated to active status.`,
      migratedCount,
      totalAdmins: snap.size,
    });
  } catch (err) {
    console.error("Failed to migrate admins:", err);
    return NextResponse.json(
      { error: "Failed to migrate admin accounts." },
      { status: 500 }
    );
  }
}
