// Canal de avisos de los proveedores de IA.
//
// La CLI y el escritorio escriben en stderr.
// La TUI sustituye el destino por su barra de
// estado: cualquier escritura directa en consola
// rompería el frame.

const destinoPorDefecto = (mensaje) => {
    console.error(mensaje);
};

let destino = destinoPorDefecto;

export function setAvisoSink(nuevo) {
    destino = typeof nuevo === "function"
        ? nuevo
        : destinoPorDefecto;
}

export function aviso(mensaje) {
    destino(String(mensaje));
}
