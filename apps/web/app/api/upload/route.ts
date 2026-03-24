import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { readdir, unlink } from "fs/promises";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = "/opt/kms/uploads";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/bmp",
  "image/webp",
];

const ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentId = formData.get("document_id") as string | null;
    const ocrLang = (formData.get("ocr_language") as string) || "ces+eng";

    if (!file) {
      return NextResponse.json({ error: "Soubor je povinny" }, { status: 400 });
    }

    if (!documentId) {
      return NextResponse.json(
        { error: "ID dokumentu je povinne" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Soubor je prilis velky (max 50 MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Nepodporovany typ souboru: ${file.type}. Podporovane: obrazky (JPG, PNG, TIFF, BMP, WebP), PDF, textove soubory.`,
        },
        { status: 400 }
      );
    }

    // Create upload directory for this document
    const attachmentId = randomUUID();
    const uploadDir = join(UPLOAD_DIR, documentId);
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = join(uploadDir, `${attachmentId}_${safeFilename}`);
    await writeFile(filePath, buffer);

    let ocrText = "";
    let pages = 1;

    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      // OCR image directly
      ocrText = await ocrImage(filePath, ocrLang);
    } else if (file.type === "application/pdf") {
      // Convert PDF to images and OCR each page
      const result = await ocrPdf(filePath, uploadDir, attachmentId, ocrLang);
      ocrText = result.text;
      pages = result.pages;
    } else {
      // Text file - read directly
      ocrText = buffer.toString("utf-8");
    }

    // Save to database
    await query(
      `INSERT INTO attachments (id, document_id, filename, file_path, file_size, mime_type, ocr_text, ocr_language, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        attachmentId,
        documentId,
        file.name,
        filePath,
        file.size,
        file.type,
        ocrText,
        ocrLang,
        user.id,
      ]
    );

    return NextResponse.json({
      id: attachmentId,
      text: ocrText,
      filename: file.name,
      pages,
      file_size: file.size,
      mime_type: file.type,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Chyba pri nahravani souboru" },
      { status: 500 }
    );
  }
}

async function ocrImage(filePath: string, lang: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("tesseract", [
      filePath,
      "stdout",
      "-l",
      lang,
      "--psm",
      "3",
    ], { maxBuffer: 10 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    console.error("OCR error:", error);
    return "(OCR selhalo - zkuste jiny jazyk nebo kvalitnejsi obraz)";
  }
}

async function ocrPdf(
  pdfPath: string,
  uploadDir: string,
  attachmentId: string,
  lang: string
): Promise<{ text: string; pages: number }> {
  const prefix = join(uploadDir, `${attachmentId}_page`);

  try {
    // Convert PDF pages to PNG images
    await execFileAsync("pdftoppm", [
      "-png",
      "-r",
      "300",
      pdfPath,
      prefix,
    ], { maxBuffer: 50 * 1024 * 1024 });

    // Find all generated page images
    const files = await readdir(uploadDir);
    const pageFiles = files
      .filter((f) => f.startsWith(`${attachmentId}_page`) && f.endsWith(".png"))
      .sort();

    if (pageFiles.length === 0) {
      return { text: "(PDF neobsahuje stranky k rozpoznani)", pages: 0 };
    }

    const texts: string[] = [];

    for (let i = 0; i < pageFiles.length; i++) {
      const pageFile = join(uploadDir, pageFiles[i]);
      const pageText = await ocrImage(pageFile, lang);
      if (pageText) {
        texts.push(`--- Stranka ${i + 1} ---\n${pageText}`);
      }
      // Clean up page image
      await unlink(pageFile).catch(() => {});
    }

    return {
      text: texts.join("\n\n"),
      pages: pageFiles.length,
    };
  } catch (error) {
    console.error("PDF OCR error:", error);
    return {
      text: "(Chyba pri zpracovani PDF)",
      pages: 0,
    };
  }
}

// GET: list attachments for a document
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("document_id");

    if (!documentId) {
      return NextResponse.json(
        { error: "ID dokumentu je povinne" },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT id, filename, file_size, mime_type, ocr_text, ocr_language, created_at
       FROM attachments
       WHERE document_id = $1
       ORDER BY created_at DESC`,
      [documentId]
    );

    return NextResponse.json({ attachments: result.rows });
  } catch (error) {
    console.error("List attachments error:", error);
    return NextResponse.json(
      { error: "Chyba pri nacitani priloh" },
      { status: 500 }
    );
  }
}
