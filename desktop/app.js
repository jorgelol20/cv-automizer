// Referencias del DOM
const editorUserInfo = document.getElementById("editor-userInfo");
const editorJobOffer = document.getElementById("editor-jobOffer");
const saveButtonUserInfo = document.getElementById("save-userInfo");
const saveButtonJobOffer = document.getElementById("save-jobOffer");
const generateButton = document.getElementById("generate");
const providerSelect = document.getElementById("provider");
const modelSelect = document.getElementById("model");
const layoutSelect = document.getElementById("layout");
const status = document.getElementById("status");
const previewCard = document.getElementById("preview-card");
const preview = document.getElementById("preview");
const openHtmlButton = document.getElementById("open-html");
const openPdfButton = document.getElementById("open-pdf");
const openFolderButton = document.getElementById("open-folder");
const tabs = document.querySelectorAll(".tab");
const matchResult = document.getElementById("match-result");
const matchScoreValue = document.getElementById("match-score-value");
const matchSummary = document.getElementById("match-summary");
const matchStrengths = document.getElementById("match-strengths");
const matchGaps = document.getElementById("match-gaps");

// General mode elements
const generalPanel = document.getElementById("panel-general");
const generalResult = document.getElementById("general-result");
const generalStatus = document.getElementById("general-status");
const generateGeneralButton = document.getElementById("generate-general");
const companyNameInput = document.getElementById("company-name");
const companyTypeSelect = document.getElementById("company-type");
const toneSelect = document.getElementById("tone");
const letterLengthSelect = document.getElementById("letter-length");
const openCvPdfButton = document.getElementById("open-cv-pdf");
const openLetterPdfButton = document.getElementById("open-letter-pdf");
const openEmailPdfButton = document.getElementById("open-email-pdf");
const openGeneralFolderButton = document.getElementById("open-general-folder");

// Paneles de pestañas
const panelUserInfo = document.getElementById("panel-userInfo");
const panelJobOffer = document.getElementById("panel-jobOffer");
const sharedSettings = document.getElementById("shared-settings");

let files = {
  userInfo: "",
  jobOffer: ""
};

let currentTab = "userInfo";
let dirty = false;
let currentOutput = null;
let generalOutput = null;

function setStatus(message) {
  status.textContent = message;
}

function updateEditor() {
  // Mostrar panel correcto según la pestaña
  panelUserInfo.classList.toggle("hidden", currentTab !== "userInfo");
  panelJobOffer.classList.toggle("hidden", currentTab !== "jobOffer");
  generalPanel.classList.toggle("hidden", currentTab !== "general");

  // Mostrar selectores compartidos en Específica y General
  const showSharedSettings = currentTab === "jobOffer" || currentTab === "general";
  sharedSettings.classList.toggle("hidden", !showSharedSettings);

  // Actualizar tabs activos
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === currentTab);
  });

  // Si estamos en general, no mostrar editor
  if (currentTab === "general") {
    return;
  }

  // Cargar contenido en el editor correcto
  const currentEditor = currentTab === "userInfo" ? editorUserInfo : editorJobOffer;
  currentEditor.value = files[currentTab];
  dirty = false;
}

async function loadFiles() {
  try {
    files = await window.cvAutomizer.getInputFiles();
    updateEditor();
    setStatus("✅ Archivos cargados.");
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  }
}

async function saveCurrentFile() {
  const currentEditor = currentTab === "userInfo" ? editorUserInfo : editorJobOffer;
  files[currentTab] = currentEditor.value;

  const fileName = currentTab === "userInfo" ? "UserInfo.md" : "oferta.md";

  try {
    await window.cvAutomizer.saveInputFile(currentTab, currentEditor.value);
    dirty = false;
    setStatus(`✅ ${fileName} guardado.`);
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  }
}

function getEditorForTab(tab) {
  if (tab === "userInfo") return editorUserInfo;
  if (tab === "jobOffer") return editorJobOffer;
  return null;
}

async function saveAllFiles() {
  const currentEditor = getEditorForTab(currentTab);
  if (currentEditor) {
    files[currentTab] = currentEditor.value;
  } else {
    // En la pestaña General los editores están ocultos:
    // sincronizar desde el DOM para no perder cambios.
    files.userInfo = editorUserInfo.value;
    files.jobOffer = editorJobOffer.value;
  }

  await window.cvAutomizer.saveInputFile("userInfo", files.userInfo);
  await window.cvAutomizer.saveInputFile("jobOffer", files.jobOffer);

  dirty = false;
}

function clearMatch() {
  if (!matchResult) return;

  matchScoreValue.textContent = "–";
  matchSummary.textContent = "";
  matchStrengths.innerHTML = "";
  matchGaps.innerHTML = "";
  matchResult.classList.add("hidden");
}

function showMatch(match) {
  if (!match) {
    clearMatch();
    return;
  }

  matchScoreValue.textContent = match.score ?? "–";
  matchSummary.textContent = match.summary ?? "";

  matchStrengths.innerHTML = "";
  for (const strength of match.strengths ?? []) {
    const li = document.createElement("li");
    li.textContent = strength;
    matchStrengths.appendChild(li);
  }

  matchGaps.innerHTML = "";
  for (const gap of match.gaps ?? []) {
    const li = document.createElement("li");
    li.textContent = gap;
    matchGaps.appendChild(li);
  }

  matchResult.classList.remove("hidden");
}

function loadPreview(html) {
  if (typeof html !== "string" || !html.trim()) {
    throw new Error("No se recibió HTML para la previsualización.");
  }

  preview.srcdoc = html;
  previewCard.classList.remove("hidden");
}

async function loadModels() {
  const provider = providerSelect.value;

  modelSelect.innerHTML = "";

  const loadingOption = document.createElement("option");
  loadingOption.value = "";
  loadingOption.textContent = "Cargando modelos...";
  modelSelect.appendChild(loadingOption);

  try {
    const models = await window.cvAutomizer.listModels(provider);

    modelSelect.innerHTML = "";

    if (models.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay modelos disponibles";
      modelSelect.appendChild(option);
      return;
    }

    for (const model of models) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    }
  } catch (error) {
    modelSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Error obteniendo modelos";
    modelSelect.appendChild(option);
    setStatus(`❌ ${error.message}`);
  }
}

// Event listeners de pestañas
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (currentTab === tab.dataset.tab) return;

    if (dirty) {
      const currentEditor = getEditorForTab(currentTab);
      if (currentEditor) {
        files[currentTab] = currentEditor.value;
      }
    }

    currentTab = tab.dataset.tab;
    updateEditor();
  });
});

editorUserInfo.addEventListener("input", () => {
  dirty = true;
});

editorJobOffer.addEventListener("input", () => {
  dirty = true;
});

saveButtonUserInfo.addEventListener("click", saveCurrentFile);
saveButtonJobOffer.addEventListener("click", saveCurrentFile);

providerSelect.addEventListener("change", async () => {
  currentOutput = null;
  clearMatch();
  await loadModels();
});

// Generar CV (pestaña Específica)
generateButton.addEventListener("click", async () => {
  try {
    await saveAllFiles();

    const provider = providerSelect.value;
    const model = modelSelect.value;

    if (!model) {
      setStatus("Selecciona un modelo.");
      return;
    }

    generateButton.disabled = true;
    saveButtonUserInfo.disabled = true;
    saveButtonJobOffer.disabled = true;
    providerSelect.disabled = true;
    modelSelect.disabled = true;
    layoutSelect.disabled = true;

    currentOutput = null;
    clearMatch();

    setStatus("🤖 Generando CV...");

    const result = await window.cvAutomizer.generateCV({
      provider,
      model,
      layout: layoutSelect.value
    });

    if (!result) {
      throw new Error("No se recibió ningún resultado de la generación.");
    }

    currentOutput = result.output ?? null;

    if (result.html) {
      loadPreview(result.html);
    }

    showMatch(result.match);

    const output = result.output ?? {};
    const metrics = result.metrics;

    const statusLines = ["✅ CV generado correctamente."];

    if (output.json) statusLines.push("", `JSON: ${output.json}`);
    if (output.markdown) statusLines.push(`Markdown: ${output.markdown}`);
    if (output.html) statusLines.push(`HTML: ${output.html}`);
    if (output.pdf) statusLines.push(`PDF: ${output.pdf}`);

    if (result.match) {
      statusLines.push("", `🎯 Match: ${result.match.score}/100`);
    }

    if (metrics) {
      statusLines.push("", "📊 Métricas:");
      if (metrics.tokensInput != null) statusLines.push(`Entrada: ${metrics.tokensInput}`);
      if (metrics.tokensOutput != null) statusLines.push(`Salida: ${metrics.tokensOutput}`);
      if (metrics.latencyMs != null) statusLines.push(`Tiempo: ${metrics.latencyMs} ms`);
    }

    setStatus(statusLines.join("\n"));

  } catch (error) {
    clearMatch();
    setStatus(`❌ ${error.message}`);
  } finally {
    generateButton.disabled = false;
    saveButtonUserInfo.disabled = false;
    saveButtonJobOffer.disabled = false;
    providerSelect.disabled = false;
    modelSelect.disabled = false;
    layoutSelect.disabled = false;
  }
});

openHtmlButton.addEventListener("click", async () => {
  if (!currentOutput?.html) {
    setStatus("❌ No hay un HTML generado.");
    return;
  }

  try {
    await window.cvAutomizer.openOutputFile(currentOutput.html);
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  }
});

openPdfButton.addEventListener("click", async () => {
  if (!currentOutput?.pdf) {
    setStatus("❌ No hay un PDF generado.");
    return;
  }

  try {
    await window.cvAutomizer.openOutputFile(currentOutput.pdf);
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  }
});

openFolderButton.addEventListener("click", async () => {
  try {
    await window.cvAutomizer.showOutputFolder();
  } catch (error) {
    setStatus(`❌ ${error.message}`);
  }
});

// Generar Kit de Candidatura (pestaña General)
generateGeneralButton.addEventListener("click", async () => {
  const companyName = companyNameInput.value.trim();

  if (!companyName) {
    generalStatus.textContent = "❌ Introduce el nombre de la empresa.";
    generalResult.classList.remove("hidden");
    return;
  }

  const provider = providerSelect.value;
  const model = modelSelect.value;

  if (!model) {
    generalStatus.textContent = "❌ Selecciona un modelo.";
    generalResult.classList.remove("hidden");
    return;
  }

  try {
    generateGeneralButton.disabled = true;
    providerSelect.disabled = true;
    modelSelect.disabled = true;
    layoutSelect.disabled = true;

    generalStatus.textContent = "🤖 Generando kit de candidatura...";
    generalResult.classList.remove("hidden");

    const result = await window.cvAutomizer.generateGeneralKit({
      provider,
      model,
      companyName,
      companyType: companyTypeSelect.value,
      tone: toneSelect.value,
      letterLength: letterLengthSelect.value,
      layout: layoutSelect.value
    });

    generalOutput = result.output;

    const statusLines = [
      "✅ Kit de candidatura generado correctamente.",
      "",
      `📄 CV PDF: ${result.output.cvPdf}`,
      `📄 CV HTML: ${result.output.cvHtml}`,
      "",
      `Carta PDF: ${result.output.letterPdf}`,
      `Email PDF: ${result.output.emailPdf}`
    ];

    if (result.metrics) {
      statusLines.push(
        "",
        "📊 Métricas:",
        `Entrada: ${result.metrics.tokensInput}`,
        `Salida: ${result.metrics.tokensOutput}`,
        `Tiempo: ${result.metrics.latencyMs} ms`
      );
    }

    generalStatus.textContent = statusLines.join("\n");

  } catch (error) {
    generalStatus.textContent = `❌ ${error.message}`;
  } finally {
    generateGeneralButton.disabled = false;
    providerSelect.disabled = false;
    modelSelect.disabled = false;
    layoutSelect.disabled = false;
  }
});

openCvPdfButton.addEventListener("click", async () => {
  if (!generalOutput?.cvPdf) {
    generalStatus.textContent = "❌ No hay un CV generado.";
    return;
  }

  try {
    await window.cvAutomizer.openOutputFile(generalOutput.cvPdf);
  } catch (error) {
    generalStatus.textContent = `❌ ${error.message}`;
  }
});

openLetterPdfButton.addEventListener("click", async () => {
  if (!generalOutput?.letterPdf) {
    generalStatus.textContent = "❌ No hay una carta generada.";
    return;
  }

  try {
    await window.cvAutomizer.openOutputFile(generalOutput.letterPdf);
  } catch (error) {
    generalStatus.textContent = `❌ ${error.message}`;
  }
});

openEmailPdfButton.addEventListener("click", async () => {
  if (!generalOutput?.emailPdf) {
    generalStatus.textContent = "❌ No hay un email generado.";
    return;
  }

  try {
    await window.cvAutomizer.openOutputFile(generalOutput.emailPdf);
  } catch (error) {
    generalStatus.textContent = `❌ ${error.message}`;
  }
});

openGeneralFolderButton.addEventListener("click", async () => {
  try {
    await window.cvAutomizer.showOutputFolder();
  } catch (error) {
    generalStatus.textContent = `❌ ${error.message}`;
  }
});

// Inicialización
clearMatch();
loadFiles();
loadModels();
