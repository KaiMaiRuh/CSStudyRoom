import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ImagePreviewModal.css';

const PREVIEW_EXIT_MS = 300;

const ImagePreviewModal = ({ src, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      onClose?.();
    }, PREVIEW_EXIT_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [requestClose]);

  if (!src) return null;

  return (
    <div
      className={`create-post-modal ${isClosing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={requestClose}
    >
      <div
        className={`create-post-container image-preview-container ${isClosing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title"></h2>
          <button className="close-button" type="button" onClick={requestClose} aria-label="Close" disabled={isClosing}>
            ×
          </button>
        </div>

        <img className="image-preview-img" src={src} alt="" />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
