// Nombres de archivo de salida centralizados.
// Todo lo generado cuelga de output/ con caracteres seguros para Windows.

export function sanitizeFilePart(value) {
    return String(value ?? "")
        .trim()
        .replaceAll(/\s+/g, "")
        .replaceAll(/[<>:"/\\|?*&]+/g, "");
}

export function getUserFilePart() {
    const raw =
        process.env.NOMBRE_ARCHIVO?.trim() ||
        process.env.NOMBRE_USUARIO?.trim() ||
        "Candidato";

    return (
        sanitizeFilePart(raw) ||
        "Candidato"
    );
}

// CV específico: CV-{usuario}.
// CV de kit general / candidatura con empresa: CV-{usuario}-{empresa}.
export function buildCVBaseFileName(companyName = "") {
    const user = getUserFilePart();
    const company = sanitizeFilePart(companyName);

    if (company) {
        return `CV-${user}-${company}`;
    }

    return `CV-${user}`;
}

// Kit general: General-{empresa}.
export function buildGeneralBaseFileName(companyName = "") {
    const company =
        sanitizeFilePart(companyName) ||
        "Empresa";

    return `General-${company}`;
}
