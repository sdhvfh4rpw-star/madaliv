import { useRef, useState } from 'react'
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react'

/**
 * Composant de téléchargement de photo avec prévisualisation.
 * Accepte caméra + galerie sur mobile (capture="environment" ou "user").
 */
export default function PhotoUpload({
  label,
  description,
  value,          // data-URL ou URL Supabase
  onChange,       // (dataURL, file) => void
  capture = 'environment',
  required = false,
  error = false,
}) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(value || null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataURL = ev.target.result
      setPreview(dataURL)
      onChange?.(dataURL, file)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        {required && <span className="text-brand-500 text-xs">*</span>}
        {preview && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`relative w-full rounded-2xl overflow-hidden border-2 transition
          ${error && !preview ? 'border-red-400 bg-red-50' : preview ? 'border-green-400 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50'}`}
        style={{ minHeight: preview ? 140 : 100 }}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="w-full h-36 object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="bg-white/90 rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-semibold text-gray-700">
                <RefreshCw size={13} /> Changer
              </div>
            </div>
            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
              <CheckCircle2 size={12} className="text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className={`rounded-2xl p-3 ${error ? 'bg-red-100' : 'bg-gray-100'}`}>
              <Camera size={24} className={error ? 'text-red-400' : 'text-gray-400'} />
            </div>
            <p className={`text-xs font-medium ${error ? 'text-red-500' : 'text-gray-500'}`}>
              {description}
            </p>
            <p className="text-[10px] text-gray-400">Appuyez pour prendre une photo</p>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
