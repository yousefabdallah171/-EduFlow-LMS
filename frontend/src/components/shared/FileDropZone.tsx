import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

interface FileDropZoneProps {
  onFilesDrop: (files: File[]) => void;
  accept?: string;
  disabled?: boolean;
}

export function FileDropZone({ onFilesDrop, accept, disabled }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesDrop(files);
      }
    },
    [onFilesDrop]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files) {
        onFilesDrop(Array.from(files));
        e.currentTarget.value = "";
      }
    },
    [onFilesDrop]
  );

  return (
    <>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-blue-400"
        } ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
            : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          Drop files here to upload
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          or click to browse
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept={accept}
        disabled={disabled}
      />
    </>
  );
}
