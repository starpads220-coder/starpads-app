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
    const docRef = db.collection("productionStages").doc("STG-08");
    const snap = await docRef.get();

    if (snap.exists) {
      await docRef.update({
        name: "Packaging",
        defaultTarget: 120,
        defaultWageRate: 12000,
        unit: "packs",
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Packing stage (STG-08) updated successfully",
        data: {
          stageId: "STG-08",
          name: "Packaging",
          defaultTarget: 120,
          defaultWageRate: 12000,
          unit: "packs",
        },
      });
    }

    await docRef.set({
      stageId: "STG-08",
      name: "Packaging",
      defaultTarget: 120,
      defaultWageRate: 12000,
      unit: "packs",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Packing stage (STG-08) created successfully",
      data: {
        stageId: "STG-08",
        name: "Packaging",
        defaultTarget: 120,
        defaultWageRate: 12000,
        unit: "packs",
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
