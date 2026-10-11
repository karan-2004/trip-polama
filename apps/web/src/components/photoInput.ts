export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'Please choose an image file.';
  if (file.size === 0) return 'This image is empty. Please choose another one.';
  if (file.size > MAX_PHOTO_BYTES) return 'Choose an image smaller than 10 MB.';
  return null;
}
