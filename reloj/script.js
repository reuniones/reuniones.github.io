// Register the service worker for PWA support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

function getClockUrlFromCookie() {
  const match = document.cookie.match(/(?:^|; )clock_url=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);
  // Fallback to old clock_ip cookie
  const ipMatch = document.cookie.match(/(?:^|; )clock_ip=([^;]+)/);
  return ipMatch ? `http://${ipMatch[1]}` : null;
}

function saveClockUrlToCookie(url) {
  document.cookie = `clock_url=${encodeURIComponent(url)}; path=/; max-age=31536000`;
}

function normalizeUrlInput(raw) {
  if (!/^https?:\/\//.test(raw)) {
    raw = "http://" + raw;
  }
  return raw;
}

function isValidClockUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    // Allow 'reloj.local', IP addresses, or any valid hostname longer than 3 chars
    const isValidHost = host === "reloj.local" || 
                        /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || 
                        (host.includes(".") && host.length > 3);
    return isValidHost && (parsed.protocol === "http:" || parsed.protocol === "https:");
  } catch (e) {
    return false;
  }
}

// ========== Configurable Timeouts ==========
const RECONNECT_DELAY_MS = 5000;        // Retry every 2s
const CONNECTING_THRESHOLD_MS = 2500;   // Show "Conectando" after 2.5s
const FAILURE_THRESHOLD_MS = 5000;      // Show modal after 5s
let currentDisplayMode = "clock";
let connectionStatus = "connecting"; // global tracker
let programs = {};
let currentProgram = null;
let currentItemIndex = 0;
let measuredTimes = {};
let suppressNextStopwatchUpdate = false;
let stopwatchTime = 0;
let currentBaseUrl = "http://reloj.local";  // default fallback
let deviceBuildDate = null;
let serverFirmwareDate = null;





const day = new Date().getDay(); // 0 (Sun) to 6 (Sat)
const defaultType = (day === 0 || day === 6) ? "fin_de_semana" : "entre_semana";


document.addEventListener("DOMContentLoaded", () => {
  updateConnectionStatus("connecting"); // ✅ force initial connecting status
  setPanelBlur(true); // ✅ blur panels initially
  // === State Variables ===
  let suppressChange = false;
  let eventSource;
  let lastEventTime = Date.now();
  let blinkEnabled = false;
  let stopwatchState = "reset";

  document.getElementById("enableProgramSwitch").checked = false;
  document.getElementById("programSelector").style.display = "none";
  document.getElementById("programUI").style.display = "none";

  // Ensure slider starts at zero if not following program
  const countdownInputInit = document.getElementById("countdownInput");
  if (countdownInputInit) {
    countdownInputInit.value = 0;
    const countdownOutputInit = document.getElementById("countdownOutput");
    if (countdownOutputInit) countdownOutputInit.textContent = "0 min";
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const storedDay = localStorage.getItem("lastUsedDate");

  const clockUrlInput = document.getElementById("urlInput");
  const urlParams = new URLSearchParams(window.location.search);
  const queryClock = urlParams.get('clock');

  if (queryClock && clockUrlInput) {
    clockUrlInput.value = queryClock;
    saveClockUrlToCookie(queryClock);
  }

  const savedUrl = getClockUrlFromCookie();
  if (clockUrlInput && !clockUrlInput.value && savedUrl) {
    clockUrlInput.value = savedUrl;
  }

  clockUrlInput?.addEventListener("input", () => {
    const raw = clockUrlInput.value.trim();
    if (!raw) {
      clockUrlInput.classList.remove("is-valid", "is-invalid");
      return;
    }

    const normalized = normalizeUrlInput(raw);
    if (isValidClockUrl(normalized)) {
      clockUrlInput.classList.remove("is-invalid");
      clockUrlInput.classList.add("is-valid");
      saveClockUrlToCookie(normalized);
      // Try reconnecting immediately only if valid
      tryReconnect();
    } else {
      clockUrlInput.classList.remove("is-valid");
      clockUrlInput.classList.add("is-invalid");
    }
  });


if (storedDay !== todayKey) {
  // New day detected — clear all saved measurements
  for (const key in localStorage) {
    if (key.startsWith("measured_")) {
      localStorage.removeItem(key);
    }
  }
  localStorage.setItem("lastUsedDate", todayKey);
}


  fetch("programs.json")
    .then(res => res.json())
    .then(data => {
      programs = data;
      const selector = document.getElementById("programSelector");
      Object.entries(programs).forEach(([key, prog]) => {
        selector.append(new Option(prog.title, key));
      });

      const today = new Date().getDay();
      const defaultType = (today === 0 || today === 6) ? "fin_de_semana" : "entre_semana";
      const autoProgram = Object.entries(programs).find(([_, p]) => p.type === defaultType);
      if (autoProgram) {
        selector.value = autoProgram[0];
        loadProgram(autoProgram[0]);
      }
    });

  fetchFirmwareDate();

  let currentProgramKey = "";

function formatRecordedTime(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}



function loadProgram(key) {
  currentProgramKey = key;
  currentProgram = programs[key];
  currentItemIndex = 0;
  loadMeasuredTimes(currentProgramKey);
  renderProgramItems();
  highlightCurrentItem();
}


function getTodayKey() {
  const today = new Date();
  return today.toISOString().slice(0, 10); // YYYY-MM-DD
}

function loadMeasuredTimes(programKey) {
  const key = `measured_${programKey}_${getTodayKey()}`;
  const json = localStorage.getItem(key);
  measuredTimes = json ? JSON.parse(json) : {};
}

function saveMeasuredTimes(programKey) {
  const key = `measured_${programKey}_${getTodayKey()}`;
  localStorage.setItem(key, JSON.stringify(measuredTimes));
}


function renderProgramItems() {
  const container = document.getElementById("programItems");
  container.innerHTML = "";

  currentProgram.items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = `program-item list-group-item border-0${i === currentItemIndex ? " active" : ""}`;
    row.dataset.index = i;

    const measuredSeconds = measuredTimes[item.order];
    const measuredText = formatRecordedTime(measuredSeconds);

    let measuredClass = "measured";
    if (item.duration && typeof measuredSeconds === "number") {
      const allotted = item.duration * 60;
      if (measuredSeconds > allotted) {
        measuredClass += " text-danger";
      }
    }

    row.innerHTML = `
      <span class="order">${item.order}</span>
      <span>${item.title}</span>
      <span class="assigned">${item.duration ? item.duration + ' min' : ''}</span>
      <span class="${measuredClass}">${measuredText}</span>
    `;

    container.appendChild(row);
  });
}





function highlightCurrentItem() {
  renderProgramItems(); // re-render with updated active row
  const item = currentProgram.items[currentItemIndex];
  if (item.duration) {
    sendCustomCommand(`/number/countdown_minutes/set?value=${item.duration}`);
  }
}

function updateLiveMeasuredTime(seconds) {
    if (suppressNextStopwatchUpdate) {
    suppressNextStopwatchUpdate = false;
    return; // 🔕 Ignore the 0:00 event just after reset
  }
  if (!currentProgram) return;
  const item = currentProgram.items[currentItemIndex];
  measuredTimes[item.order] = seconds;

  const measuredEl = document.querySelectorAll("#programItems .measured")[currentItemIndex];
  if (!measuredEl) return;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, '0')}`;
  measuredEl.textContent = formatted;

  // Color logic
  if (item.duration) {
    const allottedSeconds = item.duration * 60;
measuredEl.classList.remove("text-success");
measuredEl.classList.toggle("text-danger", seconds > allottedSeconds);

  }

  saveMeasuredTimes(currentProgramKey);
}


document.getElementById("resetProgramBtn").addEventListener("click", () => {
  measuredTimes = {};
  saveMeasuredTimes(currentProgramKey);
  renderProgramItems();
});


document.getElementById("programSelector").addEventListener("change", (e) => {
  const key = e.target.value;
  loadProgram(key);
});
;

document.getElementById("prevItemBtn").addEventListener("click", () => {
  if (currentProgram && currentItemIndex > 0) {
const shouldReset = stopwatchState === "running";
const shouldStart = stopwatchState === "reset";

if (shouldReset) sendCustomCommand("/button/stopwatch_reset/press");

currentItemIndex--;
highlightCurrentItem();

if (shouldStart) sendCustomCommand("/button/stopwatch_start_pause/press");

  }
});

document.getElementById("nextItemBtn").addEventListener("click", () => {
  if (currentProgram && currentItemIndex < currentProgram.items.length - 1) {
const shouldReset = stopwatchState === "running";
const shouldStart = stopwatchState === "reset";

if (shouldReset) sendCustomCommand("/button/stopwatch_reset/press");

currentItemIndex++;
highlightCurrentItem();

if (shouldStart) sendCustomCommand("/button/stopwatch_start_pause/press");

  }
});

document.getElementById("enableProgramSwitch").addEventListener("change", e => {
  const show = e.target.checked;
  document.getElementById("programUI").style.display = show ? "" : "none";
  document.getElementById("programSelector").style.display = show ? "" : "none";
});




  // === Utility: Get Clock URL from input or query string ===
function getUrl() {
  return currentBaseUrl;
}


function setPanelBlur(active) {
  const panels = document.querySelectorAll(".panel-blurable");
  panels.forEach(panel => {
    panel.classList.toggle("panel-blur", active);
  });
}


  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    const reconnectModal = bootstrap.Modal.getInstance(document.getElementById("reconnectModal"));
    reconnectModal?.hide();
    new bootstrap.Modal(document.getElementById("settingsModal")).show();
  });

  // === Firmware Update Logic ===
  async function fetchFirmwareDate() {
    const el = document.getElementById("firmwareDate");
    if (!el) return;
    try {
      const response = await fetch("https://api.github.com/repos/reuniones/reuniones.github.io/commits?path=reloj/reloj.bin&per_page=1");
      if (response.ok) {
        const commits = await response.json();
        if (commits && commits.length > 0) {
          serverFirmwareDate = new Date(commits[0].commit.committer.date);
          const formatted = serverFirmwareDate.toLocaleString('es-ES', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          });
          el.textContent = `Última versión: ${formatted}`;
          compareFirmwareVersions();
          return;
        }
      }
      el.textContent = ""; // Hide if not found
    } catch (e) {
      console.error("Error fetching firmware date:", e);
      el.textContent = "Fecha no disponible";
    }
  }

  function compareFirmwareVersions() {
    const alertEl = document.getElementById("updateAlert");
    const settingsBadge = document.getElementById("settingsUpdateBadge");
    const firmwareBadge = document.getElementById("firmwareUpdateBadge");
    
    // Always ensure the version info container is visible in the consent modal
    const comparisonDiv = document.getElementById("firmwareComparison");
    if (comparisonDiv) comparisonDiv.classList.remove("d-none");

    if (!deviceBuildDate || !serverFirmwareDate) return;

    // Buffer of 1 hour to avoid false positives due to build/commit delays
    const isNewer = serverFirmwareDate.getTime() > (deviceBuildDate.getTime() + 3600000);

    if (isNewer) {
      if (alertEl) {
        alertEl.className = "alert alert-success mt-2 py-2 small";
        alertEl.innerHTML = '<i class="bi bi-info-circle-fill me-2"></i> ¡Hay una versión más reciente disponible!';
        alertEl.classList.remove("d-none");
      }
      settingsBadge?.classList.remove("d-none");
      firmwareBadge?.classList.remove("d-none");
    } else {
      if (alertEl) {
        alertEl.className = "alert alert-light mt-2 py-2 small text-muted";
        alertEl.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> El firmware está actualizado.';
        alertEl.classList.remove("d-none");
      }
      settingsBadge?.classList.add("d-none");
      firmwareBadge?.classList.add("d-none");
    }
  }

  const openUpdateBtn = document.getElementById("openUpdateBtn");
  const consentModalEl = document.getElementById("updateConsentModal");
  const consentCheck = document.getElementById("confirmUpdateConsentCheck");
  const proceedBtn = document.getElementById("proceedWithUpdateButton");
  const methodModalEl = document.getElementById("updateMethodModal");
  const autoUpdateBtn = document.getElementById("autoUpdateBtn");

  openUpdateBtn?.addEventListener("click", () => {
    bootstrap.Modal.getInstance(document.getElementById("settingsModal"))?.hide();
    
    // Reset and show consent modal
    if (consentCheck) consentCheck.checked = false;
    if (proceedBtn) proceedBtn.disabled = true;
    new bootstrap.Modal(consentModalEl).show();

    // Fetch version info early for the consent screen
    fetchFirmwareDate();
  });

  consentCheck?.addEventListener("change", () => {
    if (proceedBtn) proceedBtn.disabled = !consentCheck.checked;
  });

  proceedBtn?.addEventListener("click", () => {
    bootstrap.Modal.getInstance(consentModalEl)?.hide();
    new bootstrap.Modal(methodModalEl).show();
    
    // Update the link to the clock
    const clockLink = document.getElementById("clockUpdateLink");
    if (clockLink) {
      clockLink.href = getUrl();
    }
  });

  autoUpdateBtn?.addEventListener("click", () => {
    const statusDiv = document.getElementById("autoUpdateProgressDiv");
    const statusText = document.getElementById("autoUpdateStatus");
    
    if (!confirm("Esto iniciará la actualización en el reloj. ¿Continuar?")) return;

    autoUpdateBtn.disabled = true;
    statusDiv.classList.remove("d-none");
    statusText.textContent = "Comando enviado. El reloj se está actualizando y se reiniciará pronto...";

    sendCustomCommand("/button/ota_auto_update/press")
      .catch((err) => {
        console.error("Auto-update error:", err);
        statusText.textContent = "Error al enviar el comando. Probá el método manual.";
        autoUpdateBtn.disabled = false;
      });
  });

  const directUploadBtn = document.getElementById("directUploadBtn");
  directUploadBtn?.addEventListener("click", async () => {
    const statusDiv = document.getElementById("directUploadProgressDiv");
    const progressBar = document.getElementById("directUploadProgressBar");
    const statusText = document.getElementById("directUploadStatus");

    if (!confirm("¿Querés subir el firmware directamente desde el navegador?")) return;

    directUploadBtn.disabled = true;
    statusDiv.classList.remove("d-none");
    progressBar.style.width = "0%";
    progressBar.className = "progress-bar progress-bar-striped progress-bar-animated";
    statusText.textContent = "Descargando archivo...";

    try {
      const fwResponse = await fetch("reloj.bin");
      if (!fwResponse.ok) throw new Error("No se pudo descargar el firmware.");
      const blob = await fwResponse.blob();

      statusText.textContent = "Subiendo al reloj...";
      
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${getUrl()}/update`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressBar.style.width = `${percent}%`;
          statusText.textContent = `Subiendo: ${percent}%`;
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          statusText.textContent = "¡Subida exitosa! El reloj se reiniciará.";
          progressBar.classList.remove("progress-bar-animated");
          progressBar.classList.add("bg-success");
        } else {
          statusText.textContent = "Error en el reloj: " + xhr.statusText;
          progressBar.classList.add("bg-danger");
          directUploadBtn.disabled = false;
        }
      };

      xhr.onerror = () => {
        statusText.textContent = "Error de seguridad/CORS.";
        const detail = document.createElement("p");
        detail.className = "text-danger small mt-2";
        detail.textContent = "El navegador bloqueó la subida directa. Esto es común por restricciones de seguridad (CORS/Private Network). Usá la 'Opción B' o la pestaña 'Automática'.";
        statusDiv.appendChild(detail);
        progressBar.classList.add("bg-danger");
        directUploadBtn.disabled = false;
      };

      const formData = new FormData();
      formData.append("update", blob);
      xhr.send(formData);

    } catch (err) {
      console.error("Direct upload error:", err);
      statusText.textContent = "Error: " + err.message;
      progressBar.classList.add("bg-danger");
      directUploadBtn.disabled = false;
    }
  });

  document.getElementById("clockUpdateLink")?.addEventListener("click", () => {
    const methodModal = bootstrap.Modal.getInstance(methodModalEl);
    methodModal?.hide();
  });

  // === Network Scanning Logic ===
  const openScanBtn = document.getElementById("openScanBtn");
  const scanModalEl = document.getElementById("scanModal");
  const startScanBtn = document.getElementById("startScanBtn");
  const subnetSelect = document.getElementById("subnetSelect");
  const customSubnetDiv = document.getElementById("customSubnetDiv");
  const customSubnetInput = document.getElementById("customSubnetInput");
  const scanProgressDiv = document.getElementById("scanProgressDiv");
  const scanProgressBar = document.getElementById("scanProgressBar");
  const scanStatusText = document.getElementById("scanStatusText");
  const scanResults = document.getElementById("scanResults");

  let isScanning = false;
  let abortController = null;

  openScanBtn?.addEventListener("click", () => {
    bootstrap.Modal.getInstance(document.getElementById("settingsModal"))?.hide();
    new bootstrap.Modal(scanModalEl).show();
  });

  subnetSelect?.addEventListener("change", (e) => {
    customSubnetDiv.classList.toggle("d-none", e.target.value !== "custom");
  });

  startScanBtn?.addEventListener("click", async () => {
    if (isScanning) {
      isScanning = false;
      abortController?.abort();
      startScanBtn.innerHTML = '<i class="bi bi-search me-1"></i> Iniciar Escaneo';
      scanStatusText.textContent = "Escaneo cancelado.";
      return;
    }

    const subnets = [];
    const val = subnetSelect.value;
    if (val === "all") {
      subnets.push("192.168.1", "192.168.0", "10.0.0");
    } else if (val === "custom") {
      const custom = customSubnetInput.value.trim();
      // Match IP pattern and optional CIDR (e.g., 192.168.1.0/23)
      const match = custom.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})(?:\.\d{1,3})?(?:\/(\d+))?/);
      
      if (!match) {
        alert("Por favor, ingresá una subred válida (ej: 192.168.1.0/24).");
        return;
      }

      const basePrefix = match[1]; // e.g., 192.168.1
      const cidr = match[2] ? parseInt(match[2]) : 24;
      const parts = basePrefix.split(".").map(Number);

      if (cidr <= 24 && cidr >= 22) {
        // Calculate range based on CIDR
        // /24 = 1 subnet, /23 = 2 subnets, /22 = 4 subnets
        const count = Math.pow(2, 24 - cidr); 
        const startOctet = parts[2] & ~(count - 1); // Align to boundary
        
        for (let i = 0; i < count; i++) {
          subnets.push(`${parts[0]}.${parts[1]}.${startOctet + i}`);
        }
      } else {
        // Default or unsupported CIDR: just use the provided octets
        subnets.push(basePrefix);
      }
    } else {
      subnets.push(val.split(".").slice(0, 3).join("."));
    }

    isScanning = true;
    startScanBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Detener Escaneo';
    scanProgressDiv.classList.remove("d-none");
    scanResults.innerHTML = "";
    scanProgressBar.style.width = "0%";
    abortController = new AbortController();

    const ips = [];
    subnets.forEach(s => {
      for (let i = 1; i <= 254; i++) ips.push(`${s}.${i}`);
    });

    const total = ips.length;
    let completed = 0;
    let ipIndex = 0;
    const maxConcurrency = 40; // Maintain 40 active requests at all times

    async function worker() {
      while (isScanning && ipIndex < total) {
        const ip = ips[ipIndex++];
        try {
          const found = await checkDevice(ip, abortController.signal);
          if (found && isScanning) {
            addScanResult(ip);
          }
        } catch (err) {
          // Individual request error handled by checkDevice
        } finally {
          completed++;
          const percent = Math.round((completed / total) * 100);
          scanProgressBar.style.width = `${percent}%`;
          scanStatusText.textContent = `Escaneando... (${completed}/${total})`;
        }
      }
    }

    // Start initial workers
    const workers = [];
    for (let i = 0; i < Math.min(maxConcurrency, total); i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    isScanning = false;
    startScanBtn.innerHTML = '<i class="bi bi-search me-1"></i> Iniciar Escaneo';
    if (completed === total) {
      scanStatusText.textContent = "Escaneo finalizado.";
    }
  });

  async function checkDevice(ip, signal) {
    const url = `http://${ip}/text/controller_url`;
    try {
      const fetchPromise = fetch(url, { signal });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // First check if we got a valid response
      if (!response || !response.ok) return false;

      // Then attempt to parse and validate JSON
      try {
        const data = await response.json();
        return data && data.id === "text-controller_url";
      } catch (jsonErr) {
        console.debug(`IP ${ip} responded but is not a valid clock (Invalid JSON)`);
        return false;
      }
    } catch (e) {
      // Common for most IPs on the subnet to just fail/timeout
      return false;
    }
  }

  function addScanResult(ip) {
    const btn = document.createElement("button");
    btn.className = "list-group-item list-group-item-action list-group-item-success d-flex justify-content-between align-items-center";
    btn.innerHTML = `
      <span><i class="bi bi-cpu me-2"></i> Reloj encontrado en <strong>${ip}</strong></span>
      <span class="badge bg-primary rounded-pill">Usar</span>
    `;
    btn.onclick = () => {
      const url = `http://${ip}`;
      clockUrlInput.value = url;
      saveClockUrlToCookie(url);
      bootstrap.Modal.getInstance(scanModalEl).hide();
      new bootstrap.Modal(document.getElementById("settingsModal")).show();
      // Apply and reconnect
      tryReconnect();
    };
    scanResults.appendChild(btn);
  }


  // === UI Blur Control ===
  function setBlur(active) {
    document.getElementById("displayText")?.classList.toggle("blurred", active);
    document.getElementById("stopwatchTime")?.classList.toggle("blurred", active);
  }

  // === Update Connection Status Pill ===
  function updateConnectionStatus(state) {
    connectionStatus = state;

    const el = document.getElementById("connectionStatus");
    const iconMap = {
      connected: ["bg-success", "bi-check-circle-fill", "Conectado"],
      connecting: ["bg-warning", "bi-exclamation-circle-fill", "Conectando"],
      disconnected: ["bg-danger", "bi-x-circle-fill", "Desconectado"],
    };

    const [color, icon, label] = iconMap[state] || iconMap.disconnected;
    el.className = `badge rounded-pill ${color}`;
    el.innerHTML = `<i class="bi ${icon} me-1"></i> ${label}`;

    // Apply blinking and dark text for connecting
    el.classList.toggle("blinking", state === "connecting");
    el.classList.toggle("connection-warning", state === "connecting");

    // Blur panels unless fully connected
    setPanelBlur(state !== "connected");
  }


  // === Update Stopwatch Styling Based on State ===
  function updateStopwatchClass() {
    const el = document.getElementById("stopwatchTime");
    el.classList.toggle("stopwatch-blink", stopwatchState === "paused");
  }

  // === Apply Pantalla Classes ===
  function updatePantallaClass() {
    const el = document.getElementById("displayText");
    el.classList.toggle("pantalla-sign", currentDisplayMode === "sign");
    el.classList.toggle("pantalla-blink", blinkEnabled);
  }

  // === Sync Mode Radios ===
  const syncDisplayModeRadio = (value) => {
    let resolved = value === "custom_sign" ? "sign" : value;
    const radio = document.querySelector(`input[name='displayMode'][value='${resolved}']`);
    if (radio) {
      suppressChange = true;
      radio.checked = true;
      suppressChange = false;
    }
  };

  document.querySelectorAll("input[name='displayMode']").forEach(input => {
  input.addEventListener("change", (e) => {
    if (suppressChange) return;
    sendCustomCommand(`/select/sel_display_mode/set?option=${e.target.value}`);
  });
});

  // === Install PWA Button Logic ===
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("d-none");
  });
  installBtn?.addEventListener("click", () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(() => {
        deferredPrompt = null;
        installBtn.classList.add("d-none");
      });
    }
  });

  // === Show Help Modal When Connection Fails ===
  function showReconnectHelp() {
    const settingsModal = bootstrap.Modal.getInstance(document.getElementById("settingsModal"));
    if (settingsModal && document.getElementById("settingsModal").classList.contains("show")) return;

    const ua = navigator.userAgent;
    const isHttps = window.location.protocol === "https:";

    const clockUrl = getClockUrlFromCookie();
    const urls = Array.from(new Set([
      "http://reloj.local",
      "http://reloj.lan",
      ...(clockUrl ? [clockUrl] : [])
    ]));

    // === Fill clockAddresses list ===
    const addrList = document.getElementById("clockAddresses");
    addrList.innerHTML = "";
    urls.forEach(url => {
      const li = document.createElement("li");
      li.innerHTML = `<code>${url}</code>`;
      addrList.appendChild(li);
    });

    // === Fill mixedContentInstructions list ===
    const instList = document.getElementById("mixedContentInstructions");
    instList.innerHTML = "";

    if (isHttps) {
      const warnLi = document.createElement("li");
      warnLi.className = "text-warning fw-bold mb-2";
      warnLi.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Estás usando una conexión segura (HTTPS), pero el reloj usa una conexión normal (HTTP). Por seguridad, el navegador bloquea la conexión a menos que le des permiso.';
      instList.appendChild(warnLi);
    }

    let browserHelp = "";
    if (/Chrome/.test(ua)) {
      browserHelp = "1. Hacé clic en el icono a la izquierda de la barra de direcciones → 'Configuración del sitio' → 'Contenido no seguro' → 'Permitir'.<br>2. Asegurate de que ningún bloqueador de publicidad (uBlock, AdBlock, etc.) esté interfiriendo.<br>3. Asegurate de permitir el acceso a la red local en la configuración del sitio o cuando el navegador lo solicite.";
    } else if (/Firefox/.test(ua)) {
      browserHelp = "1. Hacé clic en el icono del escudo a la izquierda de la barra de direcciones y desactivá 'Protección contra el rastreo mejorada'.<br>2. Desactivá bloqueadores de publicidad para este sitio.";
    } else if (/Safari/.test(ua)) {
      browserHelp = "1. En el menú 'Desarrollo', desactivá 'Restricciones de contenido mixto'.<br>2. En iOS/iPadOS, asegurate de dar permiso para 'Red Local' en los Ajustes de Privacidad para tu navegador.";
    } else {
      browserHelp = "Permití 'Contenido mixto' o 'Contenido no seguro' y asegurate de que no haya bloqueadores de publicidad o restricciones de red local activas.";
    }

    const li = document.createElement("li");
    li.innerHTML = browserHelp;
    instList.appendChild(li);

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("reconnectModal"));
    modal.show();
  }





  // === Share Button (QR + WhatsApp + Install) ===
  document.getElementById("shareBtn").addEventListener("click", () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const clockUrl = getUrl();
    const shareUrl = `${baseUrl}?clock=${encodeURIComponent(clockUrl)}`;

    // Generate QR code
    QRCode.toCanvas(document.getElementById("qrCanvas"), shareUrl, { width: 160 });
    document.getElementById("shareUrl").textContent = shareUrl;


    // WhatsApp link
    document.getElementById("whatsappShare").href =
      `https://wa.me/?text=${encodeURIComponent("Reloj: " + shareUrl)}`;

    new bootstrap.Modal(document.getElementById("shareModal")).show();
  });

  // === Stopwatch Buttons ===
  document.getElementById("startPauseBtn").onclick = () =>
    sendCustomCommand("/button/stopwatch_start_pause/press");

  document.getElementById("resetBtn").onclick = () => {
    if (stopwatchState === "running" && currentProgram) {
      const currentItem = currentProgram.items[currentItemIndex];
      if (currentItem) {
measuredTimes[currentItem.order] = stopwatchTime;
saveMeasuredTimes(currentProgramKey);
suppressNextStopwatchUpdate = true;

// force immediate display of saved value
const row = document.querySelectorAll("#programItems .measured")[currentItemIndex];
if (row) {
  row.textContent = formatRecordedTime(stopwatchTime);

  const allotted = currentItem.duration * 60;
  row.classList.remove("text-success", "text-danger");
  if (stopwatchTime > allotted) row.classList.add("text-danger");
}

      }
    }

    sendCustomCommand("/button/stopwatch_reset/press");
  };




  // === +/- Time Buttons ===
  document.getElementById("decreaseBtn").onclick = () => {
    sendCustomCommand("/number/stopwatch_add_seconds/set?value=-60");
    sendCustomCommand("/button/stopwatch_add_time/press");
  };
  document.getElementById("increaseBtn").onclick = () => {
    sendCustomCommand("/number/stopwatch_add_seconds/set?value=60");
    sendCustomCommand("/button/stopwatch_add_time/press");
  };

  // === Generic Command Sender ===
  function sendCustomCommand(endpoint) {
    return fetch(`${getUrl()}${endpoint}`, { method: "POST" });
  }

  // === Settings Modal Save = Reload (URL saved via query param) ===
  document.getElementById("saveSettingsBtn")?.addEventListener("click", () => {
    location.reload();
  });

  // === Reconnection Monitor Loop ===
  let reconnecting = false;

  function getUrlsToTry() {
    const urls = new Set();
    const inputUrl = document.getElementById("urlInput")?.value?.trim();
    if (inputUrl) {
      urls.add(normalizeUrlInput(inputUrl));
    }
    const savedUrl = getClockUrlFromCookie();
    if (savedUrl) {
      urls.add(savedUrl);
    }
    urls.add("http://reloj.local");
    urls.add("http://reloj.lan");
    return Array.from(urls);
  }

  function connect(url) {
    if (eventSource) {
      eventSource.close();
    }
    
    console.log(`Connecting to ${url}...`);
    eventSource = new EventSource(`${url}/events`);
    
    let opened = false;
    const timeout = setTimeout(() => {
      if (!opened) {
        console.warn(`Connection to ${url} timed out.`);
        eventSource.close();
        handleConnectionFailure();
      }
    }, 5000);

    eventSource.onopen = () => {
      opened = true;
      clearTimeout(timeout);
      currentBaseUrl = url;
      reconnecting = false;
      updateConnectionStatus("connected");
      setBlur(false);
      const reconnectModal = bootstrap.Modal.getInstance(document.getElementById("reconnectModal"));
      if (reconnectModal) reconnectModal.hide?.();
    };

    eventSource.addEventListener("state", (e) => {
      lastEventTime = Date.now();
      if (connectionStatus !== "connected") {
        updateConnectionStatus("connected");
      }
      handleStateEvent(JSON.parse(e.data));
    });

    eventSource.onerror = () => {
      if (!opened) {
        clearTimeout(timeout);
        handleConnectionFailure();
      } else {
        // If it was already open and now failed, let the monitor loop handle it
        console.warn("EventSource connection lost.");
      }
    };
  }

  function handleConnectionFailure() {
    if (reconnecting) return; // already in a retry loop
    tryReconnect();
  }

  function tryReconnect() {
    if (reconnecting) return;
    reconnecting = true;
    updateConnectionStatus("connecting");
    setPanelBlur(true);

    const urls = getUrlsToTry();
    let index = 0;

    function attemptNext() {
      if (index >= urls.length) {
        updateConnectionStatus("disconnected");
        showReconnectHelp();
        reconnecting = false;
        return;
      }

      const url = urls[index++];
      const tempEs = new EventSource(`${url}/events`);
      let success = false;
      
      const timeout = setTimeout(() => {
        if (!success) {
          tempEs.close();
          attemptNext();
        }
      }, 3000);

      tempEs.onopen = () => {
        success = true;
        clearTimeout(timeout);
        tempEs.close();
        connect(url);
      };

      tempEs.onerror = () => {
        if (!success) {
          clearTimeout(timeout);
          tempEs.close();
          attemptNext();
        }
      };
    }

    attemptNext();
  }

  function updateTimeclockUI(value) {
    document.getElementById("clockTime").textContent = value;
  }

  function updateStopwatchUI(value) {
    const stopEl = document.getElementById("stopwatchTime");
    let formatted = value;
    if (stopwatchState === "running") {
      formatted = formatted.replace(/:/g, '<span class="colon">:</span>');
      stopEl.classList.add("stopwatch-running");
    } else {
      stopEl.classList.remove("stopwatch-running");
    }

    const match = value.match(/(\d+):(\d+)/);
    if (match) {
      stopwatchTime = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      updateLiveMeasuredTime(stopwatchTime);
    }
    stopEl.innerHTML = formatted;
  }

  function updateDisplayTextUI(value) {
    const displayElem = document.getElementById("displayText");
    displayElem.classList.remove("pantalla-scroll");
    if (value.length > 8) {
      displayElem.innerHTML = `<span class="pantalla-scroll">${value}</span>`;
    } else if (currentDisplayMode === 'clock' && value.length >= 3) {
        const trimmed = value;
        const thirdLastHidden = trimmed.slice(0, -3) + '<span style="display:none;">' + trimmed[trimmed.length - 3] + '</span>';
        const smallerLastTwo = thirdLastHidden + '<span style="font-size: 70%; margin-left:.3em">' + trimmed.slice(-2) + '</span>';
        displayElem.innerHTML = smallerLastTwo;
    } else {
      displayElem.textContent = value;
    }
  }

  function handleStateEvent(data) {
    switch (data.id) {
      case "text_sensor-status":
        try {
          const status = JSON.parse(data.value);
          if (status.timeclock !== undefined) updateTimeclockUI(status.timeclock);
          if (status.stopwatch !== undefined) updateStopwatchUI(status.stopwatch);
          if (status.display_text !== undefined) updateDisplayTextUI(status.display_text);
        } catch (e) {
          console.error("Error parsing combined status:", e);
        }
        break;

      case "text_sensor-timeclock":
        updateTimeclockUI(data.value);
        break;

      case "text_sensor-stopwatch":
        updateStopwatchUI(data.value);
        break;

      case "text_sensor-display_text":
        updateDisplayTextUI(data.value);
        break;

      case "text_sensor-txt_stopwatch_state":
        stopwatchState = data.value;
        const labelMap = { running: "Pausa", paused: "Inicio", reset: "Inicio" };
        const iconMap = { running: "bi-pause-fill", paused: "bi-play-fill", reset: "bi-play-fill" };
        document.getElementById("startPauseLabel").textContent = labelMap[data.value] || "Inicio";
        document.getElementById("startPauseIcon").className = `bi ${iconMap[data.value]}`;
        updateStopwatchClass();
        break;

      case "select-sel_display_mode":
        currentDisplayMode = data.value;
        syncDisplayModeRadio(data.value);
        break;

      case "switch-sw_blink":
        suppressChange = true;
        blinkEnabled = data.value === true;
        document.getElementById("blinkSwitch").checked = blinkEnabled;
        updatePantallaClass();
        suppressChange = false;
        break;

      case "number-countdown_minutes":
        suppressChange = true;
        document.getElementById("countdownInput").value = data.value;
        updateCountdownOutput(data.value);
        suppressChange = false;
        break;

      case "select-sel_stopwatch_mode":
        suppressChange = true;
        document.getElementById("countdownModeSwitch").checked = data.value === "countdown";
        suppressChange = false;
        break;

      case "switch-stopwatch_auto_show":
        suppressChange = true;
        document.getElementById("autoShowSwitch").checked = data.value === true;
        suppressChange = false;
        break;

      case "switch-stopwatch_blink_before_overtime":
        suppressChange = true;
        document.getElementById("blinkBeforeOvertimeSwitch").checked = data.value === true;
        suppressChange = false;
        break;

      case "select-sel_overtime_mode":
        suppressChange = true;
        document.getElementById("overtimeModeSelect").value = data.value;
        suppressChange = false;
        break;

      case "text-custom_sign":
        document.getElementById("customSignInput").value = data.value;
        break;

      case "text_sensor-ip":
        document.getElementById("infoIP").textContent = data.value;
        document.cookie = `clock_ip=${data.value}; path=/; max-age=31536000`;
        // Also update clock_url if it was previously an IP or empty
        const currentUrl = document.getElementById("urlInput")?.value;
        if (!currentUrl || /^http:\/\/\d{1,3}(\.\d{1,3}){3}$/.test(currentUrl)) {
          saveClockUrlToCookie(`http://${data.value}`);
        }
        break;
      case "text_sensor-ssid": document.getElementById("infoSSID").textContent = data.value; break;
      case "text_sensor-bssid": document.getElementById("infoBSSID").textContent = data.value; break;
      case "text_sensor-mac": document.getElementById("infoMAC").textContent = data.value; break;
      case "text_sensor-dns": document.getElementById("infoDNS").textContent = data.value; break;
      case "text_sensor-esphome_version": 
        document.getElementById("infoVersion").textContent = data.value; 
        
        // Parse build date from format: 2026.1.5 (config hash 0x66291bcd, built 2026-02-15 11:18:09 +0000)
        const dateMatch = data.value.match(/built ([\d-]+ [\d:]+)/);
        if (dateMatch) {
          deviceBuildDate = new Date(dateMatch[1] + " UTC");
          const deviceDateEl = document.getElementById("deviceDate");
          if (deviceDateEl) {
            const formatted = deviceBuildDate.toLocaleString('es-ES', { 
              day: '2-digit', month: '2-digit', year: 'numeric', 
              hour: '2-digit', minute: '2-digit' 
            });
            deviceDateEl.textContent = `Versión instalada: ${formatted}`;
          }
          compareFirmwareVersions();
        }
        break;
    }
  }

  setInterval(() => {
    const now = Date.now();
    const elapsed = now - lastEventTime;
    if (!reconnecting && elapsed > CONNECTING_THRESHOLD_MS) {
      tryReconnect();
    }
  }, 1000);

  tryReconnect();



  // === Inputs and Toggles ===
  document.getElementById("blinkSwitch").onchange = (e) => {
    if (suppressChange) return;
    const endpoint = e.target.checked ? "/switch/sw_blink/turn_on" : "/switch/sw_blink/turn_off";
    sendCustomCommand(endpoint);
  };

  const countdownInput = document.getElementById("countdownInput");
  const countdownOutput = document.getElementById("countdownOutput");
  const presetDuration = document.getElementById("presetDuration");

  // Update countdown text and sync preset
  function updateCountdownOutput(value) {
    const numericValue = Number(value);
    countdownOutput.textContent = `${numericValue} min`;
    
    // Find the option whose value matches the numeric value
    let found = false;
    for (const option of presetDuration.options) {
      if (option.value && Number(option.value) === numericValue) {
        presetDuration.value = option.value;
        found = true;
        break;
      }
    }
    if (!found) {
      presetDuration.value = "";
    }
  }

  countdownInput.oninput = (e) => {
    const value = parseInt(e.target.value, 10);
    updateCountdownOutput(value);
  };

  countdownInput.onchange = (e) => {
    if (suppressChange) return;
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      sendCustomCommand(`/number/countdown_minutes/set?value=${value}`);
    }
  };

  presetDuration.onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      countdownInput.value = val;
      updateCountdownOutput(val);
      sendCustomCommand(`/number/countdown_minutes/set?value=${val}`);
    }
  };

  document.getElementById("countdownModeSwitch").onchange = (e) => {
    if (suppressChange) return;
    const mode = e.target.checked ? "countdown" : "normal";
    sendCustomCommand(`/select/sel_stopwatch_mode/set?option=${mode}`);
  };

  document.getElementById("autoShowSwitch").onchange = (e) => {
    if (suppressChange) return;
    const cmd = e.target.checked ? "turn_on" : "turn_off";
    sendCustomCommand(`/switch/stopwatch_auto_show/${cmd}`);
  };

  document.getElementById("blinkBeforeOvertimeSwitch").onchange = (e) => {
    if (suppressChange) return;
    const cmd = e.target.checked ? "turn_on" : "turn_off";
    sendCustomCommand(`/switch/stopwatch_blink_before_overtime/${cmd}`);
  };

  document.getElementById("overtimeModeSelect").onchange = (e) => {
    if (suppressChange) return;
    const value = e.target.value;
    sendCustomCommand(`/select/sel_overtime_mode/set?option=${value}`);
  };

  document.getElementById("customSignOption").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("customSignModal"));
    modal.show();
  });

  document.getElementById("customSignForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("customSignInput");
    let text = input.value.trim();

    // Enforce character limit (including appended "  -  ")
    const maxTextLength = 128 - 5; // reserve 5 chars for "  -  "

    if (text.length > maxTextLength) {
      text = text.substring(0, maxTextLength);
    }
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");


    const fullText = `${text}        `;



    fetch(`${getUrl()}/text/custom_sign/set?value=${encodeURIComponent(fullText)}`, {
      method: "POST"
    }).then(() => {
      fetch(`${getUrl()}/select/sel_display_mode/set?option=custom_sign`, {
        method: "POST"
      });
    });

    bootstrap.Modal.getInstance(document.getElementById("customSignModal")).hide();
  });


});
