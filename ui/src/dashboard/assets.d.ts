// Vite's default asset-import convention (a URL string), for the vendored
// dashboard's own image imports (logos, illustrations, demo avatars).
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
