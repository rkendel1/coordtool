import React, { useCallback, useState } from 'react';
import './PDFUploader.css';

interface Props {
  onFileLoaded: (file: File) => void;
}

export const PDFUploader: React.FC<Props> = ({ onFileLoaded }) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        onFileLoaded(file);
      }
    },
    [onFileLoaded]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileLoaded(file);
  };

  return (
    <div
      className={`uploader${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="uploader-icon">📄</div>
      <p className="uploader-title">Upload a PDF Form</p>
      <p className="uploader-sub">Drag &amp; drop or click to select</p>
      <label className="uploader-btn">
        Choose File
        <input
          type="file"
          accept="application/pdf"
          hidden
          onChange={handleChange}
        />
      </label>
    </div>
  );
};
