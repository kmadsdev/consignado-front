// The own mark of Consignado Cloud: an open ring (the engine that starts and
// stops) with one request line that leaves it.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M22.5 10.2A9 9 0 1 0 22.5 21.8" stroke="#42b4ff" stroke-width="3" stroke-linecap="round"/><path d="M13 16h11" stroke="#7ce0c3" stroke-width="3" stroke-linecap="round"/><circle cx="25" cy="16" r="2.6" fill="#7ce0c3"/></svg>`
export const GLYPH_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`

export const SUN_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3" />
  </svg>
)
export const MOON_ICON = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M13.5 9.8A6 6 0 0 1 6.2 2.5a6 6 0 1 0 7.3 7.3Z" />
  </svg>
)
