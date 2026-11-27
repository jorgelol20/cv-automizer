// Referencias del DOM
const editorUserInfo = document.getElementById("editor-userInfo");
const editorJobOffer = document.getElementById("editor-jobOffer");
const saveButtonUserInfo = document.getElementById("save-userInfo");
const saveButtonJobOffer = document.getElementById("save-jobOffer");
const generateButton = document.getElementById("generate");
const providerSelect = document.getElementById("provider");
const modelSelect = document.getElementById("model");
const layoutSelect = document.getElementById("layout");
const skipMatchCheckbox = document.getElementById("skip-match");
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

// Aviso global de errores
const appBanner = document.getElementById("app-banner");
const bannerText = document.getElementById("app-banner-text");
const bannerAction = document.getElementById("app-banner-action");
const bannerDismiss = document.getElementById("app-banner-dismiss");
const modelHint = document.getElementById("model-hint");
const saveStateUserInfo = document.getElementById("save-state-userInfo");
const saveStateJobOffer = document.getElementById("save-state-jobOffer");
const generalSourceNote = document.getElementById("general-source-note");
const cvProgress = document.getElementById("cv-progress");
const generalProgress = document.getElementById("general-progress");

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

// API Keys elements
const panelKeys = document.getElementById("panel-keys");
const keysList = document.getElementById("keys-list");
const keysStatus = document.getElementById("keys-status");
const reloadKeysButton = document.getElementById("reload-keys");

// Modelos elements
const panelModelos = document.getElementById("panel-modelos");
const modelosList = document.getElementById("modelos-list");
const modelosStatus = document.getElementById("modelos-status");
const reloadModelosButton = document.getElementById("reload-modelos");

let files = {
  userInfo: "",
  jobOffer: ""
};

// Última versión guardada en disco: base para detectar cambios sin guardar.
let savedFiles = {
  userInfo: "",
  jobOffer: ""
};

let currentTab = "userInfo";
let currentOutput = null;
let generalOutput = null;
// Si el usuario escribe antes de que termine la carga inicial,
// no se debe sobrescribir su texto con lo leído de disco.
let hasUserTyped = false;

function setStatus(message) {
  status.textContent = message;
}

// Electron antepone "Error invoking remote method '...'" a los rechazos
// de IPC. El usuario solo necesita la causa real.
function cleanErrorMessage(error) {
  return String(error?.message ?? error ?? "")
    .replace(/^Error invoking remote method '[^']*':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim();
}

// ---- Aviso global ----
// Un solo espacio visible desde cualquier pestaña, con prioridad estable
// por origen: primero los ficheros, luego los modelos, luego el guardado.
const bannerErrors = new Map();
const BANNER_ORDER = ["files", "models", "save"];
let bannerActionHandler = null;

function renderBanner() {
  const source = BANNER_ORDER.find((key) => bannerErrors.has(key));
  const entry = source ? bannerErrors.get(source) : null;

  if (!entry) {
    appBanner.classList.add("hidden");
    bannerText.textContent = "";
    bannerAction.classList.add("hidden");
    bannerActionHandler = null;
    return;
  }

  bannerText.textContent = entry.message;

  if (entry.actionLabel && typeof entry.onAction === "function") {
    bannerAction.textContent = entry.actionLabel;
    bannerAction.classList.remove("hidden");
    bannerActionHandler = entry.onAction;
  } else {
    bannerAction.classList.add("hidden");
    bannerActionHandler = null;
  }

  appBanner.classList.remove("hidden");
}

function reportError(source, message, options = {}) {
  bannerErrors.set(source, { message, ...options });
  renderBanner();
}

function clearError(source) {
  if (bannerErrors.delete(source)) {
    renderBanner();
  }
}

bannerAction.addEventListener("click", () => {
  if (bannerActionHandler) {
    bannerActionHandler();
  }
});

bannerDismiss.addEventListener("click", () => {
  bannerErrors.clear();
  renderBanner();
});

// ---- Estado de guardado ----
function isDirty(tab) {
  const editor = getEditorForTab(tab);
  if (!editor) return false;
  return editor.value !== savedFiles[tab];
}function hasUnsavedChanges() {
  return isDirty("userInfo") || isDirty("jobOffer");
}

function paintSaveState(tab) {
  const state = tab === "userInfo" ? saveStateUserInfo : saveStateJobOffer;
  const button = tab === "userInfo" ? saveButtonUserInfo : saveButtonJobOffer;
  const dirty = isDirty(tab);

  if (state) {
    state.textContent = dirty ? "Cambios sin guardar" : "Guardado";
    state.classList.toggle("dirty", dirty);
  }

  if (button) {
    button.classList.toggle("unsaved", dirty);
  }
}

function updateDirtyIndicators() {
  paintSaveState("userInfo");
  paintSaveState("jobOffer");
  generalSourceNote?.classList.toggle("hidden", !hasUnsavedChanges());

  // La ventana principal usa este estado para avisar al cerrar.
  window.cvAutomizer.setDirtyState?.(hasUnsavedChanges());
}

// ---- Progreso por pasos ----
// Las etapas llegan del proceso principal (IPC) y se pintan como
// un stepper: el paso activo pulsa, la barra avanza con transform.
const CV_STAGES = [
  { id: "loading", label: "Leyendo el perfil y la oferta" },
  { id: "generating", label: "Redactando el CV con el modelo" },
  { id: "match", label: "Evaluando el match con la oferta" },
  { id: "saving", label: "Guardando JSON, Markdown y HTML" },
  { id: "pdf", label: "Renderizando el PDF" }
];

const GENERAL_STAGES = [
  { id: "loading", label: "Leyendo el perfil" },
  { id: "kit", label: "Escribiendo carta y email" },
  { id: "kitPdf", label: "Renderizando carta y email" },
  { id: "cv", label: "Generando el CV adaptado" },
  { id: "cvPdf", label: "Renderizando el CV" }
];

function formatElapsed(milliseconds) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function createPipeline(container) {
  if (!container) return null;

  const title = document.createElement("p");
  title.className = "pipeline-title";
  title.textContent = "Generando";

  // Anuncio solo de cambios de etapa, no del cronómetro.
  const live = document.createElement("span");
  live.className = "sr-only";
  live.setAttribute("role", "status");
  live.setAttribute("aria-live", "polite");

  const elapsed = document.createElement("span");
  elapsed.className = "pipeline-elapsed";
  elapsed.setAttribute("aria-hidden", "true");
  elapsed.textContent = "00:00";

  const head = document.createElement("div");
  head.className = "pipeline-head";
  head.append(title, elapsed);
  container.append(live);

  const fill = document.createElement("div");
  fill.className = "pipeline-fill";

  const track = document.createElement("div");
  track.className = "pipeline-track";
  track.setAttribute("aria-hidden", "true");
  track.appendChild(fill);

  const list = document.createElement("ol");
  list.className = "pipeline-steps";

  container.append(head, track, list);

  let defs = [];
  let steps = [];
  let activeIndex = -1;
  let startedAt = 0;
  let tick = null;
  let hideTimer = null;

  function stopTicking() {
    if (tick) {
      clearInterval(tick);
      tick = null;
    }
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function setProgress(completedSteps) {
    const ratio = defs.length > 0 ? completedSteps / defs.length : 0;
    fill.style.transform = `scaleX(${Math.min(1, ratio)})`;
  }

  function start(nextDefs, options = {}) {
    stopTicking();
    clearHideTimer();

    defs = nextDefs;
    steps = [];
    activeIndex = -1;
    startedAt = Date.now();

    elapsed.textContent = "00:00";
    title.textContent = options.title ?? "Generando";
    live.textContent = "";
    list.innerHTML = "";
    setProgress(0);

    for (const def of defs) {
      const item = document.createElement("li");
      item.className = "pipeline-step";

      const dot = document.createElement("span");
      dot.className = "pipeline-dot";
      dot.innerHTML =
        '<svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">' +
        '<path d="M2 5.2 L4.1 7.2 L8.1 2.8" /></svg>';

      const label = document.createElement("span");
      label.textContent = def.label;

      item.append(dot, label);
      list.appendChild(item);
      steps.push(item);
    }

    container.classList.remove("hidden", "is-done", "is-error");
    container.classList.add("is-running");

    tick = setInterval(() => {
      elapsed.textContent = formatElapsed(Date.now() - startedAt);
    }, 1000);
  }

  function setStage(id) {
    const index = defs.findIndex((def) => def.id === id);
    if (index === -1) return;

    activeIndex = index;

    steps.forEach((step, position) => {
      step.classList.toggle("is-done", position < index);
      step.classList.toggle("is-active", position === index);
      step.classList.remove("is-error");
    });

    live.textContent = `Etapa: ${defs[index].label}`;
    setProgress(index);
  }

  function done() {
    if (defs.length === 0) return;

    stopTicking();
    const spent = formatElapsed(Date.now() - startedAt);
    elapsed.textContent = spent;

    steps.forEach((step) => {
      step.classList.remove("is-active", "is-error");
      step.classList.add("is-done");
    });

    setProgress(defs.length);
    title.textContent = `Listo en ${spent}`;
    container.classList.add("is-done");
    container.classList.remove("is-running");

    clearHideTimer();
    hideTimer = setTimeout(() => {
      container.classList.add("hidden");
    }, 3000);
  }

  function fail() {
    if (defs.length === 0) return;

    stopTicking();
    container.classList.remove("is-running");
    container.classList.add("is-error");

    if (activeIndex >= 0 && steps[activeIndex]) {
      steps[activeIndex].classList.remove("is-active");
      steps[activeIndex].classList.add("is-error");
      title.textContent = `Se detuvo en: ${defs[activeIndex].label}`;
    } else {
      title.textContent = "No se pudo completar la generación";
    }
  }

  function hide() {
    stopTicking();
    clearHideTimer();
    container.classList.add("hidden");
  }

  return { start, setStage, done, fail, hide };
}

const cvPipeline = createPipeline(cvProgress);
const generalPipeline = createPipeline(generalProgress);

// Generaciones simultáneas (pestañas distintas) se distinguen por runId.
let activeCvRunId = null;
let activeGeneralRunId = null;

function makeRunId() {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

window.cvAutomizer.onGenerationStage?.(({ runId, stage }) => {
  if (!runId || !stage) return;

  if (runId === activeCvRunId) {
    cvPipeline?.setStage(stage);
  }

  if (runId === activeGeneralRunId) {
    generalPipeline?.setStage(stage);
  }
});

function updateEditor() {
  // Mostrar panel correcto según la pestaña
  panelUserInfo.classList.toggle("hidden", currentTab !== "userInfo");
  panelJobOffer.classList.toggle("hidden", currentTab !== "jobOffer");
  generalPanel.classList.toggle("hidden", currentTab !== "general");
  panelKeys.classList.toggle("hidden", currentTab !== "keys");
  panelModelos.classList.toggle("hidden", currentTab !== "modelos");

  // Mostrar selectores compartidos en Específica y General
  const showSharedSettings = currentTab === "jobOffer" || currentTab === "general";
  sharedSettings.classList.toggle("hidden", !showSharedSettings);

  // Actualizar tabs activos
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === currentTab);
  });

  updateDirtyIndicators();

  // Si estamos en general, no mostrar editor
  if (currentTab === "general") {
    return;
  }

  // En API Keys se carga la lista de claves
  if (currentTab === "keys") {
    loadKeys();
    return;
  }

  // En Modelos se carga la configuración local
  if (currentTab === "modelos") {
    loadModelosConfig();
    return;
  }

  // Cargar contenido en el editor correcto
  const currentEditor = currentTab === "userInfo" ? editorUserInfo : editorJobOffer;
  currentEditor.value = files[currentTab];
}

async function loadFiles() {
  try {
    const diskFiles = await window.cvAutomizer.getInputFiles();
    const {
      userInfo,
      jobOffer,
      usingTemplate = false
    } = diskFiles;
    const disk = {
      userInfo,
      jobOffer
    };

    // Si se cargaron plantillas, no hay versión guardada: así el editor
    // aparece como cambio pendiente y el cierre avisa de que hay que guardar.
    savedFiles = usingTemplate
      ? { userInfo: "", jobOffer: "" }
      : { ...disk };

    clearError("files");

    if (hasUserTyped) {
      // Conservar lo ya escrito: queda marcado como cambio sin guardar.
      updateDirtyIndicators();
    } else {
      files = { ...disk };
      updateEditor();
    }

    if (usingTemplate) {
      setStatus("Se cargaron las plantillas de ejemplo. Edita tu perfil y tu oferta, y guarda para crear los ficheros.");
    }
  } catch (error) {
    // Visibilidad desde cualquier pestaña + reintento accionable.
    reportError("files", `No se pudieron cargar los ficheros de entrada: ${cleanErrorMessage(error)}`, {
      actionLabel: "Reintentar",
      onAction: () => loadFiles()
    });
    setStatus(`No se pudieron cargar los ficheros: ${cleanErrorMessage(error)}`);
  }
}

async function saveCurrentFile() {
  const tab = currentTab;

  if (tab !== "userInfo" && tab !== "jobOffer") {
    return;
  }

  const currentEditor = getEditorForTab(tab);
  files[tab] = currentEditor.value;

  const fileName = tab === "userInfo" ? "UserInfo.md" : "oferta.md";

  try {
    await window.cvAutomizer.saveInputFile(tab, currentEditor.value);
    savedFiles[tab] = currentEditor.value;
    clearError("save");
    updateDirtyIndicators();
    setStatus(`${fileName} guardado.`);
  } catch (error) {
    reportError("save", `No se pudo guardar ${fileName}: ${cleanErrorMessage(error)}`, {
      actionLabel: "Reintentar",
      onAction: () => saveAllFiles()
    });
    setStatus(`No se pudo guardar ${fileName}: ${cleanErrorMessage(error)}`);
  }
}

function getEditorForTab(tab) {
  if (tab === "userInfo") return editorUserInfo;
  if (tab === "jobOffer") return editorJobOffer;
  return null;
}

// Guarda ambos ficheros desde el DOM (funciona también desde General,
// donde los editores están ocultos). Devuelve true si todo se guardó.
async function saveAllFiles() {
  files.userInfo = editorUserInfo.value;
  files.jobOffer = editorJobOffer.value;

  try {
    await window.cvAutomizer.saveInputFile("userInfo", files.userInfo);
    await window.cvAutomizer.saveInputFile("jobOffer", files.jobOffer);

    savedFiles.userInfo = files.userInfo;
    savedFiles.jobOffer = files.jobOffer;

    clearError("save");
    updateDirtyIndicators();
    return true;
  } catch (error) {
    reportError("save", `No se pudieron guardar los cambios: ${cleanErrorMessage(error)}`, {
      actionLabel: "Reintentar",
      onAction: () => saveAllFiles()
    });
    return false;
  }
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

// Al cambiar de proveedor o empezar otra generación, la vista anterior
// dejaría de corresponder a lo que hay en pantalla.
function clearPreview() {
  currentOutput = null;
  preview.srcdoc = "";
  previewCard.classList.add("hidden");
}

function setModelHint(message, tone = "info") {
  if (!modelHint) return;

  modelHint.textContent = message || "";
  modelHint.classList.toggle("hidden", !message);
  modelHint.classList.toggle("error", Boolean(message) && tone === "error");
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
    clearError("models");

    if (models.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No hay modelos disponibles";
      modelSelect.appendChild(option);
      setModelHint(
        "El proveedor no devolvió modelos. Revisa que el servicio esté en marcha o que la clave sea correcta.",
        "error"
      );
      return;
    }

    setModelHint("");

    for (const model of models) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      option.dataset.modelId = model.id;
      modelSelect.appendChild(option);
    }

    // Preseleccionar el favorito guardado
    // (si no está en la lista, se añade
    // como opción marcada para no perderlo).
    try {
      const config =
        await window.cvAutomizer.getModelosConfig();
      const favorito =
        config?.providers?.[provider]?.valores?.model || "";

      if (favorito) {
        let option = [...modelSelect.options].find(
          (entry) => entry.value === favorito
        );

        if (!option) {
          option = document.createElement("option");
          option.value = favorito;
          option.textContent = `${favorito} (guardado)`;
          modelSelect.insertBefore(
            option,
            modelSelect.firstChild
          );
        } else {
          option.textContent = `${option.textContent} ★`;
        }

        option.selected = true;
      }
    } catch {
      // Sin favorito: se deja la primera opción.
    }
  } catch (error) {
    modelSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Error obteniendo modelos";
    modelSelect.appendChild(option);
    setModelHint(
      "No se pudo listar los modelos. Revisa la configuración del proveedor en API Keys.",
      "error"
    );
    reportError("models", `No se pudieron obtener los modelos: ${cleanErrorMessage(error)}`, {
      actionLabel: "Ir a API Keys",
      onAction: () => switchTab("keys")
    });
  }
}

function switchTab(tabId) {
  if (currentTab === tabId) return;

  const currentEditor = getEditorForTab(currentTab);
  if (currentEditor) {
    files[currentTab] = currentEditor.value;
  }

  currentTab = tabId;
  updateEditor();
}

// Event listeners de pestañas
tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

editorUserInfo.addEventListener("input", () => {
  hasUserTyped = true;
  updateDirtyIndicators();
});

editorJobOffer.addEventListener("input", () => {
  hasUserTyped = true;
  updateDirtyIndicators();
});

saveButtonUserInfo.addEventListener("click", saveCurrentFile);
saveButtonJobOffer.addEventListener("click", saveCurrentFile);

// Ctrl+S / Cmd+S guarda ambos ficheros desde cualquier pestaña.
document.addEventListener("keydown", (event) => {
  const isSaveShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    event.key.toLowerCase() === "s";

  if (!isSaveShortcut) return;

  event.preventDefault();
  saveAllFiles();
});

providerSelect.addEventListener("change", async () => {
  clearPreview();
  clearMatch();
  await loadModels();
});

// Generar CV (pestaña Específica)
generateButton.addEventListener("click", async () => {
  try {
    const savedOk = await saveAllFiles();

    if (!savedOk) {
      cvPipeline?.hide();
      setStatus("No se generó el CV: no se pudieron guardar los datos de entrada.");
      return;
    }

    const provider = providerSelect.value;
    const model = modelSelect.value;

    if (!model) {
      cvPipeline?.hide();
      setStatus("Selecciona un modelo.");
      return;
    }

    generateButton.disabled = true;
    saveButtonUserInfo.disabled = true;
    saveButtonJobOffer.disabled = true;
    providerSelect.disabled = true;
    modelSelect.disabled = true;
    layoutSelect.disabled = true;
    if (skipMatchCheckbox) skipMatchCheckbox.disabled = true;

    clearPreview();
    clearMatch();

    const skipMatch = skipMatchCheckbox?.checked ?? false;
    const runId = makeRunId();
    activeCvRunId = runId;

    cvPipeline?.start(
      skipMatch
        ? CV_STAGES.filter((stage) => stage.id !== "match")
        : CV_STAGES,
      { title: "Generando tu CV" }
    );

    setStatus("Generando CV...");

    const result = await window.cvAutomizer.generateCV({
      provider,
      model,
      layout: layoutSelect.value,
      skipMatch,
      runId
    });

    if (!result) {
      throw new Error("No se recibió ningún resultado de la generación.");
    }

    cvPipeline?.done();
    activeCvRunId = null;

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
    cvPipeline?.fail();
    activeCvRunId = null;
    setStatus(`❌ ${cleanErrorMessage(error)}`);
  } finally {
    generateButton.disabled = false;
    saveButtonUserInfo.disabled = false;
    saveButtonJobOffer.disabled = false;
    providerSelect.disabled = false;
    modelSelect.disabled = false;
    layoutSelect.disabled = false;
    if (skipMatchCheckbox) skipMatchCheckbox.disabled = false;
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
    setStatus(`❌ ${cleanErrorMessage(error)}`);
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
    setStatus(`❌ ${cleanErrorMessage(error)}`);
  }
});

openFolderButton.addEventListener("click", async () => {
  try {
    await window.cvAutomizer.showOutputFolder();
  } catch (error) {
    setStatus(`❌ ${cleanErrorMessage(error)}`);
  }
});

// Generar Kit de Candidatura (pestaña General)
generateGeneralButton.addEventListener("click", async () => {
  const companyName = companyNameInput.value.trim();

  if (!companyName) {
    generalPipeline?.hide();
    generalStatus.textContent = "❌ Introduce el nombre de la empresa.";
    generalResult.classList.remove("hidden");
    return;
  }

  const provider = providerSelect.value;
  const model = modelSelect.value;

  if (!model) {
    generalPipeline?.hide();
    generalStatus.textContent = "❌ Selecciona un modelo.";
    generalResult.classList.remove("hidden");
    return;
  }

  try {
    const savedOk = await saveAllFiles();

    if (!savedOk) {
      generalPipeline?.hide();
      generalStatus.textContent =
        "❌ No se generó el kit: no se pudieron guardar los datos de entrada.";
      generalResult.classList.remove("hidden");
      return;
    }

    generateGeneralButton.disabled = true;
    providerSelect.disabled = true;
    modelSelect.disabled = true;
    layoutSelect.disabled = true;
    if (skipMatchCheckbox) skipMatchCheckbox.disabled = true;

    generalOutput = null;
    const runId = makeRunId();
    activeGeneralRunId = runId;

    generalPipeline?.start(GENERAL_STAGES, {
      title: "Generando tu kit de candidatura"
    });
    generalStatus.textContent = "Generando kit de candidatura...";
    generalResult.classList.remove("hidden");

    const result = await window.cvAutomizer.generateGeneralKit({
      provider,
      model,
      companyName,
      companyType: companyTypeSelect.value,
      tone: toneSelect.value,
      letterLength: letterLengthSelect.value,
      layout: layoutSelect.value,
      skipMatch: skipMatchCheckbox?.checked ?? false,
      runId
    });

    generalPipeline?.done();
    activeGeneralRunId = null;

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
    generalPipeline?.fail();
    activeGeneralRunId = null;
    generalStatus.textContent = `❌ ${cleanErrorMessage(error)}`;
  } finally {
    generateGeneralButton.disabled = false;
    providerSelect.disabled = false;
    modelSelect.disabled = false;
    layoutSelect.disabled = false;
    if (skipMatchCheckbox) skipMatchCheckbox.disabled = false;

    // Las salidas solo se abren si esta ejecución dejó ficheros.
    const haySalidas = Boolean(generalOutput);
    openCvPdfButton.disabled = !haySalidas;
    openLetterPdfButton.disabled = !haySalidas;
    openEmailPdfButton.disabled = !haySalidas;
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
    generalStatus.textContent = `❌ ${cleanErrorMessage(error)}`;
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
    generalStatus.textContent = `❌ ${cleanErrorMessage(error)}`;
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
    generalStatus.textContent = `❌ ${cleanErrorMessage(error)}`;
  }
});

openGeneralFolderButton.addEventListener("click", async () => {
  try {
    await window.cvAutomizer.showOutputFolder();
  } catch (error) {
    generalStatus.textContent = `❌ ${cleanErrorMessage(error)}`;
  }
});

function setKeysStatus(message) {
  if (keysStatus) {
    keysStatus.textContent = message;
  }
}

async function loadKeys() {
  if (!keysList) {
    return;
  }

  keysList.innerHTML = "";
  setKeysStatus("🔑 Cargando claves...");

  try {
    const keys =
      await window.cvAutomizer.getApiKeys();

    keysList.innerHTML = "";

    for (const key of keys) {
      keysList.appendChild(
        buildKeyRow(key)
      );
    }

    const ok = keys.filter(
      (key) => key.configured
    ).length;

    setKeysStatus(
      `✅ ${ok}/${keys.length} claves configuradas. Solo proveedores soportados.`
    );
  } catch (error) {
    setKeysStatus(
      `❌ ${cleanErrorMessage(error)}`
    );
  }
}

function buildKeyRow(key) {
  const row = document.createElement("div");
  row.className = "key-row";

  const header =
    document.createElement("div");
  header.className = "key-row-header";

  const title =
    document.createElement("strong");
  title.textContent =
    `${key.etiqueta} (${key.name})`;

  const badge =
    document.createElement("span");
  badge.className =
    "key-badge" +
    (key.configured ? " ok" : "");
  badge.textContent = key.configured
    ? `✅ ${key.masked} · ${key.source}`
    : "❌ no configurada";

  header.appendChild(title);
  header.appendChild(badge);
  row.appendChild(header);

  if (key.ayuda) {
    const help =
      document.createElement("p");
    help.className = "key-help";
    help.textContent = key.ayuda;
    row.appendChild(help);
  }

  const inputRow =
    document.createElement("div");
  inputRow.className =
    "key-input-row";

  const input =
    document.createElement("input");
  input.type = "password";
  input.placeholder =
    "Pegar nueva clave...";
  input.setAttribute(
    "data-key-input",
    key.name
  );
  inputRow.appendChild(input);

  const actions =
    document.createElement("div");
  actions.className = "key-actions";

  const toggleButton =
    document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "secondary";
  toggleButton.textContent = "Mostrar";
  toggleButton.addEventListener(
    "click",
    () => {
      const visible =
        input.type === "text";
      input.type = visible
        ? "password"
        : "text";
      toggleButton.textContent =
        visible ? "Mostrar" : "Ocultar";
    }
  );

  const saveButton =
    document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "secondary";
  saveButton.textContent = "Guardar";
  saveButton.addEventListener(
    "click",
    async () => {
      const value = input.value;

      if (!value.trim()) {
        setKeysStatus(
          "❌ Pega una clave antes de guardar."
        );
        return;
      }

      try {
        setKeysStatus(
          `💾 Guardando ${key.name}...`
        );

        await window.cvAutomizer.saveApiKey(
          key.name,
          value
        );

        input.value = "";
        await loadKeys();
        // Al corregir la clave, el selector de modelos se recupera solo.
        await loadModels();
      } catch (error) {
        setKeysStatus(
          `❌ ${cleanErrorMessage(error)}`
        );
      }
    }
  );

  const clearButton =
    document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "secondary";
  clearButton.textContent = "Borrar";
  clearButton.disabled = !key.configured;
  clearButton.addEventListener(
    "click",
    async () => {
      try {
        setKeysStatus(
          `🗑️ Borrando ${key.name}...`
        );

        await window.cvAutomizer.clearApiKey(
          key.name
        );

        await loadKeys();
        await loadModels();
      } catch (error) {
        setKeysStatus(
          `❌ ${cleanErrorMessage(error)}`
        );
      }
    }
  );

  const testButton =
    document.createElement("button");
  testButton.type = "button";
  testButton.className = "secondary";
  testButton.textContent = "Probar";
  testButton.disabled = !key.configured;
  testButton.addEventListener(
    "click",
    async () => {
      try {
        setKeysStatus(
          `🔎 Probando ${key.etiqueta}...`
        );

        const models =
          await window.cvAutomizer.listModels(
            key.provider
          );

        setKeysStatus(
          `✅ ${key.etiqueta}: conexión OK (${models.length} modelos).`
        );
      } catch (error) {
        setKeysStatus(
          `❌ ${key.etiqueta}: ${cleanErrorMessage(error)}`
        );
      }
    }
  );

  actions.appendChild(toggleButton);
  actions.appendChild(saveButton);
  actions.appendChild(clearButton);
  actions.appendChild(testButton);
  inputRow.appendChild(actions);
  row.appendChild(inputRow);

  return row;
}

if (reloadKeysButton) {
  reloadKeysButton.addEventListener(
    "click",
    loadKeys
  );
}

// ---- Pestaña Modelos ----

const MODELO_CAMPOS_NUMERICOS = [
  { campo: "temperatureCV", etiqueta: "Temperatura CV (0–2)" },
  { campo: "maxTokensCV", etiqueta: "Tokens máx. CV (512–32768)" },
  { campo: "temperatureMatch", etiqueta: "Temperatura match (0–2)" },
  { campo: "maxTokensMatch", etiqueta: "Tokens máx. match (512–32768)" },
  { campo: "temperatureGeneral", etiqueta: "Temperatura general (0–2)" },
  { campo: "maxTokensGeneral", etiqueta: "Tokens máx. general (512–32768)" }
];

function setModelosStatus(message) {
  if (modelosStatus) {
    modelosStatus.textContent = message;
  }
}

function buildCampoNumerico(campo, etiqueta, valor, placeholder) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = etiqueta;
  wrapper.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.placeholder =
    placeholder !== undefined && placeholder !== null
      ? `Defecto: ${placeholder}`
      : "";
  input.value =
    valor === null || valor === undefined ? "" : String(valor);
  input.setAttribute("data-modelo-campo", campo);
  wrapper.appendChild(input);

  return wrapper;
}

function buildDefaultsCard(defaults) {
  const row = document.createElement("div");
  row.className = "key-row";

  const header = document.createElement("div");
  header.className = "key-row-header";

  const title = document.createElement("strong");
  title.textContent = "Valores por defecto";
  header.appendChild(title);
  row.appendChild(header);

  const help = document.createElement("p");
  help.className = "key-help";
  help.textContent =
    "Se aplican a todos los proveedores salvo que tengan su propio valor.";
  row.appendChild(help);

  const inputs = {};

  for (const { campo, etiqueta } of MODELO_CAMPOS_NUMERICOS) {
    const wrapper = buildCampoNumerico(
      campo,
      etiqueta,
      defaults[campo],
      null
    );
    inputs[campo] = wrapper.querySelector("input");
    row.appendChild(wrapper);
  }

  const actions = document.createElement("div");
  actions.className = "key-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "secondary";
  saveButton.textContent = "Guardar defectos";
  saveButton.addEventListener("click", async () => {
    try {
      setModelosStatus("💾 Guardando defectos...");

      for (const { campo } of MODELO_CAMPOS_NUMERICOS) {
        await window.cvAutomizer.saveModeloConfig(
          "defaults",
          campo,
          inputs[campo].value
        );
      }

      await loadModelosConfig();
      setModelosStatus("✅ Defectos guardados.");
    } catch (error) {
      setModelosStatus(`❌ ${cleanErrorMessage(error)}`);
    }
  });

  actions.appendChild(saveButton);
  row.appendChild(actions);

  return row;
}

function buildModeloCard(provider, entrada, defaults) {
  const row = document.createElement("div");
  row.className = "key-row";

  const header = document.createElement("div");
  header.className = "key-row-header";

  const title = document.createElement("strong");
  title.textContent = `${entrada.etiqueta} (${provider})`;
  header.appendChild(title);

  const fijados = Object.values(entrada.valores).filter(
    (valor) => valor !== null
  ).length;

  const badge = document.createElement("span");
  badge.className = "key-badge" + (fijados > 0 ? " ok" : "");
  badge.textContent =
    fijados > 0 ? `✅ ${fijados} propios` : "hereda defectos";
  header.appendChild(badge);
  row.appendChild(header);

  // Modelo favorito: desplegable con la lista
  // viva + texto libre (funciona sin clave/red).
  const modelWrapper = document.createElement("div");
  modelWrapper.className = "field";

  const modelLabel = document.createElement("label");
  modelLabel.textContent = "Modelo favorito";
  modelWrapper.appendChild(modelLabel);

  const modelInput = document.createElement("input");
  modelInput.type = "text";
  modelInput.placeholder = "Vacío = sin favorito";
  modelInput.value = entrada.valores.model ?? "";
  modelInput.setAttribute("data-modelo-campo", "model");
  modelInput.setAttribute("list", `datalist-${provider}`);
  modelWrapper.appendChild(modelInput);

  const datalist = document.createElement("datalist");
  datalist.id = `datalist-${provider}`;
  modelWrapper.appendChild(datalist);

  row.appendChild(modelWrapper);

  const inputs = { model: modelInput };

  for (const { campo, etiqueta } of MODELO_CAMPOS_NUMERICOS) {
    const wrapper = buildCampoNumerico(
      campo,
      etiqueta,
      entrada.valores[campo],
      defaults[campo]
    );
    inputs[campo] = wrapper.querySelector("input");
    row.appendChild(wrapper);
  }

  const actions = document.createElement("div");
  actions.className = "key-actions";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.className = "secondary";
  saveButton.textContent = "Guardar";
  saveButton.addEventListener("click", async () => {
    try {
      setModelosStatus(`💾 Guardando ${entrada.etiqueta}...`);

      for (const campo of Object.keys(inputs)) {
        await window.cvAutomizer.saveModeloConfig(
          provider,
          campo,
          inputs[campo].value
        );
      }

      await loadModelosConfig();

      // Refrescar el ★ del desplegable si es
      // el proveedor actualmente seleccionado.
      if (providerSelect.value === provider) {
        await loadModels();
      }

      setModelosStatus(`✅ ${entrada.etiqueta} guardado.`);
    } catch (error) {
      setModelosStatus(`❌ ${cleanErrorMessage(error)}`);
      await loadModelosConfig();
    }
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "secondary";
  resetButton.textContent = "Restablecer";
  resetButton.disabled = fijados === 0;
  resetButton.addEventListener("click", async () => {
    try {
      setModelosStatus(`🗑️ Restableciendo ${entrada.etiqueta}...`);

      await window.cvAutomizer.resetModeloConfig(provider);

      await loadModelosConfig();

      if (providerSelect.value === provider) {
        await loadModels();
      }

      setModelosStatus(`✅ ${entrada.etiqueta} restablecido.`);
    } catch (error) {
      setModelosStatus(`❌ ${cleanErrorMessage(error)}`);
    }
  });

  actions.appendChild(saveButton);
  actions.appendChild(resetButton);
  row.appendChild(actions);

  return row;
}

async function rellenarDatalist(provider) {
  const datalist = document.getElementById(`datalist-${provider}`);

  if (!datalist) {
    return;
  }

  try {
    const models = await window.cvAutomizer.listModels(provider);

    datalist.innerHTML = "";

    for (const model of models) {
      const option = document.createElement("option");
      option.value = model.id;
      datalist.appendChild(option);
    }
  } catch {
    // Sin clave o sin red: el campo libre
    // sigue funcionando, sin sugerencias.
  }
}

async function loadModelosConfig() {
  if (!modelosList) {
    return;
  }

  modelosList.innerHTML = "";
  setModelosStatus("🧠 Cargando configuración...");

  try {
    const config = await window.cvAutomizer.getModelosConfig();

    modelosList.innerHTML = "";
    modelosList.appendChild(buildDefaultsCard(config.defaults));

    for (const [provider, entrada] of Object.entries(config.providers)) {
      modelosList.appendChild(
        buildModeloCard(provider, entrada, config.defaults)
      );
    }

    setModelosStatus(
      "✅ Configuración cargada. Vacío = hereda el defecto."
    );

    for (const provider of Object.keys(config.providers)) {
      rellenarDatalist(provider);
    }
  } catch (error) {
    setModelosStatus(`❌ ${cleanErrorMessage(error)}`);
  }
}

if (reloadModelosButton) {
  reloadModelosButton.addEventListener("click", loadModelosConfig);
}

// El proceso principal pide guardar antes de cerrar la ventana.
window.cvAutomizer.onRequestSaveAll?.(async () => saveAllFiles());

// Inicialización
clearMatch();
updateDirtyIndicators();
loadFiles();
loadModels();
