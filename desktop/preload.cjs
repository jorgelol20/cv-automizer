const {
  contextBridge,
  ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
  "cvAutomizer",
  {
    getInputFiles: () =>
      ipcRenderer.invoke(
        "get-input-files"
      ),

    saveInputFile: (
      type,
      content
    ) =>
      ipcRenderer.invoke(
        "save-input-file",
        {
          type,
          content
        }
      ),

    generateCV: (
      options
    ) =>
      ipcRenderer.invoke(
        "generate-cv",
        options
      ),

    listModels: (
      provider
    ) =>
      ipcRenderer.invoke(
        "list-models",
        provider
      ),

    openOutputFile: (
      filePath
    ) =>
      ipcRenderer.invoke(
        "open-output-file",
        filePath
      ),

    showOutputFolder: () =>
      ipcRenderer.invoke(
        "show-output-folder"
      ),

    generateGeneralKit: (options) =>
      ipcRenderer.invoke(
        "generate-general-kit",
        options
      ),

    getApiKeys: () =>
      ipcRenderer.invoke(
        "get-api-keys"
      ),

    saveApiKey: (
      name,
      value
    ) =>
      ipcRenderer.invoke(
        "save-api-key",
        {
          name,
          value
        }
      ),

    clearApiKey: (
      name
    ) =>
      ipcRenderer.invoke(
        "clear-api-key",
        name
      ),

    getModelosConfig: () =>
      ipcRenderer.invoke(
        "get-modelos-config"
      ),

    saveModeloConfig: (
      provider,
      campo,
      valor
    ) =>
      ipcRenderer.invoke(
        "save-modelo-config",
        {
          provider,
          campo,
          valor
        }
      ),

    resetModeloConfig: (
      provider
    ) =>
      ipcRenderer.invoke(
        "reset-modelo-config",
        provider || null
      ),

    setDirtyState: (dirty) =>
      ipcRenderer.send(
        "set-dirty-state",
        Boolean(dirty)
      ),

    // El proceso principal la invoca antes de cerrar si hay cambios.
    onRequestSaveAll: (callback) => {
      ipcRenderer.removeAllListeners(
        "request-save-all"
      );

      ipcRenderer.on(
        "request-save-all",
        async () => {
          let ok = false;

          try {
            ok = Boolean(await callback());
          } catch {
            ok = false;
          }

          ipcRenderer.send(
            "save-all-finished",
            ok
          );
        }
      );
    },

    // Etapas del pipeline de generación (CV y kit general).
    onGenerationStage: (callback) => {
      ipcRenderer.removeAllListeners(
        "generation-stage"
      );

      ipcRenderer.on(
        "generation-stage",
        (_event, payload) => {
          callback(payload ?? {});
        }
      );
    }
  }
);