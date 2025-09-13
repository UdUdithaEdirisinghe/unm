// src/app/api/upload/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** --- helpers --- */
function slugifyBase(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/\.[^.]+$/, "") // drop extension
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}

function extFromMime(mime: string, fallback = "bin") {
  const m = (mime || "").toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "image/svg+xml") return "svg";
  return fallback;
}

export async function POST(req: Request) {
  try {
    // kind = product | bank-slip  (default: product)
    const u = new URL(req.url);
    const kind = (u.searchParams.get("kind") || "product").toLowerCase();
    const allowed = new Set(["product", "bank-slip"]);
    if (!allowed.has(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    // Basic validation
    const maxBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: "File too large (max 8MB)" },
        { status: 413 }
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 415 });
    }

    // Use a name that can't collide with any existing variable
    const storagePrefix = kind === "product" ? "product-images" : "bank-slips";
    const base = slugifyBase(file.name);
    const ext = extFromMime(file.type, (file.name.split(".").pop() || "").toLowerCase());
    const key = `${storagePrefix}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${base}.${ext}`;

    // Use Vercel Blob in deployed envs
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) {
      const { put } = await import("@vercel/blob");

      const options: any = {
        access: "public",
        token,
        multipart: true,
        addRandomSuffix: false,
        contentType: file.type,
      };

      // ✅ only add cacheControlMaxAge when it's product
      if (kind === "product") {
        options.cacheControlMaxAge = "31536000"; // 1 year
      }

      const res = await put(key, file, options);
      return NextResponse.json({ ok: true, url: res.url, path: res.url });
    }

    // Local dev fallback → /public/uploads/<storagePrefix>/...
    const { promises: fs } = await import("fs");
    const pathMod = await import("path");
    const dir = pathMod.join(process.cwd(), "public", "uploads", storagePrefix);
    await fs.mkdir(dir, { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    const filename = key.split("/").pop()!;
    const full = pathMod.join(dir, filename);
    await fs.writeFile(full, bytes);

    const localPath = `/uploads/${storagePrefix}/${filename}`;
    return NextResponse.json({ ok: true, url: localPath, path: localPath });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}