import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './CreatePost.css';
import './ImagePreviewModal.css';

const PREVIEW_EXIT_MS = 300;

const ImagePreviewModal = ({ src, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const isClosingRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose?.();
    }, PREVIEW_EXIT_MS);
  }, [clearCloseTimer, onClose]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') requestClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [requestClose]);

  useEffect(() => () => {
    clearCloseTimer();
  }, [clearCloseTimer]);

  if (!src) return null;

  const modalContent = (
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

  if (typeof document === 'undefined') return modalContent;

  return createPortal(modalContent, document.body);
};

export default ImagePreviewModal;
