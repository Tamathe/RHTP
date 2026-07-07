// Tailwind v4 is handled by the @tailwindcss/vite plugin (see vite.config.ts).
// This empty PostCSS config exists only to stop Vite from walking up the
// directory tree and inheriting the parent repo's Tailwind v3 PostCSS setup,
// which is incompatible with this app's v4 CSS.
export default { plugins: {} }
