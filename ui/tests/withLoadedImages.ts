/** happy-dom never finishes an image load, and Radix's Avatar only mounts its <img> once the
 * image reports loaded. While `run` executes, `window.Image` reports every image as loaded, so the
 * rendered <img src> can be asserted. The real `window.Image` is restored afterwards. */
class LoadedImage {
  complete = true;
  naturalWidth = 1;
  crossOrigin: string | null = null;
  referrerPolicy = "";
  src = "";
  addEventListener() {}
  removeEventListener() {}
}

export function withLoadedImages<T>(run: () => T): T {
  const original = window.Image;
  window.Image = LoadedImage as unknown as typeof Image;
  try {
    return run();
  } finally {
    window.Image = original;
  }
}

export async function withLoadedImagesAsync<T>(run: () => Promise<T>): Promise<T> {
  const original = window.Image;
  window.Image = LoadedImage as unknown as typeof Image;
  try {
    return await run();
  } finally {
    window.Image = original;
  }
}
