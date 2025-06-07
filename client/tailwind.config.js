// tailwind.config.js
import { defineConfig } from 'tailwindcss';
import daisyui from 'daisyui';

export default defineConfig({
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',        // scan everything in /src
  ],
  theme: { extend: {} },
  plugins: [daisyui],

  // keep only the palettes you actually use ↓
  daisyui: {
    themes: ['light', 'dark', 'cupcake'],   // add or remove freely
  },
});
