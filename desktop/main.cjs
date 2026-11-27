const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell
} = require("electron");

require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(
  __dirname,
  ".."
);

const dataDir = path.join(
  projectRoot,
  "data"
);

const outputDir = path.join(
  projectRoot,
  "output"
);

const inputFiles = {
  userInfo: path.join(
    dataDir,
    "UserInfo.md"
  ),

  jobOffer: path.join(
    dataDir,
    "oferta.md"
  )
};

// Plantillas para el primer arranque: si aún no existe el fichero real,
// el editor carga el ejemplo y avisa de que hay que guardarlo.
const exampleInputFiles = {
  userInfo: path.join(
    dataDir,
    "UserInfo.example.md"
  ),

  jobOffer: path.join(
    dataDir,
    "oferta.example.md"
  )
};

async function readInputOrTemplate(filePath, examplePath) {
  try {
    return {
      content: await fs.readFile(
        filePath,
        "utf8"
      ),
      template: false
    };
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    return {
      content: await fs.readFile(
        examplePath,
        "utf8"
      ),
      template: true
    };
  }
}

// Guardia de cierre: el renderer avisa cuando hay cambios sin guardar.
let inputIsDirty = false;

ipcMain.on("set-dirty-state", (_event, dirty) => {
  inputIsDirty = Boolean(dirty);
});

// Pide al renderer que guarde ambos ficheros y espera su respuesta.
function requestSaveAll(targetWindow) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (ok) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener("save-all-finished", onFinished);
      clearTimeout(timer);
      resolve(Boolean(ok));
    };

    const onFinished = (event, ok) => {
      if (event.sender !== targetWindow.webContents) return;
      finish(ok);
    };

    const timer = setTimeout(() => finish(false), 15000);

    ipcMain.on("save-all-finished", onFinished);
    targetWindow.webContents.send("request-save-all");
  });
}

function createWindow() {
  let allowClose = false;
  let closeInProgress = false;

  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 650,

    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.cjs"
      ),

      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.on("close", (event) => {
    if (allowClose || !inputIsDirty) {
      return;
    }

    event.preventDefault();

    if (closeInProgress) {
      return;
    }

    closeInProgress = true;

    const choice = dialog.showMessageBoxSync(window, {
      type: "warning",
      buttons: [
        "Guardar y salir",
        "Salir sin guardar",
        "Cancelar"
      ],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: "Cambios sin guardar",
      message: "Hay cambios sin guardar en el perfil o en la oferta.",
      detail: "Puedes guardarlos antes de cerrar la ventana."
    });

    if (choice === 2) {
      closeInProgress = false;
      return;
    }

    if (choice === 1) {
      allowClose = true;
      closeInProgress = false;
      window.close();
      return;
    }

    requestSaveAll(window).then((ok) => {
      closeInProgress = false;

      if (!ok) {
        dialog.showMessageBoxSync(window, {
          type: "error",
          buttons: ["Entendido"],
          noLink: true,
          title: "No se pudieron guardar los cambios",
          message: "La ventana sigue abierta.",
          detail: "Revisa el aviso de la app e inténtalo de nuevo."
        });
        return;
      }

      allowClose = true;
      window.close();
    });
  });

  window.on("closed", () => {
    inputIsDirty = false;
  });

  window.loadFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
}

// Motor de PDF del escritorio: usa el Chromium que ya trae Electron, así que
// no depende de Chrome, Chromium ni descargas adicionales.
async function registrarMotorPdf() {
  try {
    const { setPdfEngine } = await import(
      "../src/pdf/pdf.js"
    );

    const { generarPdfConElectron } = require("./pdf.cjs");

    setPdfEngine((html, outputPath) =>
      generarPdfConElectron(
        html,
        path.resolve(projectRoot, outputPath)
      )
    );
  } catch (error) {
    console.error(
      `No se pudo registrar el motor de PDF de Electron: ${error.message}`
    );
  }
}

ipcMain.handle(
  "get-input-files",
  async () => {
    try {
      const [
        userInfo,
        jobOffer
      ] = await Promise.all([
        readInputOrTemplate(
          inputFiles.userInfo,
          exampleInputFiles.userInfo
        ),

        readInputOrTemplate(
          inputFiles.jobOffer,
          exampleInputFiles.jobOffer
        )
      ]);

      return {
        userInfo: userInfo.content,
        jobOffer: jobOffer.content,
        usingTemplate: userInfo.template || jobOffer.template
      };
    } catch (error) {
      throw new Error(
        `No se pudieron cargar los archivos de entrada: ${error.message}`
      );
    }
  }
);

ipcMain.handle(
  "save-input-file",
  async (
    _event,
    { type, content }
  ) => {
    if (
      type !== "userInfo" &&
      type !== "jobOffer"
    ) {
      throw new Error(
        "Tipo de archivo no válido."
      );
    }

    if (
      typeof content !== "string"
    ) {
      throw new Error(
        "El contenido debe ser texto."
      );
    }

    try {
      await fs.mkdir(
        dataDir,
        { recursive: true }
      );

      await fs.writeFile(
        inputFiles[type],
        content,
        "utf8"
      );

      return {
        success: true,
        type
      };
    } catch (error) {
      throw new Error(
        `No se pudo guardar el archivo: ${error.message}`
      );
    }
  }
);

ipcMain.handle(
  "list-models",
  async (
    _event,
    provider
  ) => {
    try {
      if (
        provider === "opencode-zen"
      ) {
        const {
          listOpencodeModels
        } = await import(
          "../src/ai/opencode.js"
        );

        return await listOpencodeModels(
          process.env.OPENCODE_ZEN_API_KEY ||
          process.env.OPENCODE_API_KEY
        );
      }

      if (
        provider === "opencode-go"
      ) {
        const {
          listOpencodeGoModels
        } = await import(
          "../src/ai/opencode-go.js"
        );

        return await listOpencodeGoModels(
          process.env.OPENCODE_GO_API_KEY ||
          process.env.OPENCODE_API_KEY
        );
      }

      if (
        provider === "ollama"
      ) {
        const {
          listOllamaModels
        } = await import(
          "../src/ai/ollama.js"
        );

        return await listOllamaModels();
      }

      if (
        provider === "gemini"
      ) {
        const {
          listGeminiModels
        } = await import(
          "../src/ai/gemini.js"
        );

        return await listGeminiModels(
          process.env.GEMINI_API_KEY
        );
      }

      if (
        provider === "claude"
      ) {
        const {
          listClaudeModels
        } = await import(
          "../src/ai/claude.js"
        );

        return await listClaudeModels(
          process.env.ANTHROPIC_API_KEY ||
          process.env.CLAUDE_API_KEY
        );
      }

      if (
        provider === "groq"
      ) {
        const {
          listGroqModels
        } = await import(
          "../src/ai/groq.js"
        );

        return await listGroqModels(
          process.env.GROQ_API_KEY
        );
      }

      throw new Error(
        `Proveedor desconocido: ${provider}`
      );
    } catch (error) {
      const errorMessage = error.message || String(error);

      // Mensajes más descriptivos según el proveedor
      if (provider === "ollama") {
        if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed")) {
          throw new Error(
            "No se pudo conectar con Ollama. Asegúrate de que el servidor esté corriendo en http://localhost:11434"
          );
        }
        if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
          throw new Error(
            "Ollama no está disponible. Inicia el servidor con: ollama serve"
          );
        }
      }

      if (provider === "gemini") {
        if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
          throw new Error(
            "El servicio de Google Gemini no está disponible temporalmente. Reintenta en unos minutos."
          );
        }
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
          throw new Error(
            "API key de Gemini inválida o sin permisos. Verifica GEMINI_API_KEY en tu archivo .env"
          );
        }
      }

      if (provider === "claude") {
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
          throw new Error(
            "API key de Claude inválida o sin permisos. Verifica ANTHROPIC_API_KEY en tu archivo .env"
          );
        }
        if (errorMessage.includes("429")) {
          throw new Error(
            "Cuota de Claude excedida. Reintenta más tarde."
          );
        }
      }

      if (provider === "groq") {
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
          throw new Error(
            "API key de Groq inválida o sin permisos. Verifica GROQ_API_KEY en tu archivo .env"
          );
        }
        if (errorMessage.includes("429")) {
          throw new Error(
            "Cuota de Groq excedida. Reintenta más tarde."
          );
        }
      }

      if (provider === "opencode-zen") {
        if (errorMessage.includes("401") || errorMessage.includes("403")) {
          throw new Error(
            "API key de OpenCode Zen inválida o sin permisos. Verifica OPENCODE_ZEN_API_KEY en tu archivo .env"
          );
        }
        if (errorMessage.includes("429")) {
          throw new Error(
            "Cuota de OpenCode Zen excedida. Reintenta más tarde."
          );
        }
      }

      throw new Error(errorMessage);
    }
  }
);

ipcMain.handle(
  "get-api-keys",
  async () => {
    try {
      const {
        getKeysStatus
      } = await import(
        "../src/config/keys.js"
      );

      return await getKeysStatus();
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "save-api-key",
  async (
    _event,
    { name, value }
  ) => {
    try {
      const {
        setKey
      } = await import(
        "../src/config/keys.js"
      );

      return await setKey(
        name,
        value
      );
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "clear-api-key",
  async (
    _event,
    name
  ) => {
    try {
      const {
        clearKey
      } = await import(
        "../src/config/keys.js"
      );

      return await clearKey(name);
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "get-modelos-config",
  async () => {
    try {
      const {
        getModelosConfig
      } = await import(
        "../src/config/modelos.js"
      );

      return await getModelosConfig();
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "save-modelo-config",
  async (
    _event,
    { provider, campo, valor }
  ) => {
    try {
      if (provider === "defaults") {
        const {
          setDefaults
        } = await import(
          "../src/config/modelos.js"
        );

        return await setDefaults(
          campo,
          valor
        );
      }

      const {
        setModeloConfig
      } = await import(
        "../src/config/modelos.js"
      );

      return await setModeloConfig(
        provider,
        campo,
        valor
      );
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "reset-modelo-config",
  async (
    _event,
    provider
  ) => {
    try {
      const {
        resetModeloConfig
      } = await import(
        "../src/config/modelos.js"
      );

      return await resetModeloConfig(
        provider || undefined
      );
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "generate-cv",
  async (
    event,
    options
  ) => {
    try {
      const {
        generateCV
      } = await import(
        "../src/app.js"
      );

      return await generateCV({
        ...options,
        onStage: (stage) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send(
              "generation-stage",
              {
                runId: options?.runId ?? null,
                stage
              }
            );
          }
        }
      });
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

ipcMain.handle(
  "open-output-file",
  async (
    _event,
    relativePath
  ) => {
    if (
      typeof relativePath !== "string" ||
      !relativePath.trim()
    ) {
      throw new Error(
        "Ruta de archivo no válida."
      );
    }

    const absolutePath =
      path.resolve(
        projectRoot,
        relativePath
      );

    const relativeToProject =
      path.relative(
        projectRoot,
        absolutePath
      );

    if (
      relativeToProject.startsWith(
        ".."
      ) ||
      path.isAbsolute(
        relativeToProject
      )
    ) {
      throw new Error(
        "La ruta está fuera del proyecto."
      );
    }

    try {
      const errorMessage =
        await shell.openPath(
          absolutePath
        );

      if (errorMessage) {
        throw new Error(
          errorMessage
        );
      }

      return {
        success: true
      };
    } catch (error) {
      throw new Error(
        `No se pudo abrir el archivo: ${error.message}`
      );
    }
  }
);

ipcMain.handle(
  "show-output-folder",
  async () => {
    try {
      const errorMessage =
        await shell.openPath(
          outputDir
        );

      if (errorMessage) {
        throw new Error(
          errorMessage
        );
      }

      return {
        success: true
      };
    } catch (error) {
      throw new Error(
        `No se pudo abrir la carpeta de salida: ${error.message}`
      );
    }
  }
);

ipcMain.handle(
  "generate-general-kit",
  async (
    event,
    options
  ) => {
    try {
      const {
        generateGeneralKit
      } = await import(
        "../src/general/generate.js"
      );

      return await generateGeneralKit({
        ...options,
        onStage: (stage) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send(
              "generation-stage",
              {
                runId: options?.runId ?? null,
                stage
              }
            );
          }
        }
      });
    } catch (error) {
      throw new Error(
        error.message ||
        String(error)
      );
    }
  }
);

app.whenReady().then(async () => {
  await registrarMotorPdf();

  createWindow();

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !== "darwin"
    ) {
      app.quit();
    }
  }
);