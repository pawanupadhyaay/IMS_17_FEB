import { useState, useRef, useEffect } from 'react'
import './MobileFAB.css'

const MobileFAB = ({ onCreateProduct, onExportCSV, onImportCSV }) => {
  const [isOpen, setIsOpen] = useState(false)
  const fabRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleAction = (action) => {
    setIsOpen(false)
    if (action === 'create') {
      onCreateProduct()
    } else if (action === 'export') {
      onExportCSV()
    } else if (action === 'import') {
      onImportCSV()
    }
  }

  return (
    <div className="mobile-fab-container" ref={fabRef}>
      <div className={`mobile-fab-menu ${isOpen ? 'open' : ''}`}>
        <button
          className="mobile-fab-item"
          onClick={() => handleAction('export')}
          aria-label="Export CSV"
        >
          <span className="fab-icon">📤</span>
          <span className="fab-label">Export CSV</span>
        </button>
        <button
          className="mobile-fab-item"
          onClick={() => handleAction('import')}
          aria-label="Import CSV"
        >
          <span className="fab-icon">📥</span>
          <span className="fab-label">Import CSV</span>
        </button>
        <button
          className="mobile-fab-item"
          onClick={() => handleAction('create')}
          aria-label="Add Product"
        >
          <span className="fab-icon">+</span>
          <span className="fab-label">Add Product</span>
        </button>
      </div>
      <button
        className={`mobile-fab ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Actions menu"
      >
        <span className="fab-main-icon">{isOpen ? '×' : '+'}</span>
      </button>
    </div>
  )
}

export default MobileFAB

