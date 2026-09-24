"use client";

import { useRef, useState } from "react";

export function ImageUpload({ articleId, action, uploaded }: {
  articleId: string;
  action: (formData: FormData) => void | Promise<void>;
  uploaded?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [dragging, setDragging] = useState(false);
  return (
    <>
      <form action={action} encType="multipart/form-data">
        <input type="hidden" name="id" value={articleId} />
        <input ref={input} className="image-file-input" type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" required onChange={(event) => setName(event.target.files?.[0]?.name || "")} />
        <button className={`image-dropzone${dragging ? " image-dropzone-active" : ""}`} type="button" onClick={() => input.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && input.current) { const transfer = new DataTransfer(); transfer.items.add(file); input.current.files = transfer.files; setName(file.name); } }}>
          <strong>{name || "Bild hier ablegen"}</strong>
          <span>{name ? "Datei ausgewählt · zum Ändern klicken" : "oder klicken, um eine Bilddatei auszuwählen"}</span>
        </button>
        <button className="button button-secondary" type="submit">Bild hochladen</button>
      </form>
      {uploaded && <p className="success">Bildsyntax zum Einfügen: <code>![Bildbeschreibung]({uploaded})</code></p>}
    </>
  );
}
