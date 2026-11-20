import { getConversation, isUuid } from "@/lib/conversations";
import { getCurrentUser, unauthorized } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const conversation = isUuid(id) ? await getConversation(id) : null;
  if (!conversation || !conversation.members.some((m) => m.id === me.id)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(conversation);
}
