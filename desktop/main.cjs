const {
  app,
  BrowserWindow,
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

function createWindow() {
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

  window.loadFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
}

ipcMain.handle(
  "get-input-files",
  async () => {
    try {
      const [
        userInfo,
        jobOffer
      ] = await Promise.all([
        fs.readFile(
          inputFiles.userInfo,
          "utf8"
        ),

        fs.readFile(
          inputFiles.jobOffer,
          "utf8"
        )
      ]);

      return {
        userInfo,
        jobOffer
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

      throw new Error(
        `Proveedor desconocido: ${provider}`
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
    _event,
    options
  ) => {
    try {
      const {
        generateCV
      } = await import(
        "../src/app.js"
      );

      return await generateCV(
        options
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

app.whenReady().then(() => {
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