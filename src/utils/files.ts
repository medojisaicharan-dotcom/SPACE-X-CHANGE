export const MAX_IMAGE_BYTES = 900 * 1024;

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Only image files are allowed.'));
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
      reject(new Error('Use PNG, JPG, WEBP or GIF images.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image must be smaller than 900 KB in demo mode.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

export function readDocumentMeta(file: File): { name: string; size: number } {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Document must be smaller than 5 MB.');
  }
  const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
  if (!allowed.includes(file.type)) {
    throw new Error('Upload a PDF, PNG or JPG document.');
  }
  return { name: file.name, size: file.size };
}
