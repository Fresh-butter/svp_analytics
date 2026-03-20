/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)", 
        surface: "rgb(var(--color-surface) / <alpha-value>)", 
        surfaceHighlight: "rgb(var(--color-surface-highlight) / <alpha-value>)", 
        border: "rgb(var(--color-border) / <alpha-value>)", 
        primary: "rgb(var(--color-primary) / <alpha-value>)", 
        primaryHover: "rgb(var(--color-primary-hover) / <alpha-value>)", 
        text: "rgb(var(--color-text) / <alpha-value>)", 
        textMuted: "rgb(var(--color-text-muted) / <alpha-value>)", 
        danger: "rgb(var(--color-danger) / <alpha-value>)", 
        
        // Matching sidebar colors from screenshot
        sidebar: "rgb(var(--color-sidebar) / <alpha-value>)", 
        sidebarActive: "rgb(var(--color-sidebar-active) / <alpha-value>)", 
        sidebarText: "rgb(var(--color-sidebar-text) / <alpha-value>)", 
        sidebarTextActive: "rgb(var(--color-sidebar-text-active) / <alpha-value>)", 
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
