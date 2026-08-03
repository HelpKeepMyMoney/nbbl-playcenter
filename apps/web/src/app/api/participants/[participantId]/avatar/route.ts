import { buildParticipantAvatarSvg } from "@/lib/participant-avatar-svg";

export async function GET(
  _request: Request,
  context: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await context.params;
  const { searchParams } = new URL(_request.url);
  const firstName = searchParams.get("firstName") ?? "Player";
  const lastName = searchParams.get("lastName") ?? "";

  const svg = buildParticipantAvatarSvg(participantId, firstName, lastName);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
