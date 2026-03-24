"use client";

import { useState, useRef, useCallback } from "react";

interface FileUploadProps {
  documentId: string;
  onInsert?: (text: string) => void;
}

interface UploadResult {
  id: string;
  text: string;
  filename: string;
  pages: number;
  file_size: number;
  mime_type: string;
}

const OCR_LANGUAGES = [
  { value: "ces+eng", label: "Cestina + Anglictina" },
  { value: "ces", label: "Cestina" },
  { value: "eng", label: "Anglictina" },
  { value: "rus", label: "Rustina" },
  { value: "ukr", label: "Ukrajinstina" },
  { value: "heb", label: "Hebrejstina" },
  { value: "ces+eng+rus+ukr+heb", label: "Vsechny jazyky" },
];

const TRANSLATE_LANGUAGES = [
  { value: "ces", label: "Cestina" },
  { value: "eng", label: "Anglictina" },
  { value: "rus", label: "Rustina" },
  { value: "ukr", label: "Ukrajinstina" },
  { value: "heb", label: "Hebrejstina" },
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (mimeType === "application/pdf") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function FileUpload({ documentId, onInsert }: FileUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [ocrLang, setOcrLang] = useState("ces+eng");
  const [selectedResult, setSelectedResult] = useState<UploadResult | null>(null);
  const [translateLang, setTranslateLang] = useState("ces");
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      }
    },
    []
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);

    const newResults: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((prev) => ({
        ...prev,
        [file.name]: `Zpracovavam ${i + 1}/${files.length}...`,
      }));

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("document_id", documentId);
        formData.append("ocr_language", ocrLang);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Neznama chyba" }));
          setProgress((prev) => ({
            ...prev,
            [file.name]: `Chyba: ${err.error}`,
          }));
          continue;
        }

        const result: UploadResult = await res.json();
        newResults.push(result);
        setProgress((prev) => ({
          ...prev,
          [file.name]: "Hotovo",
        }));
      } catch {
        setProgress((prev) => ({
          ...prev,
          [file.name]: "Chyba pri nahravani",
        }));
      }
    }

    setResults(newResults);
    setFiles([]);
    setUploading(false);

    if (newResults.length === 1) {
      setSelectedResult(newResults[0]);
    }
  }, [files, documentId, ocrLang]);

  const handleTranslate = useCallback(async () => {
    if (!selectedResult?.text) return;
    setTranslating(true);
    setTranslatedText("");

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedResult.text,
          target_language: translateLang,
        }),
      });

      if (!res.ok) {
        setTranslatedText("(Preklad selhal)");
        setTranslating(false);
        return;
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || "";
                fullText += content;
                setTranslatedText(fullText);
              } catch {
                // skip
              }
            }
          }
        }
      }
    } catch {
      setTranslatedText("(Chyba pri prekladu)");
    } finally {
      setTranslating(false);
    }
  }, [selectedResult, translateLang]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          borderRadius: "10px",
          border: "1px solid #2a2a40",
          background: "#12121a",
          color: "#9898b0",
          fontSize: "13px",
          cursor: "pointer",
          transition: "all 0.2s",
          width: "100%",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Nahrat soubor a OCR
      </button>
    );
  }

  return (
    <div
      style={{
        background: "#12121a",
        border: "1px solid #2a2a40",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #2a2a40",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #22c55e10, #14b8a610)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: "14px", color: "#e8e8f0" }}>
            Nahrani souboru a OCR
          </span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setFiles([]);
            setResults([]);
            setSelectedResult(null);
            setTranslatedText("");
            setProgress({});
          }}
          style={{
            background: "none",
            border: "none",
            color: "#9898b0",
            cursor: "pointer",
            fontSize: "18px",
            padding: "4px",
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      {/* OCR Language selector */}
      <div
        style={{
          padding: "10px 18px",
          borderBottom: "1px solid #2a2a40",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "13px",
        }}
      >
        <span style={{ color: "#9898b0" }}>Jazyk OCR:</span>
        <select
          value={ocrLang}
          onChange={(e) => setOcrLang(e.target.value)}
          style={{
            background: "#0a0a0f",
            border: "1px solid #2a2a40",
            borderRadius: "6px",
            color: "#e8e8f0",
            padding: "4px 8px",
            fontSize: "12px",
            outline: "none",
          }}
        >
          {OCR_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      {!selectedResult && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            margin: "16px",
            padding: "32px 24px",
            border: `2px dashed ${dragOver ? "#22c55e" : "#2a2a40"}`,
            borderRadius: "10px",
            background: dragOver ? "#22c55e08" : "#0a0a0f",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke={dragOver ? "#22c55e" : "#4a4a60"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: "0 auto 12px" }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ color: "#9898b0", fontSize: "14px", margin: "0 0 4px" }}>
            Pretahnete soubory sem
          </p>
          <p style={{ color: "#4a4a60", fontSize: "12px", margin: 0 }}>
            nebo kliknete pro vyber (JPG, PNG, TIFF, BMP, PDF, TXT)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tiff,.tif,.bmp,.webp,.pdf,.txt,.csv,.md"
            multiple
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                background: "#0a0a0f",
                borderRadius: "8px",
                marginBottom: "6px",
                fontSize: "13px",
              }}
            >
              {getFileIcon(file.type)}
              <span style={{ flex: 1, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </span>
              <span style={{ color: "#4a4a60", fontSize: "11px" }}>
                {formatFileSize(file.size)}
              </span>
              {progress[file.name] && (
                <span
                  style={{
                    fontSize: "11px",
                    color: progress[file.name] === "Hotovo" ? "#22c55e" : progress[file.name].startsWith("Chyba") ? "#ef4444" : "#f59e0b",
                  }}
                >
                  {progress[file.name]}
                </span>
              )}
              {!uploading && (
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9898b0",
                    cursor: "pointer",
                    fontSize: "16px",
                    padding: "2px 6px",
                    lineHeight: 1,
                  }}
                >
                  x
                </button>
              )}
            </div>
          ))}

          {!uploading && (
            <button
              onClick={uploadFiles}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #22c55e, #14b8a6)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                marginTop: "8px",
              }}
            >
              Nahrat a rozpoznat ({files.length} {files.length === 1 ? "soubor" : files.length < 5 ? "soubory" : "souboru"})
            </button>
          )}

          {uploading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px",
                color: "#f59e0b",
                fontSize: "13px",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #2a2a40",
                  borderTopColor: "#22c55e",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Zpracovavam soubory...
            </div>
          )}
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && !selectedResult && (
        <div style={{ padding: "0 16px 12px" }}>
          <div style={{ fontSize: "12px", color: "#9898b0", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Vysledky OCR
          </div>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedResult(r)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: "#0a0a0f",
                border: "1px solid #2a2a40",
                borderRadius: "8px",
                marginBottom: "6px",
                fontSize: "13px",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                transition: "border-color 0.2s",
              }}
            >
              {getFileIcon(r.mime_type)}
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e8e8f0" }}>{r.filename}</div>
                <div style={{ color: "#4a4a60", fontSize: "11px" }}>
                  {formatFileSize(r.file_size)} | {r.pages} {r.pages === 1 ? "stranka" : r.pages < 5 ? "stranky" : "stranek"} | {r.text.length} znaku
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9898b0" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Selected result detail */}
      {selectedResult && (
        <div style={{ padding: "0 16px 16px" }}>
          {/* Back button */}
          {results.length > 1 && (
            <button
              onClick={() => {
                setSelectedResult(null);
                setTranslatedText("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "#9898b0",
                cursor: "pointer",
                fontSize: "12px",
                padding: "4px 0",
                marginBottom: "8px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Zpet na seznam
            </button>
          )}

          <div style={{ fontSize: "13px", color: "#e8e8f0", marginBottom: "8px", fontWeight: 600 }}>
            {selectedResult.filename}
          </div>

          {/* OCR Text preview */}
          <div
            style={{
              background: "#0a0a0f",
              border: "1px solid #2a2a40",
              borderRadius: "8px",
              padding: "12px",
              maxHeight: "200px",
              overflowY: "auto",
              fontSize: "13px",
              color: "#e8e8f0",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              marginBottom: "12px",
            }}
          >
            {selectedResult.text || "(Zadny text nebyl rozpoznan)"}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            {onInsert && selectedResult.text && (
              <button
                onClick={() => onInsert(selectedResult.text)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  minWidth: "140px",
                }}
              >
                Vlozit do dokumentu
              </button>
            )}
            <button
              onClick={() => {
                if (selectedResult.text) {
                  navigator.clipboard.writeText(selectedResult.text);
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #2a2a40",
                background: "transparent",
                color: "#9898b0",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Kopirovat
            </button>
          </div>

          {/* Translation section */}
          {selectedResult.text && (
            <div
              style={{
                border: "1px solid #2a2a40",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #2a2a40",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#0d0d16",
                  fontSize: "13px",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 8l6 6" />
                  <path d="M4 14l6-6 2-3" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="M22 22l-5-10-5 10" />
                  <path d="M14 18h6" />
                </svg>
                <span style={{ color: "#9898b0" }}>Prelozit do:</span>
                <select
                  value={translateLang}
                  onChange={(e) => setTranslateLang(e.target.value)}
                  style={{
                    background: "#0a0a0f",
                    border: "1px solid #2a2a40",
                    borderRadius: "6px",
                    color: "#e8e8f0",
                    padding: "3px 8px",
                    fontSize: "12px",
                    outline: "none",
                  }}
                >
                  {TRANSLATE_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTranslate}
                  disabled={translating}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: translating ? "#2a2a40" : "linear-gradient(135deg, #818cf8, #6366f1)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: translating ? "not-allowed" : "pointer",
                    marginLeft: "auto",
                  }}
                >
                  {translating ? "Prekladam..." : "Prelozit"}
                </button>
              </div>

              {/* Translation result */}
              {(translatedText || translating) && (
                <div style={{ padding: "12px" }}>
                  {translating && !translatedText && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#9898b0",
                        fontSize: "13px",
                      }}
                    >
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid #2a2a40",
                          borderTopColor: "#818cf8",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      Prekladam...
                    </div>
                  )}
                  {translatedText && (
                    <>
                      <div
                        style={{
                          background: "#0a0a0f",
                          borderRadius: "6px",
                          padding: "12px",
                          maxHeight: "160px",
                          overflowY: "auto",
                          fontSize: "13px",
                          color: "#e8e8f0",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          marginBottom: "8px",
                        }}
                      >
                        {translatedText}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {onInsert && (
                          <button
                            onClick={() => onInsert(translatedText)}
                            style={{
                              flex: 1,
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "none",
                              background: "linear-gradient(135deg, #6366f1, #818cf8)",
                              color: "#fff",
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            Vlozit preklad
                          </button>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(translatedText)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #2a2a40",
                            background: "transparent",
                            color: "#9898b0",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Kopirovat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
