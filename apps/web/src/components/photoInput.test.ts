import { describe, expect, it } from 'vitest';
import { MAX_PHOTO_BYTES, validatePhoto } from './photoInput';

describe('validatePhoto', () => {
  it('accepts camera and uploaded images', () => {
    expect(validatePhoto({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validatePhoto({ type: 'image/png', size: MAX_PHOTO_BYTES })).toBeNull();
  });
  it('rejects non-images and empty files', () => {
    expect(validatePhoto({ type: 'text/plain', size: 10 })).toBeTruthy();
    expect(validatePhoto({ type: 'image/jpeg', size: 0 })).toBeTruthy();
  });
  it('rejects images above the storage limit', () => {
    expect(validatePhoto({ type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 })).toBeTruthy();
  });
});
