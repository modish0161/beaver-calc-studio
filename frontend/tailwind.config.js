/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        zentry: ["zentry", "sans-serif"],
        general: ["general", "sans-serif"],
        "circular-web": ["circular-web", "sans-serif"],
        "robert-medium": ["robert-medium", "sans-serif"],
        "robert-regular": ["robert-regular", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Beaver Bridges brand colors from beaver-me
        turquoise: {
          50: "#262C53",
          100: "#262C53",
          200: "#262C53",
          300: "#262C53",
          500: '#262C53',
          700: '#262C53',
        },
        silver: {
          50: "#C0C0C0",
          100: "#A8A8A8",
          200: "#888888",
          300: "#6A6A6A",
        },
        black: {
          DEFAULT: "#000000",
          50: "#2F2F2F",
        },
        blue: {
          50: "#f0f2fa",
          75: "#f0f2fa",
          100: "#F0F2FA",
          200: "#010101",
          300: "#4FB7DD",
        },
        violet: {
          300: "#5724ff",
        },
        yellow: {
          100: "#8e983f",
          300: "#edff66",
        },
        // Keep neon colors for special effects
        neon: {
          blue: "#00D4FF",
          purple: "#9D4EDD",
          pink: "#FF006E",
          green: "#00FF88",
          cyan: "#06FFA5",
          red: "#FF073A",
        },
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          border: "rgba(255, 255, 255, 0.2)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(0, 212, 255, 0.3)',
        'neon-purple': '0 0 20px rgba(157, 78, 221, 0.3)',
        'neon-pink': '0 0 20px rgba(255, 0, 110, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-hover': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'neumorphic': '8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff',
        'neumorphic-inset': 'inset 8px 8px 16px #d1d9e6, inset -8px -8px 16px #ffffff',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          from: { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
          to: { boxShadow: '0 0 30px rgba(0, 212, 255, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
