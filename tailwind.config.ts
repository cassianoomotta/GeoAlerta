import type { Config } from "tailwindcss";

export default {
  "content": [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  "theme": {
    "extend": {
      "colors": {
        "background": "rgb(var(--background-rgb) / <alpha-value>)",
        "foreground": "rgb(var(--foreground-rgb) / <alpha-value>)",
        "surface": "rgb(var(--surface-rgb) / <alpha-value>)",
        "surface-subtle": "rgb(var(--surface-subtle-rgb) / <alpha-value>)",
        "control-border": "rgb(var(--control-border-rgb) / <alpha-value>)",
        "border": "rgb(var(--border-rgb) / <alpha-value>)",
        "input": "rgb(var(--input-rgb) / <alpha-value>)",
        "ring": "rgb(var(--ring-rgb) / <alpha-value>)",
        "disabled": "rgb(var(--disabled-rgb) / <alpha-value>)",
        "disabled-text": "rgb(var(--disabled-text-rgb) / <alpha-value>)",
        "card": {
          "DEFAULT": "rgb(var(--card-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--card-foreground-rgb) / <alpha-value>)"
        },
        "popover": {
          "DEFAULT": "rgb(var(--popover-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--popover-foreground-rgb) / <alpha-value>)"
        },
        "primary": {
          "DEFAULT": "rgb(var(--primary-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--primary-foreground-rgb) / <alpha-value>)",
          "soft": "rgb(var(--primary-soft-rgb) / <alpha-value>)",
          "hover": "rgb(var(--primary-hover-rgb) / <alpha-value>)",
          "active": "rgb(var(--primary-active-rgb) / <alpha-value>)"
        },
        "secondary": {
          "DEFAULT": "rgb(var(--secondary-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--secondary-foreground-rgb) / <alpha-value>)"
        },
        "muted": {
          "DEFAULT": "rgb(var(--muted-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--muted-foreground-rgb) / <alpha-value>)"
        },
        "accent": {
          "DEFAULT": "rgb(var(--accent-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--accent-foreground-rgb) / <alpha-value>)"
        },
        "destructive": {
          "DEFAULT": "rgb(var(--destructive-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--destructive-foreground-rgb) / <alpha-value>)"
        },
        "danger": {
          "DEFAULT": "rgb(var(--danger-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--danger-foreground-rgb) / <alpha-value>)",
          "soft": "rgb(var(--danger-soft-rgb) / <alpha-value>)"
        },
        "warning": {
          "DEFAULT": "rgb(var(--warning-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--warning-foreground-rgb) / <alpha-value>)",
          "soft": "rgb(var(--warning-soft-rgb) / <alpha-value>)"
        },
        "success": {
          "DEFAULT": "rgb(var(--success-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--success-foreground-rgb) / <alpha-value>)",
          "soft": "rgb(var(--success-soft-rgb) / <alpha-value>)"
        },
        "info": {
          "DEFAULT": "rgb(var(--info-rgb) / <alpha-value>)",
          "foreground": "rgb(var(--info-foreground-rgb) / <alpha-value>)",
          "soft": "rgb(var(--info-soft-rgb) / <alpha-value>)"
        }
      },
      "fontFamily": {
        "sans": [
          "\"Helvetica Neue\"",
          "Arial",
          "sans-serif"
        ]
      },
      "borderRadius": {
        "lg": "var(--radius)",
        "md": "var(--radius-control)",
        "sm": "4px"
      }
    }
  },
  "plugins": []
} satisfies Config;
