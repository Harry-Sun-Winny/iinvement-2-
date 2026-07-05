// Global Design Tokens System
export const DESIGN_SYSTEM_VERSION = "2.0.0";

export const DESIGN_TOKENS = {
  // Spacing Tokens (px)
  spacing: {
    xs: "4px",    // 4
    sm: "8px",    // 8
    md: "12px",   // 12
    lg: "16px",   // 16
    xl: "20px",   // 20
    xxl: "24px",  // 24
    xxxl: "32px", // 32
    huge: "40px", // 40
  },

  // Spacing Class Names (Tailwind)
  spacingClasses: {
    gap: {
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
      xl: "gap-5",
      xxl: "gap-6",
      xxxl: "gap-8",
      huge: "gap-10",
    },
    p: {
      xs: "p-1",
      sm: "p-2",
      md: "p-3",
      lg: "p-4",
      xl: "p-5",
      xxl: "p-6",
      xxxl: "p-8",
      huge: "p-10",
    },
    m: {
      xs: "m-1",
      sm: "m-2",
      md: "m-3",
      lg: "m-4",
      xl: "m-5",
      xxl: "m-6",
      xxxl: "m-8",
      huge: "m-10",
    }
  },

  // Radius Tokens
  radius: {
    sm: "8px",
    md: "12px",
    lg: "14px",
    xl: "18px",
  },

  radiusClasses: {
    sm: "rounded-[8px]",
    md: "rounded-[12px]",
    lg: "rounded-[14px]",
    xl: "rounded-[18px]",
  },

  // Shadow Tokens
  shadow: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  },

  shadowClasses: {
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  },

  // Typography Classes
  typography: {
    display: "text-4xl md:text-5xl font-extrabold tracking-tight leading-none",
    h1: "text-3xl md:text-4xl font-bold tracking-tight",
    h2: "text-2xl md:text-3xl font-semibold tracking-tight",
    h3: "text-xl md:text-2xl font-semibold",
    h4: "text-lg md:text-xl font-medium",
    body: "text-sm md:text-base font-normal leading-relaxed",
    caption: "text-xs font-normal text-slate-400",
    small: "text-[10px] md:text-xs font-normal",
    mono: "font-mono text-xs md:text-sm",
  },

  // Transitions
  transition: {
    fast: "all 100ms cubic-bezier(0.4, 0, 0.2, 1)",
    default: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "all 350ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  transitionClasses: {
    fast: "transition-all duration-100 ease-in-out",
    default: "transition-all duration-200 ease-in-out",
    slow: "transition-all duration-350 ease-in-out",
  },

  // Z-Index Mapping
  zIndex: {
    background: -10,
    base: 0,
    sidebar: 40,
    header: 30,
    modal: 50,
    toast: 100,
  },

  // Breakpoints
  breakpoints: {
    mobile: "320px",
    mobileL: "375px",
    tablet: "768px",
    laptop: "1024px",
    desktop: "1440px",
    desktopL: "1920px",
    ultrawide: "3440px",
  },
};
