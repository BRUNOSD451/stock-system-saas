import { useEffect, useRef, useState } from "react";

import { Upload } from "lucide-react";
import "./profileImagePicker.css";

export default function ProfileImagePicker({ image, currentUrl, onChange, disabled = false }: {
  image: File | null;
  currentUrl?: string | null;
  onChange: (image: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!image) { setPreview(""); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  return <div className="profile-image-picker">
    <span className="profile-image-picker-label">Foto de perfil <span className="optional-label">(opcional)</span></span>
    {(preview || currentUrl) && <img src={preview || currentUrl || undefined} alt="Prévia da foto de perfil" className="profile-image-picker-preview" />}
    <input ref={inputRef} hidden aria-label="Selecionar foto de perfil" type="file" accept="image/*" disabled={disabled} onChange={(event) => {
      const file = event.target.files?.[0] ?? null;
      setError("");
      if (file && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
        setError("Selecione uma imagem de até 5 MB.");
        event.target.value = "";
        onChange(null);
        return;
      }
      onChange(file);
    }} />
    <div className="profile-image-picker-controls">
      <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <Upload size={16} aria-hidden="true" /> Escolher foto
      </button>
      <span className="profile-image-picker-filename" title={image?.name}>{image?.name || "Nenhuma foto selecionada"}</span>
    </div>
    <span className="profile-image-picker-hint">Imagem de até 5 MB.</span>
    {error && <span className="field-error" role="alert">{error}</span>}
  </div>;
}
