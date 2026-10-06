/** Next turns static PNG imports into `{ src }`; Vite keeps a string URL. */
export function leafletAssetUrl(asset: string | { src: string }): string {
  return typeof asset === 'string' ? asset : asset.src
}
