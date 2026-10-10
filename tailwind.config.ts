import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    // The ported design system (src/tailwind/kiva/base.css) carries its own reset — Tailwind's
    // preflight would fight it (e.g. `h1{font-size:inherit}`), so it is off.
    corePlugins: {
        preflight: false,
        container: false,
    },
    // Design class names that are also Tailwind utilities — only the design's rules may apply to them
    // (found by compiling every class name of src/tailwind/kiva + the page styles through Tailwind).
    blocklist: ["container", "block", "ring", "sr-only"],
    theme: {
        extend: {
            // Kiva design tokens (same values as the CSS variables in src/tailwind/kiva/base.css).
            // Plain hex on purpose: Tailwind 3 cannot apply `/opacity` modifiers to `var(...)` colors.
            colors: {
                lilac: { DEFAULT: "#C8B6E2", 50: "#F3EEFA" },
                purple: { DEFAULT: "#5B3E8C", 700: "#4A3173" },
                ink: "#2A1F3D",
                tag: { DEFAULT: "#E4D9F3", border: "#B9A3DB", text: "#3E2A63" },
                cream: { DEFAULT: "#F5EDE3", border: "#D9C4A8" },
                "kv-border": "#E3DCEC",
                success: { DEFAULT: "#2F7D5B", bg: "#E5F3EC" },
                danger: { DEFAULT: "#B3364A", bg: "#FBEAEC" },
                warn: { DEFAULT: "#9A6B12", bg: "#FBF1DC" },
            },
            maxWidth: {
                container: "1240px",
            },
            transitionTimingFunction: {
                kiva: "cubic-bezier(0.2, 0.75, 0.2, 1)",
                "kiva-bounce": "cubic-bezier(0.3, 1.15, 0.5, 1)",
            },
        },
    },
};

export default config;
