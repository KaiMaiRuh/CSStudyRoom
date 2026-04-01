import imageCompression from 'browser-image-compression';

const DEFAULT_TARGET_BYTES = 60 * 1024;

const FALLBACK_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'];

export function isImageFile(file) {
  if (!(file instanceof File)) return false;
  if (typeof file.type === 'string' && file.type.startsWith('image/')) return true;

  const name = String(file.name || '').toLowerCase();
  return FALLBACK_IMAGE_EXTS.some((ext) => name.endsWith(ext));
}

export function assertImageFile(file) {
  if (!isImageFile(file)) {
    throw new Error('Please select an image file');
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function compressToTarget(file, { targetBytes = DEFAULT_TARGET_BYTES } = {}) {
  if (!(file instanceof File)) throw new Error('Expected a File');

  let maxSizeMB = Math.min(0.28, targetBytes / (1024 * 1024));
  let compressed = file;

  for (let i = 0; i < 6; i += 1) {
    compressed = await imageCompression(compressed, {
      maxSizeMB,
      maxWidthOrHeight: 800,
      useWebWorker: true,
      fileType: compressed.type || file.type,
      initialQuality: 0.5,
    });

    if (compressed.size <= targetBytes) return compressed;

    maxSizeMB = Math.max(0.05, maxSizeMB * 0.75);
  }

  throw new Error(
    `Image is too large after compression (${compressed.size} bytes). Please choose a smaller image.`
  );
}

export async function imageFileToBase64DataUrl(file, { targetBytes = DEFAULT_TARGET_BYTES } = {}) {
  if (!file) return null;
  if (!(file instanceof File)) throw new Error('Expected a File');

  assertImageFile(file);

  const compressed = await compressToTarget(file, { targetBytes });
  const dataUrl = await fileToDataUrl(compressed);

  if (!dataUrl.startsWith('data:')) {
    throw new Error('Invalid image data URL');
  }

  return dataUrl;
}

export function isDataUrlImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}