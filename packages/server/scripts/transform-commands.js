const fs = require("fs");
const path = require("path");

const files = {
  memberships: [
    ["createMembershipPlan", "handleCreateMembershipPlan"],
    ["updateMembershipPlan", "handleUpdateMembershipPlan"],
    ["assignPlayerMembership", "handleAssignPlayerMembership"],
    ["changePlayerMembershipPlan", "handleChangePlayerMembershipPlan"],
    ["pausePlayerMembership", "handlePausePlayerMembership"],
    ["resumePlayerMembership", "handleResumePlayerMembership"],
    ["cancelPlayerMembership", "handleCancelPlayerMembership"],
    ["toggleMembershipAutoRenew", "handleToggleMembershipAutoRenew"],
  ],
  tournaments: [
    ["createTournamentDraft", "handleCreateTournamentDraft"],
    ["saveTournament", "handleSaveTournament"],
    ["recalculateTournamentSchedule", "handleRecalculateTournamentSchedule"],
    ["updateTournament", "handleUpdateTournament"],
    ["deleteTournament", "handleDeleteTournament"],
    ["recordMatchResult", "handleRecordMatchResult"],
    ["simulateTournament", "handleSimulateTournament"],
  ],
};

const errorImport =
  'import { alreadyExists, failedPrecondition, notFound, permissionDenied } from "../errors";';

function cleanHandlerBody(body) {
  return body
    .replace(
      /\s*if \(!request\.auth\) \{\s*throw new HttpsError\("unauthenticated", "Authentication required"\);\s*\}\s*/g,
      "\n"
    )
    .replace(
      /\s*const ctx = getAuthContext\(request\.auth!?\);\s*/g,
      "\n"
    )
    .replace(/request\.data/g, "data");
}

function transformFile(fileName, exports) {
  const filePath = path.join(__dirname, "..", "src", "commands", `${fileName}.ts`);
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replace(
    /import \{ onCall, HttpsError \} from "firebase-functions\/v2\/https";\r?\n/,
    ""
  );

  if (fileName === "memberships") {
    content = content.replace(
      /import \{\r?\n  getAuthContext,\r?\n  getDb,\r?\n  refreshMembershipStats,\r?\n  requirePermission,\r?\n  writeAuditLog,\r?\n\} from "\.\.\/lib\/context";/,
      `import { type AuthContext, getDb, refreshMembershipStats, requirePermission, writeAuditLog } from "../context";\n${errorImport}`
    );
  } else {
    content = content.replace(
      /import \{\r?\n  getAuthContext,\r?\n  getDb,\r?\n  requirePermission,\r?\n  writeAuditLog,\r?\n\} from "\.\.\/lib\/context";/,
      `import { type AuthContext, getDb, requirePermission, writeAuditLog } from "../context";\n${errorImport}`
    );
    content = content.replace(/from "\.\/lib\//g, 'from "../tournaments/lib/');
    content = content.replace(
      /ctx: ReturnType<typeof getAuthContext>/g,
      "ctx: AuthContext"
    );
  }

  content = content.replace(
    /throw new HttpsError\("not-found", ([^)]+)\)/g,
    "throw notFound($1)"
  );
  content = content.replace(
    /throw new HttpsError\("permission-denied", ([^)]+)\)/g,
    "throw permissionDenied($1)"
  );
  content = content.replace(
    /throw new HttpsError\("failed-precondition", ([^)]+)\)/g,
    "throw failedPrecondition($1)"
  );
  content = content.replace(
    /throw new HttpsError\("already-exists", ([^)]+)\)/g,
    "throw alreadyExists($1)"
  );

  for (const [oldName, newName] of exports) {
    const start = `export const ${oldName} = onCall(async (request) => {`;
    const startIdx = content.indexOf(start);
    if (startIdx === -1) {
      throw new Error(`Could not find ${oldName} in ${fileName}`);
    }

    const bodyStart = startIdx + start.length;
    const endMarker = "\n});";
    const endIdx = content.indexOf(endMarker, bodyStart);
    if (endIdx === -1) {
      throw new Error(`Could not find end of ${oldName} in ${fileName}`);
    }

    const body = cleanHandlerBody(content.slice(bodyStart, endIdx));
    const replacement = `export async function ${newName}(ctx: AuthContext, data: unknown) {${body}\n}`;
    content = content.slice(0, startIdx) + replacement + content.slice(endIdx + endMarker.length);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Transformed ${fileName}.ts`);
}

for (const [fileName, exports] of Object.entries(files)) {
  transformFile(fileName, exports);
}
