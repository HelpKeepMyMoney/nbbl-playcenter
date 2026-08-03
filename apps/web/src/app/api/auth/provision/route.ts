import { NextRequest, NextResponse } from "next/server";
import {
  getAdminAuth,
  provisionUser,
  ServerError,
} from "@nbbl/server";

export async function POST(req: NextRequest) {
  try {
    const header = req.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw new ServerError("unauthenticated", "Missing authorization token", 401);
    }

    const token = header.slice("Bearer ".length);
    const decoded = await getAdminAuth().verifyIdToken(token);
    const result = await provisionUser({
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ServerError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.httpStatus }
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: { code: "internal", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
