import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const fname = `u_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const publicDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(publicDir, { recursive: true });
  const full = path.join(publicDir, fname);
  await fs.writeFile(full, bytes);

  // Frontend can use this path directly in <img src="/uploads/...">
  return NextResponse.json({ ok: true, path: `/uploads/${fname}` });
}