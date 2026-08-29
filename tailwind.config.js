/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep Obsidian / Slate background palette
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        // Semantic Match & Status Palette
        match: {
          full: '#10b981',       // Emerald - FULL MATCH
          partial: '#f59e0b',    // Amber - ELIGIBLE - PARTIAL PREFERRED
          ineligible: '#ef4444', // Red - NOT ELIGIBLE - MANDATORY SKILL GAP
          high: '#6366f1',       // Indigo - High Priority (Mandatory)
          low: '#8b5cf6',        // Violet - Low Priority (Preferred)
        },
        evidence: {
          level1: '#94a3b8', // Gray - Self-declared
          level2: '#38bdf8', // Sky - Certificate
          level3: '#818cf8', // Indigo - Assessment
          level4: '#a855f7', // Purple - Project
          level5: '#eab308', // Gold - Industry Verified
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'monospace',
        ],
      },
      boxShadow: {
        'glow-emerald': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.3)',
        'glow-rose': '0 0 20px -5px rgba(239, 68, 68, 0.3)',
        'glow-indigo': '0 0 20px -5px rgba(99, 102, 241, 0.3)',
      },
    },
  },
  plugins: [],
};
