// src/types/pdfkit.d.ts
// Minimal-but-complete typings for the subset of PDFKit we use.
// Safe to keep even if you later install @types/pdfkit (you can then delete this).

declare module "pdfkit" {
  export interface PDFOptions {
    size?: string | [number, number];
    margin?: number;
    layout?: "portrait" | "landscape";
    info?: Record<string, any>;
  }

  // Accept any option bags used by text/drawing calls
  export type PDFAnyOpts = any;

  export default class PDFDocument {
    constructor(options?: PDFOptions);

    // --- event emitter (buffer streaming) ---
    on(event: "data", cb: (chunk: Buffer) => void): this;
    on(event: "end", cb: () => void): this;

    // --- positioning / flow ---
    moveDown(lines?: number): this;
    moveUp(lines?: number): this;

    // --- drawing primitives ---
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    lineWidth(w: number): this;
    strokeColor(color: string | number): this;
    fillColor(color: string | number): this;
    stroke(): this;
    fill(): this;
    rect(x: number, y: number, w: number, h: number): this;
    dash(length?: number, options?: PDFAnyOpts): this;

    // --- text ---
    font(name: string | Buffer): this;
    fontSize(size: number): this;
    // Overloads PDFKit supports; options objects can include { width, align, underline, link, continued, ... }
    text(text: string, options?: PDFAnyOpts): this;
    text(text: string, x: number, y?: number, options?: PDFAnyOpts): this;

    // --- images ---
    image(src: string | Buffer, x?: number, y?: number, options?: PDFAnyOpts): this;

    // --- finalize ---
    end(): void;

    // --- cursor state we read (y for current line) ---
    y: number;
  }
}