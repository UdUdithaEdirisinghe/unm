// src/app/api/upload/route.ts
import { NextResponse } from "next/server";

// Use Node runtime (works both locally and on Vercel)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // Basic sanity checks (optional)
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
    }

    // Create a safe filename
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const key = `bank-slips/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // If we have a Vercel Blob token, upload there (Production/Preview on Vercel)
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const { put } = await import("@vercel/blob");

      const res = await put(key, file, {
        access: "public",
        token,
        multipart: true, // handles big files and streams
      });

      // Keep both url and path for compatibility with your existing code
      return NextResponse.json({ ok: true, url: res.url, path: res.url });
    }

    // Fallback for local dev only — write into public/uploads
    const { promises: fs } = await import("fs");
    const pathMod = await import("path");
    const publicDir = pathMod.join(process.cwd(), "public", "uploads");
    await fs.mkdir(publicDir, { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    const full = pathMod.join(publicDir, key.split("/").pop()!);
    await fs.writeFile(full, bytes);

    const localPath = `/uploads/${key.split("/").pop()!}`;
    return NextResponse.json({ ok: true, url: localPath, path: localPath });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}