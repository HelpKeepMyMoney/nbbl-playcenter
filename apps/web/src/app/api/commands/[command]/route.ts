import { NextRequest, NextResponse } from "next/server";
import {
  getAuthContext,
  getAdminAuth,
  runCommand,
  ServerError,
  commandRegistry,
} from "@nbbl/server";

function errorResponse(error: unknown) {
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

async function verifyRequest(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ServerError("unauthenticated", "Missing authorization token", 401);
  }

  const token = header.slice("Bearer ".length);
  const decoded = await getAdminAuth().verifyIdToken(token);
  return getAuthContext({
    uid: decoded.uid,
    token: decoded as unknown as Record<string, unknown>,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ command: string }> }
) {
  try {
    const { command } = await context.params;
    if (!commandRegistry[command]) {
      return NextResponse.json(
        { error: { code: "not-found", message: `Unknown command: ${command}` } },
        { status: 404 }
      );
    }

    const ctx = await verifyRequest(req);
    const data = await req.json();
    const result = await runCommand(command, ctx, data);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
