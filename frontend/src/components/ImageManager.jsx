import { memo, useState } from 'react'
import './ImageManager.css'

const ImageManager = memo(({ images = [], onChange, onReorder, disabled = false }) => {
  const [newImageUrl, setNewImageUrl] = useState('')
  const [dragIndex, setDragIndex] = useState(null)

  // 🔥 Use images directly (NO FILTERING)
  const imageList = Array.isArray(images) ? images : []

  const handleAddImage = () => {
    if (typeof newImageUrl !== 'string') return

    const url = newImageUrl.trim()
    if (!url) return

    try {
      new URL(url)
      if (onChange) {
        onChange([...imageList, url])
      }
      setNewImageUrl('')
    } catch (e) {
      alert('Please enter a valid URL')
    }
  }

  const handleRemoveImage = (index) => {
    if (!onChange) return
    const updated = imageList.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleDragStart = (e, index) => {
    if (disabled) return
    setDragIndex(index)

    // Required for proper HTML5 drag behaviour
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", index.toString())
  }

  const handleDragOver = (e) => {
    if (disabled) return
    e.preventDefault()
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()

    if (disabled) return

    const sourceIndex = dragIndex ?? parseInt(e.dataTransfer.getData("text/plain"), 10)

    if (sourceIndex == null || sourceIndex === dropIndex) {
      setDragIndex(null)
      return
    }

    const nextImages = [...imageList]
    const [movedItem] = nextImages.splice(sourceIndex, 1)
    nextImages.splice(dropIndex, 0, movedItem)

    setDragIndex(null)

    if (onChange) onChange(nextImages)
    if (onReorder) onReorder(nextImages)
  }

  // --- Touch Events for Mobile ---
  const handleTouchStart = (e, index) => {
    if (disabled) return
    setDragIndex(index)

    // Optional: give visual feedback immediately
    e.target.closest('.image-manager-item').classList.add('dragging')
  }

  const handleTouchMove = (e) => {
    if (disabled || dragIndex === null) return
    e.preventDefault() // prevent scrolling while dragging
  }

  const handleTouchEnd = (e) => {
    if (disabled || dragIndex === null) return

    e.target.closest('.image-manager-item')?.classList.remove('dragging')

    // Find the element at the drop position
    const touch = e.changedTouches[0]
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY)
    const dropItem = dropTarget?.closest('.image-manager-item')

    if (dropItem) {
      const dropIndex = parseInt(dropItem.getAttribute('data-index'), 10)
      if (!isNaN(dropIndex) && dropIndex !== dragIndex) {
        const nextImages = [...imageList]
        const [movedItem] = nextImages.splice(dragIndex, 1)
        nextImages.splice(dropIndex, 0, movedItem)

        if (onChange) onChange(nextImages)
        if (onReorder) onReorder(nextImages)
      }
    }

    setDragIndex(null)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddImage()
    }
  }

  return (
    <div className="image-manager">
      <div className="image-manager-input-group">
        <input
          type="text"
          value={newImageUrl}
          onChange={(e) => setNewImageUrl(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Paste image URL here"
          disabled={disabled}
          className="image-manager-input"
        />
        <button
          type="button"
          onClick={handleAddImage}
          disabled={disabled || !newImageUrl.trim()}
          className="image-manager-add-btn"
        >
          Add Image
        </button>
      </div>

      {imageList.length > 0 && (
        <>
          <p className="image-manager-hint">
            Drag and drop to reorder. First image will be used as primary thumbnail.
          </p>

          <div className="image-manager-grid">
            {imageList.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className={`image-manager-item ${dragIndex === index ? 'dragging' : ''}`}
                data-index={index}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => setDragIndex(null)}
                // Touch synthetic events
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="image-manager-thumb">
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      e.target.src =
                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%23ddd" width="120" height="120"/%3E%3Ctext fill="%23999" font-size="12" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EInvalid%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="image-manager-remove"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                )}

                {index === 0 && (
                  <span className="image-manager-primary-badge">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
})

ImageManager.displayName = 'ImageManager'

export default ImageManager