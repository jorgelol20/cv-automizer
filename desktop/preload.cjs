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
      )
  }
);