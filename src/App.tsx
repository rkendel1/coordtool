import React, { useCallback, useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFUploader } from './components/PDFUploader';
import { PDFViewer } from './components/PDFViewer';
import { FieldEditor } from './components/FieldEditor';
import { FieldList } from './components/FieldList';
import { ExportPanel } from './components/ExportPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { Field, FieldType } from './types/Field';
import { inferCapabilityId } from './utils/capability';
import {
  ensureUniqueFieldName,
  normalizeSemanticField,
  requiresSemanticCorrection,
  suggestSemanticKey,
} from './utils/fieldNames';
import { inferFieldMetadata } from './utils/fieldInference';
import {
  capabilityForAcord,
  detectDocumentProfile,
  DocumentProfile,
} from './utils/documentProfile';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const FIELD_TYPES: FieldType[] = [
  'text',
  'multiline',
  'checkbox',
  'date',
  'dob',
  'currency',
  'phone',
  'ssn',
  'ein',
  'zip',
  'signature',
  'initials',
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
  const [enableAutoDetect, setEnableAutoDetect] = useState(true);
  const [showFieldOverlays, setShowFieldOverlays] = useState(true);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [capabilityId, setCapabilityId] = useState('');
  const [documentProfile, setDocumentProfile] = useState<DocumentProfile>({ kind: 'generic' });

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
        pdf.getPage(1).then(page => page.getTextContent()).then(content => {
          if (cancelled) return;
          const text = content.items
            .map((item: any) => typeof item.str === 'string' ? item.str : '')
            .join(' ');
          const profile = detectDocumentProfile(pdfFile.name, text);
          setDocumentProfile(profile);
          if (profile.kind === 'acord') {
            setEnableOCR(false);
            setCapabilityId(capabilityForAcord(profile));
          } else {
            setCapabilityId(inferCapabilityId(pdfFile.name, text));
          }
        }).catch(() => {
          if (!cancelled) {
            const profile = detectDocumentProfile(pdfFile.name);
            setDocumentProfile(profile);
            setCapabilityId(profile.kind === 'acord'
              ? capabilityForAcord(profile)
              : inferCapabilityId(pdfFile.name));
          }
        });
      });
    });
    return () => { cancelled = true; };
  }, [pdfFile]);

  const handleFileLoaded = useCallback((file: File) => {
    setPdfFile(file);
    setFields([]);
    setSelectedId(null);
    setCurrentPage(1);
    setEnableAutoDetect(true);
    setShowFieldOverlays(true);
    setCapabilityId(inferCapabilityId(file.name));
    const profile = detectDocumentProfile(file.name);
    setDocumentProfile(profile);
    if (profile.kind === 'acord') setCapabilityId(capabilityForAcord(profile));
  }, []);

  const handleFieldAdded = useCallback((field: Field) => {
    setFields((prev) => {
      const duplicate = prev.some((existing) =>
        existing.id === field.id ||
        (existing.page === field.page &&
          Math.abs(existing.x - field.x) < 4 &&
          Math.abs(existing.y - field.y) < 4 &&
          Math.abs(existing.width - field.width) < 6 &&
          Math.abs(existing.height - field.height) < 6)
      );
      return duplicate ? prev : [
        ...prev,
        ensureUniqueFieldName(normalizeSemanticField(inferFieldMetadata(field)), prev),
      ];
    });
    setSelectedId((current) => current ?? field.id);
  }, []);

  const handleFieldChanged = useCallback((updated: Field) => {
    setFields((prev) => prev.map((field) => {
      if (field.id !== updated.id) return field;
      const evidenceChanged = field.sourceFieldId !== updated.sourceFieldId ||
        field.displayLabel !== updated.displayLabel;
      const typeWasNotManuallyChanged = field.type === updated.type;
      const repaired = evidenceChanged ? normalizeSemanticField(updated) : updated;
      return evidenceChanged && typeWasNotManuallyChanged
        ? inferFieldMetadata(repaired)
        : repaired;
    }));
  }, []);

  const handleFieldDeleted = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleGeneratedFieldsReset = useCallback(() => {
    setFields((previous) => previous.filter((field) =>
      !field.id.startsWith('auto-') && !/^acord-125-v\d+-/.test(field.id)));
    setSelectedId((previous) => previous?.startsWith('auto-') ? null : previous);
  }, []);

  // Flattened-page detections are provisional output from the opt-in OCR
  // fallback. Remove them when that fallback is disabled; native and manually
  // drawn fields use different id prefixes and remain untouched.
  useEffect(() => {
    if (enableOCR) return;
    setFields((prev) => prev.filter((field) => !field.id.startsWith('flat-')));
    setSelectedId((prev) => prev?.startsWith('flat-') ? null : prev);
  }, [enableOCR]);

  useEffect(() => {
    const handleDeleteKey = (event: KeyboardEvent) => {
      if (!selectedId || viewMode !== 'edit' ||
          (event.key !== 'Delete' && event.key !== 'Backspace')) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      handleFieldDeleted(selectedId);
    };
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [selectedId, viewMode, handleFieldDeleted]);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;
  const semanticWarnings = fields.filter(field =>
    requiresSemanticCorrection(field)
  ).length;

  const handleApplyAllSemanticSuggestions = useCallback(() => {
    setFields(previous => previous.map(field =>
      requiresSemanticCorrection(field)
        ? { ...field, semanticKey: suggestSemanticKey(field), semanticKeyOverride: false }
        : field
    ));
  }, []);

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

              <label className="ctrl-label">Capability (inferred):</label>
              <input
                className="ctrl-select"
                type="text"
                value={capabilityId}
                onChange={(e) => setCapabilityId(e.target.value)}
                placeholder="document.example"
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
              
              {documentProfile.kind === 'acord' ? (
                <span className="ctrl-mode-badge" title="ACORD fields are read from the PDF's authoritative widgets">
                  ACORD {documentProfile.formNumber || ''} layout mode
                </span>
              ) : (
                <label className="ctrl-check">
                  <input
                    type="checkbox"
                    checked={enableOCR}
                    onChange={(e) => setEnableOCR(e.target.checked)}
                  />
                  OCR fallback
                </label>
              )}
              
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

              <label className="ctrl-check">
                <input
                  type="checkbox"
                  checked={showFieldOverlays}
                  onChange={(e) => setShowFieldOverlays(e.target.checked)}
                />
                Show fields
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

              <ExportPanel
                fields={fields}
                templateFile={pdfFile}
                capabilityId={capabilityId}
                compact
              />
              
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
                  <section className="sidebar-section sidebar-fields">
                    <div className="sidebar-heading-row">
                      <h2 className="sidebar-heading">Fields ({fields.length})</h2>
                      {semanticWarnings > 0 && (
                        <button
                          type="button"
                          className="sidebar-fix-button"
                          onClick={handleApplyAllSemanticSuggestions}
                          title="Apply suggested semantic keys to all warned fields"
                        >
                          ⚠ Fix all ({semanticWarnings})
                        </button>
                      )}
                    </div>
                    <FieldList
                      fields={fields}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onDelete={handleFieldDeleted}
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
                    showFieldOverlays={showFieldOverlays}
                    defaultType={defaultType}
                    gridSize={gridSize}
                    enableOCR={enableOCR}
                    enableAutoDetect={enableAutoDetect}
                    documentProfile={documentProfile}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onFieldAdded={handleFieldAdded}
                    onGeneratedFieldsReset={handleGeneratedFieldsReset}
                    onFieldSelected={setSelectedId}
                  />
                </div>

                {/* Right editor sidebar */}
                <aside className="editor-sidebar">
                  {selectedField ? (
                    <FieldEditor
                      field={selectedField}
                      onChange={handleFieldChanged}
                      onDelete={handleFieldDeleted}
                    />
                  ) : (
                    <div className="editor-empty">Select a field to edit it.</div>
                  )}
                </aside>
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
