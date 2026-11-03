import { useEffect, useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

const FileViewer = ({ file, onClose }) => {
  const [zoom, setZoom] = useState(100);

  // Escape closes, and the page behind doesn't scroll while the viewer is open.
  useEffect(() => {
    if (!file) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [file, onClose]);

  if (!file) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = file.url || file.presignedUrl;
    link.download = file.originalFileName || file.fileName;
    link.target = '_blank';
    link.click();
  };

  const handleOpenExternal = () => {
    window.open(file.url || file.presignedUrl, '_blank');
  };

  const renderContent = () => {
    const fileType = file.fileType;
    const url = file.presignedUrl || file.url;

    if (fileType === 'IMAGE') {
      return (
        <div className="flex items-center justify-center h-full overflow-auto p-4">
          <img
            src={url}
            alt={file.originalFileName}
            style={{ transform: `scale(${zoom / 100})` }}
            className="max-w-full max-h-full object-contain transition-transform"
          />
        </div>
      );
    }

    if (fileType === 'PDF') {
      return (
        <div className="h-full w-full">
          <iframe
            src={`${url}#toolbar=1&navpanes=0`}
            className="w-full h-full border-0"
            title={file.originalFileName}
          />
        </div>
      );
    }

    // Fallback for other file types
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-gray-600 mb-4">Preview not available for this file type.</p>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Download size={18} />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex flex-col" role="dialog" aria-modal="true" aria-label={file.originalFileName || file.fileName}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div className="flex items-center gap-4">
          <h3 className="font-medium truncate max-w-md">{file.originalFileName || file.fileName}</h3>
          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">{file.fileType}</span>
        </div>

        <div className="flex items-center gap-2">
          {file.fileType === 'IMAGE' && (
            <>
              <button
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                className="p-2.5 hover:bg-gray-700 rounded"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-sm w-16 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                className="p-2.5 hover:bg-gray-700 rounded"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn size={20} />
              </button>
            </>
          )}

          <button
            onClick={handleOpenExternal}
            className="p-2.5 hover:bg-gray-700 rounded"
            title="Open in New Tab"
                aria-label="Open in New Tab"
          >
            <ExternalLink size={20} />
          </button>

          <button
            onClick={handleDownload}
            className="p-2.5 hover:bg-gray-700 rounded"
            title="Download"
                aria-label="Download"
          >
            <Download size={20} />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-700 rounded ml-2"
            title="Close"
                aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-800">
        {renderContent()}
      </div>
    </div>
  );
};

export const FilePreviewList = ({ files, onView }) => {
  if (!files || files.length === 0) return null;

  const getPreviewThumbnail = (file) => {
    if (file.fileType === 'IMAGE') {
      return (
        <img
          src={file.url}
          alt={file.originalFileName}
          className="w-full h-full object-cover"
        />
      );
    }

    const icons = {
      PDF: (
        <div className="w-full h-full bg-red-100 flex items-center justify-center">
          <span className="text-red-600 font-bold text-lg">PDF</span>
        </div>
      ),
      PRESENTATION: (
        <div className="w-full h-full bg-orange-100 flex items-center justify-center">
          <span className="text-orange-600 font-bold text-lg">PPT</span>
        </div>
      ),
      DOCUMENT: (
        <div className="w-full h-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">DOC</span>
        </div>
      ),
    };

    return icons[file.fileType] || (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-600 font-bold text-lg">FILE</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => onView(file)}
          className="aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-indigo-500 transition-colors"
        >
          {getPreviewThumbnail(file)}
        </button>
      ))}
    </div>
  );
};

export default FileViewer;
