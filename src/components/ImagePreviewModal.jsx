import React, { useEffect } from 'react';
import './ImagePreviewModal.css';

const ImagePreviewModal = ({ src, onClose }) => {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="create-post-modal" role="dialog" aria-modal="true" onClick={() => onClose?.()}>
      <div
        className="create-post-container image-preview-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title"></h2>
          <button className="close-button" type="button" onClick={() => onClose?.()} aria-label="Close">
            ×
          </button>
        </div>

        <img className="image-preview-img" src={src} alt="" />
      </div>
    </div>
  );
};

export default ImagePreviewModal;
