const editor =
  document.getElementById(
    "editor"
  );

const editorTitle =
  document.getElementById(
    "editor-title"
  );

const editorDescription =
  document.getElementById(
    "editor-description"
  );

const saveButton =
  document.getElementById(
    "save"
  );

const generateButton =
  document.getElementById(
    "generate"
  );

const providerSelect =
  document.getElementById(
    "provider"
  );

const modelSelect =
  document.getElementById(
    "model"
  );

const status =
  document.getElementById(
    "status"
  );

const previewCard =
  document.getElementById(
    "preview-card"
  );

const preview =
  document.getElementById(
    "preview"
  );

const openHtmlButton =
  document.getElementById(
    "open-html"
  );

const openPdfButton =
  document.getElementById(
    "open-pdf"
  );

const openFolderButton =
  document.getElementById(
    "open-folder"
  );

const tabs =
  document.querySelectorAll(
    ".tab"
  );

let files = {
  userInfo: "",
  jobOffer: ""
};

let currentTab =
  "userInfo";

let dirty = false;

let currentOutput = null;

const tabInfo = {
  userInfo: {
    title:
      "Información del candidato",
    description:
      "UserInfo.md"
  },

  jobOffer: {
    title:
      "Oferta de empleo",
    description:
      "oferta.md"
  }
};

function setStatus(message) {
  status.textContent =
    message;
}

function updateEditor() {
  editor.value =
    files[currentTab];

  editorTitle.textContent =
    tabInfo[currentTab].title;

  editorDescription.textContent =
    tabInfo[currentTab].description;

  tabs.forEach(
    (tab) => {
      tab.classList.toggle(
        "active",
        tab.dataset.tab ===
          currentTab
      );
    }
  );

  dirty = false;
}

async function loadFiles() {
  try {
    files =
      await window
        .cvAutomizer
        .getInputFiles();

    updateEditor();

    setStatus(
      "✅ Archivos cargados."
    );
  } catch (error) {
    setStatus(
      `❌ ${error.message}`
    );
  }
}

async function saveCurrentFile() {
  files[currentTab] =
    editor.value;

  try {
    await window
      .cvAutomizer
      .saveInputFile(
        currentTab,
        editor.value
      );

    dirty = false;

    setStatus(
      `✅ ${tabInfo[currentTab].description} guardado.`
    );
  } catch (error) {
    setStatus(
      `❌ ${error.message}`
    );
  }
}

async function saveAllFiles() {
  files[currentTab] =
    editor.value;

  await window
    .cvAutomizer
    .saveInputFile(
      "userInfo",
      files.userInfo
    );

  await window
    .cvAutomizer
    .saveInputFile(
      "jobOffer",
      files.jobOffer
    );

  dirty = false;
}

function loadPreview(html) {
  if (
    typeof html !== "string" ||
    !html.trim()
  ) {
    throw new Error(
      "No se recibió HTML para la previsualización."
    );
  }

  preview.srcdoc =
    html;

  previewCard.classList.remove(
    "hidden"
  );
}

async function loadModels() {
  const provider =
    providerSelect.value;

  modelSelect.innerHTML = "";

  const loadingOption =
    document.createElement(
      "option"
    );

  loadingOption.value = "";

  loadingOption.textContent =
    "Cargando modelos...";

  modelSelect.appendChild(
    loadingOption
  );

  try {
    const models =
      await window
        .cvAutomizer
        .listModels(
          provider
        );

    modelSelect.innerHTML = "";

    if (
      models.length === 0
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value = "";

      option.textContent =
        "No hay modelos disponibles";

      modelSelect.appendChild(
        option
      );

      return;
    }

    for (
      const model of models
    ) {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        model.id;

      option.textContent =
        model.name;

      modelSelect.appendChild(
        option
      );
    }
  } catch (error) {
    modelSelect.innerHTML = "";

    const option =
      document.createElement(
        "option"
      );

    option.value = "";

    option.textContent =
      "Error obteniendo modelos";

    modelSelect.appendChild(
      option
    );

    setStatus(
      `❌ ${error.message}`
    );
  }
}

tabs.forEach(
  (tab) => {
    tab.addEventListener(
      "click",
      () => {
        if (
          currentTab ===
          tab.dataset.tab
        ) {
          return;
        }

        if (dirty) {
          files[currentTab] =
            editor.value;
        }

        currentTab =
          tab.dataset.tab;

        updateEditor();
      }
    );
  }
);

editor.addEventListener(
  "input",
  () => {
    dirty = true;
  }
);

saveButton.addEventListener(
  "click",
  saveCurrentFile
);

providerSelect.addEventListener(
  "change",
  loadModels
);

generateButton.addEventListener(
  "click",
  async () => {
    try {
      await saveAllFiles();

      const provider =
        providerSelect.value;

      const model =
        modelSelect.value;

      if (!model) {
        setStatus(
          "Selecciona un modelo."
        );

        return;
      }

      generateButton.disabled =
        true;

      saveButton.disabled =
        true;

      providerSelect.disabled =
        true;

      modelSelect.disabled =
        true;

      setStatus(
        "🤖 Generando CV..."
      );

      const result =
        await window
          .cvAutomizer
          .generateCV({
            provider,
            model
          });

      currentOutput =
        result.output;

      loadPreview(
        result.html
      );

      const output =
        result.output;

      const metrics =
        result.metrics;

      const statusLines = [
        "✅ CV generado correctamente.",
        "",
        `JSON: ${output.json}`,
        `Markdown: ${output.markdown}`,
        `HTML: ${output.html}`,
        `PDF: ${output.pdf}`
      ];

      if (metrics) {
        statusLines.push(
          "",
          "📊 Métricas:"
        );

        if (
          metrics.tokensInput != null
        ) {
          statusLines.push(
            `Entrada: ${metrics.tokensInput}`
          );
        }

        if (
          metrics.tokensOutput != null
        ) {
          statusLines.push(
            `Salida: ${metrics.tokensOutput}`
          );
        }

        if (
          metrics.latencyMs != null
        ) {
          statusLines.push(
            `Tiempo: ${metrics.latencyMs} ms`
          );
        }
      }

      setStatus(
        statusLines.join("\n")
      );

    } catch (error) {
      setStatus(
        `❌ ${error.message}`
      );
    } finally {
      generateButton.disabled =
        false;

      saveButton.disabled =
        false;

      providerSelect.disabled =
        false;

      modelSelect.disabled =
        false;
    }
  }
);

openHtmlButton.addEventListener(
  "click",
  async () => {
    if (!currentOutput?.html) {
      setStatus(
        "❌ No hay un HTML generado."
      );

      return;
    }

    try {
      await window
        .cvAutomizer
        .openOutputFile(
          currentOutput.html
        );
    } catch (error) {
      setStatus(
        `❌ ${error.message}`
      );
    }
  }
);

openPdfButton.addEventListener(
  "click",
  async () => {
    if (!currentOutput?.pdf) {
      setStatus(
        "❌ No hay un PDF generado."
      );

      return;
    }

    try {
      await window
        .cvAutomizer
        .openOutputFile(
          currentOutput.pdf
        );
    } catch (error) {
      setStatus(
        `❌ ${error.message}`
      );
    }
  }
);

openFolderButton.addEventListener(
  "click",
  async () => {
    try {
      await window
        .cvAutomizer
        .showOutputFolder();
    } catch (error) {
      setStatus(
        `❌ ${error.message}`
      );
    }
  }
);

loadFiles();
loadModels();