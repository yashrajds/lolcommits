import { NextResponse } from "next/server";
import { deleteEntry, isAdminRequest } from "@/lib/tokenVault";

export const dynamic = "force-dynamic";

// DELETE /api/tokens/:login — admin-only removal from the vault.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ login: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Admin locked." }, { status: 401 });
  }
  const { login } = await params;
  if (!login || !/^[a-zA-Z0-9-]{1,39}$/.test(login)) {
    return NextResponse.json({ error: "Invalid login." }, { status: 400 });
  }
  const removed = deleteEntry(login);
  if (!removed) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, login });
}
