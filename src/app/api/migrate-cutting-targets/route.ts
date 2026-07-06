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
    const docRef = db.collection("productionStages").doc("STG-01");
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "productionStages/STG-01 document not found" },
        { status: 404 }
      );
    }

    await docRef.update({
      name: "Cutting & Measuring",
      defaultTarget: 0,
      defaultWageRate: 10000,
      materialTargets: {
        FLEECE: 700,
        FLANNEL: 350,
        PUL: 350,
      },
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Cutting stage targets updated successfully",
      data: {
        name: "Cutting & Measuring",
        defaultWageRate: 10000,
        materialTargets: {
          FLEECE: 700,
          FLANNEL: 350,
          PUL: 350,
        },
      },
    });
  } catch (err) {
    console.error("Migration failed:", err);
    return NextResponse.json(
      { error: "Migration failed: " + (err as Error).message },
      { status: 500 }
    );
  }
}
