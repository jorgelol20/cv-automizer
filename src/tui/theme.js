// Paleta y catálogo compartido de la TUI.
// Los colores siguen un tema oscuro sobrio:
// el color solo marca estado (ok, aviso, error).

export const COLORS = {
    bg: "#0b0f14",
    panel: "#0f172a",
    panelAlt: "#111c2e",
    border: "#334155",
    borderFocus: "#38bdf8",
    text: "#e2e8f0",
    muted: "#94a3b8",
    dim: "#64748b",
    accent: "#38bdf8",
    ok: "#4ade80",
    warn: "#fbbf24",
    error: "#f87171",
    selectionBg: "#1e3a5f",
    selectionFg: "#f8fafc",
    inputBg: "#0b1220",
    inputFocusBg: "#172033"
};

// Orden de pestañas = teclas 1..5.
export const TABS = [
    { id: "generar", label: "Específica" },
    { id: "general", label: "General" },
    { id: "keys", label: "API Keys" },
    { id: "modelos", label: "Modelos" },
    { id: "perfil", label: "Perfil" }
];

// Anchos pensados para 80 columnas.
export const MIN_COLS = 80;
export const MIN_ROWS = 22;
