import { useState, useRef, useEffect } from 'react'
import { importCSV, downloadSampleCSV } from '../services/importService'
import './ImportModal.css'

const ImportModal = ({ isOpen, onClose, onUploadSuccess }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])


  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
        setError('')
        setResult(null)
      } else {
        setError('Only .csv files are supported')
      }
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile)
        setError('')
        setResult(null)
      } else {
        setError('Only .csv files are supported')
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const handleDownloadSample = async () => {
    try {
      await downloadSampleCSV()
    } catch (err) {
      setError('Failed to download sample CSV template')
    }
  }

  const handleImportSubmit = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    
    try {
      const data = await importCSV(file)
      if (data.success) {
        setResult(data.data)
        // Refresh products list in parent dashboard
        if (onUploadSuccess) onUploadSuccess()
      } else {
        setError(data.message || 'Import failed')
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Something went wrong during import')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="import-modal-overlay" onClick={handleClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="import-modal-header">
          <div className="import-header-title-block">
            <svg className="import-modal-header-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <h3>Import Inventory CSV</h3>
          </div>
          <button className="import-close-btn" onClick={handleClose}>&times;</button>
        </div>

        <div className="import-modal-content">
          
          {/* Explanation panel */}
          <div className="import-instructions-box">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg className="import-info-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0a1638' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              How Import Works:
            </h4>
            <ul>
              <li><strong>SKU Tracking:</strong> Products are matched strictly using the <code>sku</code> column. Ensure the SKU exists in the database.</li>
              <li><strong>Data Updates:</strong> Non-empty columns in the CSV will overwrite matching properties on the server.</li>
              <li><strong>Multi-Row Images:</strong> Multiple image rows with the same SKU are merged automatically into the product's image collection based on <code>imagePosition</code>.</li>
            </ul>
            <button 
              className="import-sample-btn" 
              onClick={handleDownloadSample}
              type="button"
            >
              <svg className="import-download-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Sample Sheet Template (.csv)
            </button>
          </div>

          {/* Upload Drop Zone */}
          {!result && (
            <div 
              className={`import-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="import-file-input-hidden" 
                accept=".csv"
                onChange={handleFileChange}
              />
              
              <div className="import-zone-content">
                {file ? (
                  <>
                    <svg className="import-zone-svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <div className="import-file-info">
                      <strong>{file.name}</strong>
                      <span>{(file.size / 1024).toFixed(2)} KB</span>
                    </div>
                  </>
                ) : (
                  <>
                    <svg className="import-zone-svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="import-prompt">
                      <strong>Drag & drop your CSV file here</strong>
                      <span>or click to browse local files</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="import-loading-panel">
              <div className="import-spinner"></div>
              <span>Uploading and updating products...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="import-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Results Summary Panel */}
          {result && (
            <div className="import-results-panel">
              <div className="results-title-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '16px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h4 className="results-title" style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Import Complete!</h4>
              </div>
              
              <div className="results-grid">
                <div className="results-card processed">
                  <span className="count-num">{result.totalProcessed}</span>
                  <span className="count-label">SKUs Parsed</span>
                </div>
                <div className="results-card updated">
                  <span className="count-num">{result.updatedCount}</span>
                  <span className="count-label">Updated</span>
                </div>
                <div className="results-card skipped">
                  <span className="count-num">{result.skippedCount}</span>
                  <span className="count-label">Skipped</span>
                </div>
                {result.failedCount > 0 && (
                  <div className="results-card failed">
                    <span className="count-num">{result.failedCount}</span>
                    <span className="count-label">Failed</span>
                  </div>
                )}
              </div>

              {/* Error list for individual rows */}
              {result.errors && result.errors.length > 0 && (
                <div className="import-errors-log">
                  <h5>Row Errors Log:</h5>
                  <div className="errors-log-list">
                    {result.errors.map((err, i) => (
                      <div key={i} className="error-log-item">
                        <strong>SKU {err.sku}:</strong> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <div className="import-modal-actions">
          <button 
            className="import-btn cancel" 
            onClick={handleClose} 
            disabled={loading}
            type="button"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          
          {!result && file && (
            <button 
              className="import-btn confirm" 
              onClick={handleImportSubmit} 
              disabled={loading}
              type="button"
            >
              Start Import
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default ImportModal
