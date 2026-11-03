import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { errorMessage } from '../lib/errors';
import { cn } from '../lib/cn';

/** Drop zone or file picker. Uploads one file at a time through `onUpload(file)`. */
const FileUpload = ({ onUpload, accept, maxSize = 20, multiple = false, disabled = false, hint }) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState('');
  const input = useRef(null);
  const types = accept || '.jpg,.jpeg,.png,.gif,.webp,.pdf,.ppt,.pptx';

  const handle = async (files) => {
    setError('');
    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) { setError(`"${file.name}" is larger than ${maxSize} MB.`); continue; }
      try { setUploading(file.name); await onUpload(file); }
      catch (err) { setError(errorMessage(err, `"${file.name}" didn't upload.`)); }
    }
    setUploading(null);
  };

  return (
    <div>
      <button type="button" disabled={disabled || !!uploading} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) handle(Array.from(e.dataTransfer.files)); }}
        className={cn('w-full rounded-panel border border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-brand bg-brand-soft' : 'border-line-strong hover:border-brand hover:bg-sunken/50',
          (disabled || uploading) && 'opacity-60 cursor-not-allowed')}>
        {uploading ? (
          <span className="flex flex-col items-center gap-1.5 text-sm text-ink-2"><Loader2 className="animate-spin text-brand" size={24} aria-hidden />Uploading {uploading}…</span>
        ) : (
          <span className="flex flex-col items-center gap-1 text-sm">
            <Upload className="text-ink-3 mb-1" size={22} aria-hidden />
            <span><span className="text-brand font-medium">Choose files</span> or drop them here</span>
            <span className="text-xs text-ink-3">{hint ?? `Images, PDF or PowerPoint, up to ${maxSize} MB`}</span>
          </span>
        )}
      </button>
      <input ref={input} type="file" accept={types} multiple={multiple} className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => { handle(Array.from(e.target.files)); e.target.value = ''; }} />
      {error && <p role="alert" className="text-sm text-debit mt-2">{error}</p>}
    </div>
  );
};

export default FileUpload;
