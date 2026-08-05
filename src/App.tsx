import React, { useCallback, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFUploader } from './components/PDFUploader';
import { PDFViewer } from './components/PDFViewer';
import { FieldEditor } from './components/FieldEditor';
import { FieldList } from './components/FieldList';
import { ExportPanel } from './components/ExportPanel';
import { ImportPanel } from './components/ImportPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { Field, FieldType } from './types/Field';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const FIELD_TYPES: FieldType[] = [
  'text',
  'multiline',
  'checkbox',
  'date',
  'currency',
  'table',
];

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [defaultType, setDefaultType] = useState<FieldType>('text');
  const [gridSize, setGridSize] = useState(4);
  const [enableOCR, setEnableOCR] = useState(false);
  const [enableAutoDetect, setEnableAutoDetect] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [capabilityId, setCapabilityId] = useState('');

  // Load total pages when file changes
  useEffect(() => {
    if (!pdfFile) return;
    let cancelled = false;
    pdfFile.arrayBuffer().then((buf) => {
      if (cancelled) return;
      pdfjsLib.getDocument({ data: buf }).promise.then((pdf) => {
        if (cancelled) return;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
      });
    });
    return () => { cancelled = true; };
  }, [pdfFile]);

  const handleFileLoaded = useCallback((file: File) => {
    setPdfFile(file);
    setFields([]);
    setSelectedId(null);
    setCurrentPage(1);
  }, []);

  const handleFieldAdded = useCallback((field: Field) => {
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }, []);

  const handleFieldChanged = useCallback((updated: Field) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  const handleFieldDeleted = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);
  
  const handleImport = useCallback((importedFields: Field[]) => {
    setFields(importedFields);
    setSelectedId(null);
  }, []);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <span className="app-logo">📐</span>
          <div>
            <h1 className="app-title">PDF Field Mapper</h1>
            <p className="app-sub">Visual overlay → schema generator</p>
          </div>
        </div>
        <div className="app-header-right">
          {pdfFile && (
            <>
              <label className="ctrl-label">Draw as:</label>
              <select
                className="ctrl-select"
                value={defaultType}
                onChange={(e) => setDefaultType(e.target.value as FieldType)}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <label className="ctrl-label">Capability:</label>
              <input
                className="ctrl-select"
                type="text"
                value={capabilityId}
                onChange={(e) => setCapabilityId(e.target.value)}
                placeholder="carrier.form.001"
                title="Used for manifest/mapping/questions capability ids and target prefixes"
              />
              
              <label className="ctrl-label">Grid:</label>
              <select
                className="ctrl-select"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
              >
                <option value={0}>Off</option>
                <option value={2}>2px</option>
                <option value={4}>4px</option>
                <option value={8}>8px</option>
                <option value={16}>16px</option>
              </select>
              
              <label className="ctrl-check">
                <input
                  type="checkbox"
                  checked={enableOCR}
                  onChange={(e) => setEnableOCR(e.target.checked)}
                />
                OCR
              </label>
              
              <label className="ctrl-check">
                <input
                  type="checkbox"
                  checked={enableAutoDetect}
                  onChange={(e) => setEnableAutoDetect(e.target.checked)}
                />
                Auto-detect
              </label>
              
              <label className="ctrl-check">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                />
                Debug
              </label>
              
              <div className="ctrl-view-toggle">
                <button
                  className={`ctrl-toggle-btn ${viewMode === 'edit' ? 'active' : ''}`}
                  onClick={() => setViewMode('edit')}
                >
                  ✏️ Edit
                </button>
                <button
                  className={`ctrl-toggle-btn ${viewMode === 'preview' ? 'active' : ''}`}
                  onClick={() => setViewMode('preview')}
                >
                  👁️ Preview
                </button>
              </div>
              
              <button
                className="ctrl-reset"
                onClick={() => {
                  setPdfFile(null);
                  setFields([]);
                  setSelectedId(null);
                }}
              >
                Upload new PDF
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-body">
        {!pdfFile ? (
          <div className="upload-wrap">
            <PDFUploader onFileLoaded={handleFileLoaded} />
          </div>
        ) : (
          <div className="workspace">
            {viewMode === 'edit' ? (
              <>
                {/* Left sidebar */}
                <aside className="sidebar">
                  <section className="sidebar-section">
                    <ImportPanel onImport={handleImport} />
                  </section>
                
                  <section className="sidebar-section">
                    <h2 className="sidebar-heading">Fields ({fields.length})</h2>
                    <FieldList
                      fields={fields}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onDelete={handleFieldDeleted}
                    />
                  </section>

                  {selectedField && (
                    <section className="sidebar-section">
                      <FieldEditor
                        field={selectedField}
                        onChange={handleFieldChanged}
                        onDelete={handleFieldDeleted}
                      />
                    </section>
                  )}

                  <section className="sidebar-section">
                    <ExportPanel
                      fields={fields}
                      capabilityId={capabilityId}
                    />
                  </section>
                </aside>

                {/* PDF canvas area */}
                <div className="viewer-wrap">
                  <PDFViewer
                    file={pdfFile}
                    fields={fields}
                    selectedId={selectedId}
                    debugMode={debugMode}
                    defaultType={defaultType}
                    gridSize={gridSize}
                    enableOCR={enableOCR}
                    enableAutoDetect={enableAutoDetect}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onFieldAdded={handleFieldAdded}
                    onFieldSelected={setSelectedId}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Preview mode - full width */}
                <div className="preview-wrap">
                  <PreviewPanel fields={fields} pdfFile={pdfFile} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
