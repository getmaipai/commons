// The documented API subset Reader uses. These declarations replace the packages' own
// typings (epubjs's bundled types are loose, and Vite's ?url worker import has none), so the engine
declare module "epubjs" {
  const ePub: (src: string, options: { openAs: string }) => import("./readerEngines").EpubBook;
  export default ePub;
}
declare module "pdfjs-dist" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(options: { url: string; isEvalSupported: boolean }): import("./readerEngines").PdfLoadingTask;
}
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const url: string;
  export default url;
}
