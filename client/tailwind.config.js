/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A6EBD',
          dark: '#064D8A',
          light: '#E8F4FD',
        },
        secondary: {
          DEFAULT: '#00A896',
          dark: '#007A6D',
          light: '#E0F5F3',
        },
        accent: '#F96167',
        warning: '#F9A826',
        'bg-main': '#F4F7FB',
        'bg-card': '#FFFFFF',
        'text-primary': '#1A2B3C',
        'text-secondary': '#5A7184',
        border: '#DCE8F0',
        success: '#22C55E',
        emergency: '#DC2626',
        gold: '#F59E0B',
        silver: '#94A3B8',
        bronze: '#B45309',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Noto Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '20px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 2px 16px rgba(10, 110, 189, 0.08)',
        'card-hover': '0 8px 32px rgba(10, 110, 189, 0.18)',
        'nav': '0 2px 20px rgba(10, 110, 189, 0.12)',
        'emergency': '0 4px 24px rgba(220, 38, 38, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-emergency': 'pulseEmergency 1.5s infinite',
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out',
        'mesh': 'meshGradient 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseEmergency: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        meshGradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        '200%': '200%',
        '400%': '400%',
      },
      screens: {
        'xs': '480px',
      },
    },
  },
  plugins: [],
}
