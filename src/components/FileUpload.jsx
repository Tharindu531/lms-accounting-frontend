import { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText, Presentation, Loader2 } from 'lucide-react';

const FileUpload = ({ onUpload, accept, maxSize = 20, multiple = false, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const acceptedTypes = accept || '.jpg,.jpeg,.png,.gif,.pdf,.ppt,.pptx';

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    e.target.value = ''; // Reset input
  };

  const handleFiles = async (files) => {
    setError('');

    for (const file of files) {
      // Validate file size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File "${file.name}" is too large. Max size: ${maxSize}MB`);
        continue;
      }

      try {
        setUploading(true);
        await onUpload(file);
      } catch (err) {
        setError(err.response?.data?.message || `Failed to upload "${file.name}"`);
      }
    }
    setUploading(false);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
            <p className="text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="text-gray-400 mb-2" size={32} />
            <p className="text-gray-600 mb-1">
              Drag & drop files here, or <span className="text-indigo-600">browse</span>
            </p>
            <p className="text-xs text-gray-400">
              Supports: Images, PDFs, PowerPoint presentations (Max: {maxSize}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export const FileList = ({ files, onDelete, showDelete = true }) => {
  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'IMAGE':
        return <Image className="text-green-600" size={20} />;
      case 'PDF':
        return <FileText className="text-red-600" size={20} />;
      case 'PRESENTATION':
        return <Presentation className="text-orange-600" size={20} />;
      default:
        return <File className="text-gray-600" size={20} />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center gap-3">
            {getFileIcon(file.fileType)}
            <div>
              <p className="text-sm font-medium text-gray-800 truncate max-w-xs">
                {file.originalFileName || file.fileName}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 text-sm"
            >
              View
            </a>
            {showDelete && onDelete && (
              <button
                onClick={() => onDelete(file.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileUpload;
