import { Eye, Trash2, Image as ImageIcon, FileText, File as FileIcon, Presentation } from 'lucide-react';
import Button from './ui/Button';

const icon = (t) => ({ IMAGE: ImageIcon, PDF: FileText, PPT: Presentation, PPTX: Presentation }[t] ?? FileIcon);
const size = (b) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Uploaded files with open and (optionally) delete. */
const FileList = ({ files, onDelete, onView, showDelete = true }) => {
  if (!files?.length) return null;
  return (
    <ul className="divide-y divide-line border border-line rounded-panel mt-3">
      {files.map((f) => {
        const Icon = icon(f.fileType);
        return (
          <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
            <Icon size={18} className="text-ink-3 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{f.originalFileName || f.fileName}</span>
              <span className="block text-xs text-ink-3">{size(f.fileSize)}</span>
            </span>
            {onView
              ? <Button variant="ghost" size="icon-sm" aria-label={`Open ${f.originalFileName}`} onClick={() => onView(f)}><Eye size={16} /></Button>
              : <a href={f.presignedUrl || f.url} target="_blank" rel="noreferrer" className="h-8 w-8 grid place-items-center rounded-[8px] text-ink-2 hover:bg-sunken" aria-label={`Open ${f.originalFileName}`}><Eye size={16} /></a>}
            {showDelete && onDelete && <Button variant="danger-ghost" size="icon-sm" aria-label={`Delete ${f.originalFileName}`} onClick={() => onDelete(f.id)}><Trash2 size={16} /></Button>}
          </li>
        );
      })}
    </ul>
  );
};

export default FileList;
