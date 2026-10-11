// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraCapture } from './CameraCapture';

let container: HTMLDivElement;
let root: Root;
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
const getUserMedia = vi.fn();

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  getUserMedia.mockResolvedValue(stream);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('CameraCapture', () => {
  it('opens a video stream instead of a file picker and stops tracks on unmount', async () => {
    await act(async () => root.render(createElement(CameraCapture, {
      onCapture: vi.fn(), onClose: vi.fn(),
    })));
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } }, audio: false,
    });
    expect(container.querySelector('input[type=file]')).toBeNull();
    expect(container.querySelector('video')?.srcObject).toBe(stream);
    await act(async () => root.unmount());
    expect(stop).toHaveBeenCalledOnce();
  });

  it('shows permission denial without silently opening a file picker', async () => {
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    await act(async () => root.render(createElement(CameraCapture, {
      onCapture: vi.fn(), onClose: vi.fn(),
    })));
    expect(container.querySelector('[role=alert]')?.textContent).toContain('permission was denied');
    expect(container.querySelector('input')).toBeNull();
  });

  it('captures a JPEG from the preview and closes the camera', async () => {
    const onCapture = vi.fn();
    const onClose = vi.fn();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['frame'], { type: 'image/jpeg' }));
    });
    await act(async () => root.render(createElement(CameraCapture, { onCapture, onClose })));
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'videoWidth', { value: 640 });
    Object.defineProperty(video, 'videoHeight', { value: 480 });
    await act(async () => video.dispatchEvent(new Event('loadeddata')));
    await act(async () => container.querySelector('button')!.click());
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
    expect(onCapture.mock.calls[0]?.[0]).toBeInstanceOf(File);
    expect(onCapture.mock.calls[0]?.[0].type).toBe('image/jpeg');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stops a late stream if the camera closes during the permission prompt', async () => {
    let resolve!: (stream: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((done) => { resolve = done; }));
    await act(async () => root.render(createElement(CameraCapture, {
      onCapture: vi.fn(), onClose: vi.fn(),
    })));
    await act(async () => root.unmount());
    await act(async () => resolve(stream));
    expect(stop).toHaveBeenCalledOnce();
  });
});
