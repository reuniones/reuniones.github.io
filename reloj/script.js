// Register the service worker for PWA support
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
  
  // Reload page when a new Service Worker takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
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
  // === DOM Element Caching ===
  const elements = {
    displayText: document.getElementById("displayText"),
    stopwatchTime: document.getElementById("stopwatchTime"),
    miniDisplayText: document.getElementById("miniDisplayText"),
    miniSecondaryText: document.getElementById("miniSecondaryText"),
    miniSecondaryLink: document.getElementById("miniSecondaryLink"),
    miniSecondaryIcon: document.getElementById("miniSecondaryIcon"),
    clockTime: document.getElementById("clockTime"),
    txLed: document.getElementById("txLed"),
    rxLed: document.getElementById("rxLed"),
    connectionStatus: document.getElementById("connectionStatus"),
    startPauseLabel: document.getElementById("startPauseLabel"),
    startPauseIcon: document.getElementById("startPauseIcon"),
    blinkSwitch: document.getElementById("blinkSwitch"),
    countdownInput: document.getElementById("countdownInput"),
    countdownOutput: document.getElementById("countdownOutput"),
    presetDuration: document.getElementById("presetDuration"),
    countdownModeSwitch: document.getElementById("countdownModeSwitch"),
    autoShowSwitch: document.getElementById("autoShowSwitch"),
    blinkBeforeOvertimeSwitch: document.getElementById("blinkBeforeOvertimeSwitch"),
    overtimeModeSelect: document.getElementById("overtimeModeSelect"),
    customSignInput: document.getElementById("customSignInput"),
    infoIP: document.getElementById("infoIP"),
    infoSSID: document.getElementById("infoSSID"),
    infoBSSID: document.getElementById("infoBSSID"),
    infoMAC: document.getElementById("infoMAC"),
    infoDNS: document.getElementById("infoDNS"),
    infoVersion: document.getElementById("infoVersion"),
    infoBuildTime: document.getElementById("infoBuildTime"),
    infoReset: document.getElementById("infoReset"),
    infoChip: document.getElementById("infoChip"),
    infoCpuFreq: document.getElementById("infoCpuFreq"),
    infoFlash: document.getElementById("infoFlash"),
    infoSDK: document.getElementById("infoSDK"),
    infoHeapFree: document.getElementById("infoHeapFree"),
    infoHeapMax: document.getElementById("infoHeapMax"),
    infoHeapFrag: document.getElementById("infoHeapFrag"),
    infoLoopTime: document.getElementById("infoLoopTime"),
    infoUptime: document.getElementById("infoUptime"),
    infoUptimeDuration: document.getElementById("infoUptimeDuration"),
    infoRSSI: document.getElementById("infoRSSI"),
    infoWifiPct: document.getElementById("infoWifiPct"),
    wifiSignalIcon: document.getElementById("wifiSignalIcon"),
    infoMsgCount: document.getElementById("infoMsgCount"),
    infoAppUptime: document.getElementById("infoAppUptime"),
    infoLatency: document.getElementById("infoLatency"),
    deviceDate: document.getElementById("deviceDate"),
    triedUrlsContainer: document.getElementById("triedUrlsContainer"),
    triedUrlsList: document.getElementById("triedUrlsList"),
    diagAlertContainer: document.getElementById("diagAlertContainer"),
    browserSpecificInstructions: document.getElementById("browserSpecificInstructions"),
    wifiSsidInput: document.getElementById("wifiSsidInput"),
    wifiPasswordInput: document.getElementById("wifiPasswordInput"),
    connectWifiBtn: document.getElementById("connectWifiBtn"),
    toggleWifiPassword: document.getElementById("toggleWifiPassword")
  };

  // === State Variables ===
  let suppressChange = false;
  let eventSource;
  let lastEventTime = Date.now();
  let blinkEnabled = false;
  let stopwatchState = "reset";
  let lastSecurityViolation = null;
  let collapseTimeout = null;
  const triedUrls = new Map(); // url -> status ('trying', 'blocked', 'failed', 'connected')
  let lastDisplayText = "";
  let pendingCommands = []; // Array of { el, expectedId, timestamp }
  let lastStopwatchValue = "0:00";
  let lastTimeclockValue = "0:00:00";
  let lastMiniSecondaryRole = "";
  let stopwatchTenths = 0;
  let bootTimestamp = null;
  let messageCount = 0;
  let globalBlinkStart = Date.now();
  const sessionStartTime = Date.now();
  let avgLatency = 0;

  updateConnectionStatus("connecting"); // ✅ force initial connecting status
  setPanelBlur(true); // ✅ blur panels initially

  function updateBlinkSync() {
    const elapsed = Date.now() - globalBlinkStart;
    const isBlinkOn = (elapsed % 1000) < 500;
    document.documentElement.style.setProperty('--blink-opacity', isBlinkOn ? '1' : '0.5');
  }

  function renderMiniSecondary() {
    const { miniSecondaryLink, miniSecondaryIcon, miniSecondaryText } = elements;
    if (!miniSecondaryLink || !miniSecondaryIcon || !miniSecondaryText) return;

    let role = "crono";
    if (currentDisplayMode === "clock") {
      role = "crono";
    } else if (currentDisplayMode === "stopwatch") {
      role = "hora";
    } else {
      // Sign mode
      role = (stopwatchState === "running") ? "crono" : "hora";
    }

    // Only update if role changed or if it's a high-frequency update (crono and hora can change over time)
    if (role === lastMiniSecondaryRole && role !== "crono" && role !== "hora") return;
    lastMiniSecondaryRole = role;

    if (role === "hora") {
      miniSecondaryIcon.className = "bi bi-clock";
      miniSecondaryLink.title = "Hora";
      miniSecondaryLink.href = "#panel-pantalla";
      
      if (lastTimeclockValue && lastTimeclockValue.length >= 3) {
        const miniBase = lastTimeclockValue.slice(0, -3);
        const miniSeconds = lastTimeclockValue.slice(-2);
        miniSecondaryText.innerHTML = `${miniBase}<span style="font-size: 80%; margin-left: 0.3em;">${miniSeconds}</span>`;
      }
    } else {
      miniSecondaryIcon.className = "bi bi-stopwatch";
      miniSecondaryLink.title = "Cronómetro";
      miniSecondaryLink.href = "#panel-crono";
      
      const miniTenthsHtml = `<span class="small-seconds" style="font-size: 80%; margin-left: 0.3em;">${stopwatchTenths}</span>`;
      miniSecondaryText.innerHTML = `<span>${lastStopwatchValue}</span>${miniTenthsHtml}`;
    }
  }

  function formatDuration(diffMs) {
    const diffSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(diffSecs / 86400);
    const hours = Math.floor((diffSecs % 86400) / 3600);
    const mins = Math.floor((diffSecs % 3600) / 60);
    const secs = diffSecs % 60;

    const s = secs.toString().padStart(2, '0');
    const m = mins.toString().padStart(2, '0');
    const h = hours.toString().padStart(2, '0');

    if (days > 0 || hours > 0) {
      return `${days}:${h}:${m}:${s}`;
    }
    if (mins > 0) {
      return `${hours}:${m}:${s}`;
    }
    return `${mins}:${s}`;
  }

  function updateAppStatsUI() {
    if (elements.infoMsgCount) elements.infoMsgCount.textContent = messageCount;
    
    if (elements.infoAppUptime) {
      elements.infoAppUptime.textContent = formatDuration(Date.now() - sessionStartTime);
    }

    if (elements.infoLatency) {
      const currentLatency = Date.now() - lastEventTime;
      // Exponential Moving Average (alpha = 0.2)
      if (avgLatency === 0) avgLatency = currentLatency;
      else avgLatency = (0.2 * currentLatency) + (0.8 * avgLatency);

      const displayLatency = Math.round(avgLatency);
      elements.infoLatency.textContent = `${displayLatency}ms`;
      
      // Color based on latency
      if (displayLatency < 1500) elements.infoLatency.className = "fw-bold small text-success";
      else if (displayLatency < 3000) elements.infoLatency.className = "fw-bold small text-warning";
      else elements.infoLatency.className = "fw-bold small text-danger";
    }
  }

  function updateUptimeDurationUI() {
    updateAppStatsUI();
    if (bootTimestamp && elements.infoUptimeDuration) {
      elements.infoUptimeDuration.textContent = formatDuration(Date.now() - bootTimestamp);
    }
  }

  // Update duration when connection modal is shown
  document.getElementById("connectionModal")?.addEventListener("show.bs.modal", updateUptimeDurationUI);

  function getExpectedId(endpoint) {
    // Extract sensor ID from endpoint: /select/sel_display_mode/set -> select-sel_display_mode
    let path = endpoint.split('?')[0];
    path = path.replace(/\/(press|turn_on|turn_off|set)$/, "");
    const parts = path.split('/').filter(p => p);
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : null;
  }

  function getExpectedValue(endpoint) {
    const url = new URL(endpoint, "http://localhost");
    if (endpoint.includes("turn_on")) return true;
    if (endpoint.includes("turn_off")) return false;
    // Extract 'option' or 'value' from query params
    const val = url.searchParams.get("option") || url.searchParams.get("value");
    // Normalize numeric strings
    return (val !== null && !isNaN(val)) ? Number(val) : val;
  }

  function updateTriedUrlsUI() {
    const container = document.getElementById("triedUrlsContainer");
    const list = document.getElementById("triedUrlsList");
    if (!container || !list) return;

    if (triedUrls.size > 0) {
      container.classList.remove("d-none");
      list.innerHTML = "";
      triedUrls.forEach((status, url) => {
        const badge = document.createElement("span");
        badge.className = "badge border font-monospace py-1 px-2 ";
        let icon = "";
        
        if (status === 'trying') {
          badge.className += "text-primary border-primary blinking";
          icon = '<i class="bi bi-arrow-repeat me-1"></i>';
        } else if (status === 'blocked') {
          badge.className += "text-warning border-warning";
          icon = '<i class="bi bi-shield-lock-fill me-1"></i>';
        } else if (status === 'failed') {
          badge.className += "text-danger border-danger";
          icon = '<i class="bi bi-x-circle me-1"></i>';
        } else if (status === 'connected') {
          badge.className += "text-success border-success fw-bold";
          icon = '<i class="bi bi-check-circle-fill me-1"></i>';
        }

        badge.innerHTML = `${icon}${url}`;
        list.appendChild(badge);
      });
    }
  }

  // Listen for browser security blocks (Mixed Content / CSP)
  document.addEventListener('securitypolicyviolation', (e) => {
    const blockedUrl = e.blockedURI;
    lastSecurityViolation = {
      uri: blockedUrl,
      directive: e.violatedDirective,
      timestamp: Date.now()
    };
    
    // Mark this URL as blocked in our tracker
    const normalized = blockedUrl.split('/events')[0].split('/text')[0].replace(/\/$/, "");
    if (triedUrls.has(normalized)) {
      triedUrls.set(normalized, 'blocked');
      updateTriedUrlsUI();
    }
  });

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

  // === URL Management Logic ===
  const urlManagementList = document.getElementById("urlManagementList");
  const newUrlInput = document.getElementById("newUrlInput");
  const addUrlBtn = document.getElementById("addUrlBtn");
  const hardcodedUrls = ["http://reloj.local", "http://reloj.lan"];
  let extraUrls = loadExtraUrls();

  function loadExtraUrls() {
    const json = localStorage.getItem("extra_clock_urls");
    return json ? new Set(JSON.parse(json)) : new Set();
  }

  function saveExtraUrls() {
    localStorage.setItem("extra_clock_urls", JSON.stringify(Array.from(extraUrls)));
  }

  function renderUrlManagementList() {
    if (!urlManagementList) return;
    urlManagementList.innerHTML = "";
    
    // Display Hardcoded
    hardcodedUrls.forEach(url => {
      const item = document.createElement("div");
      item.className = "list-group-item d-flex justify-content-between align-items-center bg-body-tertiary";
      item.innerHTML = `<span class="small font-monospace">${url}</span>`;
      urlManagementList.appendChild(item);
    });

    // Display Extra
    extraUrls.forEach(url => {
      const item = document.createElement("div");
      item.className = "list-group-item d-flex justify-content-between align-items-center";
      item.innerHTML = `<span class="small font-monospace">${url}</span>
        <button class="btn btn-sm btn-link text-danger p-0 border-0 remove-url-btn" data-url="${url}">
          <i class="bi bi-trash"></i>
        </button>`;
      urlManagementList.appendChild(item);
    });
  }

  addUrlBtn?.addEventListener("click", () => {
    const raw = newUrlInput.value.trim();
    if (!raw) return;
    const normalized = normalizeUrlInput(raw);
    if (isValidClockUrl(normalized)) {
      extraUrls.add(normalized);
      saveExtraUrls();
      newUrlInput.value = "";
      newUrlInput.classList.remove("is-invalid");
      renderUrlManagementList();
      tryReconnect();
    } else {
      newUrlInput.classList.add("is-invalid");
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const queryClock = urlParams.get('clock');
  if (queryClock) {
    const normalized = normalizeUrlInput(queryClock);
    if (isValidClockUrl(normalized)) {
      extraUrls.add(normalized);
      saveExtraUrls();
    }
  }

  renderUrlManagementList();

  // === Delegated Listeners ===
  urlManagementList?.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-url-btn");
    if (btn) {
      extraUrls.delete(btn.dataset.url);
      saveExtraUrls();
      renderUrlManagementList();
      tryReconnect();
    }
  });

  // Display Mode Delegation
  document.querySelector("[aria-label='Mostrar']")?.addEventListener("change", (e) => {
    if (e.target.name === "displayMode") {
      if (suppressChange) return;
      sendCustomCommand(`/select/sel_display_mode/set?option=${e.target.value}`, e.target);
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
  if (!document.getElementById("enableProgramSwitch")?.checked) return;
  const item = currentProgram.items[currentItemIndex];
  if (item.duration) {
    // Feedback on the 'next' or 'prev' button depending on context is harder, 
    // so we just send the command.
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
  if (show && currentProgram) {
    highlightCurrentItem();
  }
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

  document.getElementById("modalRebootBtn")?.addEventListener("click", () => {
    if (confirm("¿Estás seguro de que querés reiniciar el reloj?\n\n- Se perderá la conexión por unos segundos.\n- El cronómetro se reseteará a cero.")) {
      sendCustomCommand("/button/reboot/press");
      bootstrap.Modal.getInstance(document.getElementById("connectionModal"))?.hide();
    }
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
          }).replace(',', '');
          el.textContent = `Última versión: ${formatted}`;
        }
      }
    } catch (e) {
      console.error("Error fetching firmware date:", e);
      el.textContent = "Fecha no disponible";
    } finally {
      compareFirmwareVersions();
    }
  }

  function compareFirmwareVersions() {
    const alertEl = document.getElementById("updateAlert");
    const settingsBadge = document.getElementById("settingsUpdateBadge");
    const firmwareBadge = document.getElementById("firmwareUpdateBadge");
    
    // Always ensure the version info container is visible in the consent modal
    const comparisonDiv = document.getElementById("firmwareComparison");
    if (comparisonDiv) comparisonDiv.classList.remove("d-none");

    if (deviceBuildDate && elements.deviceDate) {
      const formatted = deviceBuildDate.toLocaleString('es-ES', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }).replace(',', '');
      elements.deviceDate.textContent = `Versión instalada: ${formatted}`;
    }

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
      .then((success) => {
        if (success) {
          statusText.textContent = "Comando enviado. El reloj se está actualizando y se reiniciará pronto...";
        } else {
          statusText.textContent = "Error al enviar el comando. Probá el método manual.";
          autoUpdateBtn.disabled = false;
        }
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
      extraUrls.add(url);
      saveExtraUrls();
      renderUrlManagementList();
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
    el.className = `badge rounded-pill status-pill ${color}`;
    el.innerHTML = `<i class="bi ${icon} me-1"></i> <span class="status-text">${label}</span>`;

    // Reset collapse state and timer
    clearTimeout(collapseTimeout);
    el.classList.remove("collapsed");

    if (state === "connected") {
      // Auto-collapse after 5 seconds on wide screens (CSS handles mobile)
      collapseTimeout = setTimeout(() => {
        el.classList.add("collapsed");
      }, 5000);
    }

    // Redirect modal target based on state
    if (state === "connected") {
      el.setAttribute("data-bs-target", "#connectionModal");
    } else {
      el.setAttribute("data-bs-target", "#reconnectModal");
    }

    // Apply blinking and dark text for connecting
    el.classList.toggle("blinking", state === "connecting");
    el.classList.toggle("connection-warning", state === "connecting");

    // Blur panels unless fully connected
    setPanelBlur(state !== "connected");

    // Auto-close reconnect modal if we just connected
    if (state === "connected") {
      const modalEl = document.getElementById("reconnectModal");
      if (modalEl && modalEl.classList.contains("show")) {
        const reconnectModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        reconnectModal.hide();
      }
    }
  }


  // === Update Stopwatch Styling Based on State ===
  function updateStopwatchClass() {
    const el = document.getElementById("stopwatchTime");
    el.classList.toggle("stopwatch-blink", stopwatchState === "paused");
  }

  // === Apply Pantalla Classes ===
  function updatePantallaClass() {
    const el = document.getElementById("displayText");
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
  async function runDiagnostics(url) {
    const results = {
      reachable: false,
      blockedByMixedContent: false,
      isHttps: window.location.protocol === "https:",
      duration: 0,
      probableCause: "unknown" // "dns", "timeout", "mixed-content"
    };

    // Check if a security violation was recently recorded for this URL
    if (lastSecurityViolation && 
        (Date.now() - lastSecurityViolation.timestamp < 10000) && 
        url.includes(new URL(lastSecurityViolation.uri).hostname)) {
      results.blockedByMixedContent = true;
      results.probableCause = "mixed-content";
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      await fetch(url, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      results.reachable = true;
      results.duration = Date.now() - start;
    } catch (err) {
      results.duration = Date.now() - start;
      
      if (err.name === 'AbortError') {
        results.reachable = false;
        results.probableCause = "timeout";
      } else if (results.blockedByMixedContent) {
        results.probableCause = "mixed-content";
      } else if (results.duration < 500) {
        // Immediate failure (< 500ms) usually means DNS failure or immediate rejection
        results.probableCause = "dns";
      } else {
        results.probableCause = "timeout";
      }

      if (results.isHttps && url.startsWith("http://") && results.probableCause === "unknown") {
        results.blockedByMixedContent = true;
        results.probableCause = "mixed-content";
      }
    }
    return results;
  }

  async function showReconnectHelp() {
    // List of modals that should not be interrupted by the reconnection help
    const configModals = ["settingsModal", "updateConsentModal", "updateMethodModal", "scanModal"];
    const isConfigOpen = () => configModals.some(id => document.getElementById(id)?.classList.contains("show"));

    if (isConfigOpen()) return;

    const ua = navigator.userAgent;
    const currentUrl = getUrl();
    const diag = await runDiagnostics(currentUrl);

    // Re-check after diagnostic await in case we connected or user opened config in the meantime
    if (isConfigOpen() || connectionStatus === "connected") return;

    // === Diagnostic Alert ===
    const diagContainer = document.getElementById("diagAlertContainer");
    if (diagContainer) {
      if (diag.probableCause === "mixed-content") {
        diagContainer.innerHTML = `
          <div class="alert alert-warning small py-2 mb-3">
            <i class="bi bi-shield-lock-fill me-2"></i> <strong>Acceso bloqueado:</strong> El navegador impide la conexión por seguridad (HTTPS).
          </div>`;
      } else if (diag.probableCause === "dns") {
        diagContainer.innerHTML = `
          <div class="alert alert-danger small py-2 mb-3">
            <i class="bi bi-exclamation-octagon-fill me-2"></i> <strong>Error de dirección:</strong> No se pudo encontrar el destino <code>${currentUrl}</code>. Verificá si está bien escrito.
          </div>`;
      } else if (diag.probableCause === "timeout") {
        diagContainer.innerHTML = `
          <div class="alert alert-danger small py-2 mb-3">
            <i class="bi bi-clock-history me-2"></i> <strong>Tiempo de espera agotado:</strong> El reloj no responde en <code>${currentUrl}</code>. ¿Está encendido?
          </div>`;
      } else {
        diagContainer.innerHTML = "";
      }
    }

    // === Browser Specific Instructions ===
    const instContainer = document.getElementById("browserSpecificInstructions");
    if (instContainer) {
      let browserHelp = "";
      if (/Chrome/.test(ua)) {
        browserHelp = "<strong>Chrome:</strong> Hacé clic en el icono a la izquierda de la URL → 'Configuración del sitio' → 'Contenido no seguro' → 'Permitir'. Asegurá también permitir 'Red local'.";
      } else if (/Firefox/.test(ua)) {
        browserHelp = "<strong>Firefox:</strong> Hacé clic en el escudo → Desactivá 'Protección contra el rastreo mejorada'.";
      } else if (/Safari/.test(ua)) {
        browserHelp = "<strong>Safari:</strong> Menú 'Desarrollo' → Desactivá 'Restricciones de contenido mixto'. En iOS, permití 'Red Local' en Ajustes → Privacidad.";
      } else {
        browserHelp = "Permití 'Contenido mixto' o 'Contenido no seguro' en los ajustes de privacidad de tu navegador.";
      }
      instContainer.innerHTML = browserHelp;
    }

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
  document.getElementById("startPauseBtn").onclick = (e) =>
    sendCustomCommand("/button/stopwatch_start_pause/press", e.currentTarget);

  document.getElementById("resetBtn").onclick = (e) => {
    const btn = e.currentTarget;
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

    sendCustomCommand("/button/stopwatch_reset/press", btn);
  };




  // === +/- Time Buttons ===
  document.getElementById("decreaseBtn").onclick = (e) => {
    const btn = e.currentTarget;
    sendCustomCommand("/number/stopwatch_add_seconds/set?value=-60", btn);
    sendCustomCommand("/button/stopwatch_add_time/press", btn);
  };
  document.getElementById("increaseBtn").onclick = (e) => {
    const btn = e.currentTarget;
    sendCustomCommand("/number/stopwatch_add_seconds/set?value=60", btn);
    sendCustomCommand("/button/stopwatch_add_time/press", btn);
  };

  // === Generic Command Sender ===
  function sendCustomCommand(endpoint, el = null) {
    // TX LED ON
    const txLed = document.getElementById("txLed");
    if (txLed) {
      txLed.classList.add("active", "led-flicker");
    }

    let feedbackEl = el;
    // If it's a hidden radio or a btn-check, apply feedback to its label
    if (el && el.tagName === 'INPUT' && (el.type === 'radio' || el.classList.contains('btn-check'))) {
      feedbackEl = document.querySelector(`label[for='${el.id}']`);
    }
    // If it's a switch, apply to its parent or container
    if (el && el.classList.contains('form-check-input')) {
      feedbackEl = el.parentElement;
    }

    const expectedId = getExpectedId(endpoint);
    const expectedValue = getExpectedValue(endpoint);

    if (feedbackEl) {
      feedbackEl.classList.add("btn-command-sent");
      pendingCommands.push({ el: feedbackEl, expectedId, expectedValue, timestamp: Date.now() });
    }

    return fetch(`${getUrl()}${endpoint}`, { method: "POST" })
      .then(res => res.ok)
      .catch(err => {
        if (feedbackEl) {
          feedbackEl.classList.remove("btn-command-sent");
          pendingCommands = pendingCommands.filter(c => c.el !== feedbackEl);
        }
        console.warn(`Command failed: ${endpoint}`, err);
        return false;
      });
  }

  // === Settings Modal Save = Reload (URL saved via query param) ===
  document.getElementById("saveSettingsBtn")?.addEventListener("click", () => {
    location.reload();
  });

  // === Reconnection Monitor Loop ===
  let reconnecting = false;

  function getUrlsToTry() {
    const urls = new Set(hardcodedUrls);
    extraUrls.forEach(u => urls.add(u));
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
      triedUrls.set(url, 'connected');
      updateTriedUrlsUI();
      setBlur(false);
    };

    eventSource.addEventListener("state", (e) => {
      messageCount++;
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
    let completed = 0;
    let foundWinner = false;
    const tempSources = [];

    function cleanup() {
      tempSources.forEach(ts => {
        ts.es.close();
        clearTimeout(ts.timeout);
      });
      reconnecting = false;
    }

    function checkAllFailed() {
      completed++;
      if (completed >= urls.length && !foundWinner) {
        updateConnectionStatus("disconnected");
        showReconnectHelp();
        reconnecting = false;
      }
    }

    if (urls.length === 0) {
      updateConnectionStatus("disconnected");
      showReconnectHelp();
      reconnecting = false;
      return;
    }

    urls.forEach(url => {
      triedUrls.set(url, 'trying');
      const es = new EventSource(`${url}/events`);
      
      const timeout = setTimeout(() => {
        if (!foundWinner) {
          es.close();
          triedUrls.set(url, 'failed');
          updateTriedUrlsUI();
          checkAllFailed();
        }
      }, 5000);

      tempSources.push({ es, timeout, url });

      es.onopen = () => {
        if (foundWinner) {
          es.close();
          clearTimeout(timeout);
          return;
        }
        foundWinner = true;
        triedUrls.set(url, 'connected');
        updateTriedUrlsUI();
        cleanup();

        // Pre-flight for future commands
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = url;
        document.head.appendChild(preconnect);

        connect(url);
      };

      es.onerror = () => {
        if (!foundWinner) {
          es.close();
          clearTimeout(timeout);
          triedUrls.set(url, 'failed');
          updateTriedUrlsUI();
          checkAllFailed();
        }
      };
    });

    updateTriedUrlsUI();
  }

  function updateTimeclockUI(value) {
    if (value === lastTimeclockValue && lastMiniSecondaryRole !== "hora") return;
    lastTimeclockValue = value;
    globalBlinkStart = Date.now(); // Sync blink phase
    const { clockTime: el } = elements;
    if (el) {
      if (value.length >= 3) {
        const base = value.slice(0, -3);
        const seconds = value.slice(-2);
        el.innerHTML = `${base}<span style="font-size: 80%; margin-left: 0.3em;">${seconds}</span>`;
      } else {
        el.textContent = value;
      }
    }
    renderMiniSecondary();
  }

  function renderStopwatchTenths() {
    const { stopwatchTime: stopEl, displayText: displayElem, miniDisplayText: miniDisplayElem } = elements;
    
    let base = lastStopwatchValue;
    if (stopwatchState === "running") {
      base = base.replace(/:/g, '<span class="colon">:</span>');
    }

    const tenthsHtml = `<span class="small-seconds" style="font-size: 70%; margin-left: 0.3em;">${stopwatchTenths}</span>`;
    const miniTenthsHtml = `<span class="small-seconds" style="font-size: 80%; margin-left: 0.3em;">${stopwatchTenths}</span>`;
    
    if (stopEl) stopEl.innerHTML = `<span>${base}</span>${tenthsHtml}`;

    if (currentDisplayMode === "stopwatch") {
      if (displayElem) displayElem.innerHTML = `<span>${base}</span>${tenthsHtml}`;
      if (miniDisplayElem) miniDisplayElem.innerHTML = `<span>${lastStopwatchValue}</span>${miniTenthsHtml}`;
    }
    renderMiniSecondary();
  }

  function updateStopwatchUI(value) {
    lastStopwatchValue = value;
    stopwatchTenths = 0; // Sync with the new second mark
    globalBlinkStart = Date.now(); // Sync blink phase

    document.body.dataset.stopwatchState = stopwatchState;

    const { stopwatchTime: stopEl } = elements;
    const match = value.match(/(\d+):(\d+)/);
    if (match) {
      stopwatchTime = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      updateLiveMeasuredTime(stopwatchTime);
    }
    
    renderStopwatchTenths();
  }

  function updateDisplayTextUI(value) {
    if (value === lastDisplayText) return;
    lastDisplayText = value;

    // Trim trailing spaces for cleaner UI display (flexbox handles centering)
    const trimmedValue = value.trimEnd();
    
    // Update browser page title
    document.title = trimmedValue ? `Reloj - ${trimmedValue}` : "Reloj";

    const { displayText: displayElem, miniDisplayText: miniDisplayElem } = elements;

    if (displayElem) {
      const parent = displayElem.parentElement;
      parent.classList.remove("is-scrolling");

      if (currentDisplayMode === 'custom_sign' && trimmedValue.length > 7) {
        parent.classList.add("is-scrolling");
        // Calculate speed: roughly 0.2s per character for a uniform feel
        const duration = Math.max(5, trimmedValue.length * 0.2); 
        // Wrap text in a scrolling span for the ticker effect
        displayElem.innerHTML = `<span class="pantalla-scroll" style="animation-duration: ${duration}s">${trimmedValue} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
        if (miniDisplayElem) miniDisplayElem.textContent = trimmedValue;
      } else if (currentDisplayMode === 'clock' && trimmedValue.length >= 3) {
          const trimmed = trimmedValue;
          const thirdLastHidden = trimmed.slice(0, -3) + '<span style="display:none;">' + trimmed[trimmed.length - 3] + '</span>';
          const smallerLastTwo = thirdLastHidden + '<span style="font-size: 70%; margin-left:.3em">' + trimmed.slice(-2) + '</span>';
          displayElem.innerHTML = smallerLastTwo;
          
          if (miniDisplayElem) {
            const miniBase = trimmed.slice(0, -3);
            const miniSeconds = trimmed.slice(-2);
            miniDisplayElem.innerHTML = `${miniBase}<span style="font-size: 80%; margin-left: 0.3em;">${miniSeconds}</span>`;
          }
      } else if (currentDisplayMode === 'stopwatch') {
          renderStopwatchTenths();
      } else {
        displayElem.textContent = trimmedValue;
        if (miniDisplayElem) miniDisplayElem.textContent = trimmedValue;
      }
    }
  }

  function handleStateEvent(data) {
    const now = Date.now();
    
    // Selectively clear pending commands
    pendingCommands = pendingCommands.filter(cmd => {
      // Must wait at least 1300ms before clearing, or wait for matching ID AND matching VALUE
      const elapsed = now - cmd.timestamp;
      
      const idMatches = (cmd.expectedId === data.id);
      const valueMatches = (cmd.expectedValue === undefined || cmd.expectedValue === null || cmd.expectedValue === data.value);
      
      const isMatch = (idMatches && valueMatches) || 
                      (data.id === "text_sensor-status" && elapsed > 1300) ||
                      (cmd.expectedId === null && elapsed > 1300);
      
      if (isMatch) {
        cmd.el.classList.remove("btn-command-sent");
        return false; // Remove from array
      }
      return true; // Keep in array
    });
    
    // TX LED OFF only if no more pending commands
    const { txLed, rxLed } = elements;
    if (txLed && pendingCommands.length === 0) {
      txLed.classList.remove("active", "led-flicker");
    }

    // RX LED Flash (Green)
    if (rxLed) {
      rxLed.classList.add("active");
      setTimeout(() => rxLed.classList.remove("active"), 100);
    }

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
        if (stopwatchState === "reset") {
          stopwatchTenths = 0;
          renderStopwatchTenths();
        }
        const labelMap = { running: "Pausa", paused: "Inicio", reset: "Inicio" };
        const iconMap = { running: "bi-pause-fill", paused: "bi-play-fill", reset: "bi-play-fill" };
        if (elements.startPauseLabel) elements.startPauseLabel.textContent = labelMap[data.value] || "Inicio";
        if (elements.startPauseIcon) elements.startPauseIcon.className = `bi ${iconMap[data.value]}`;
        updateStopwatchClass();
        break;

      case "select-sel_display_mode":
        currentDisplayMode = data.value;
        syncDisplayModeRadio(data.value);
        break;

      case "switch-sw_blink":
        suppressChange = true;
        blinkEnabled = data.value === true;
        if (elements.blinkSwitch) elements.blinkSwitch.checked = blinkEnabled;
        updatePantallaClass();
        suppressChange = false;
        break;

      case "number-countdown_minutes":
        suppressChange = true;
        if (elements.countdownInput) elements.countdownInput.value = data.value;
        updateCountdownOutput(data.value);
        suppressChange = false;
        break;

      case "select-sel_stopwatch_mode":
        suppressChange = true;
        if (elements.countdownModeSwitch) elements.countdownModeSwitch.checked = data.value === "countdown";
        suppressChange = false;
        break;

      case "switch-stopwatch_auto_show":
        suppressChange = true;
        if (elements.autoShowSwitch) elements.autoShowSwitch.checked = data.value === true;
        suppressChange = false;
        break;

      case "switch-stopwatch_blink_before_overtime":
        suppressChange = true;
        if (elements.blinkBeforeOvertimeSwitch) elements.blinkBeforeOvertimeSwitch.checked = data.value === true;
        suppressChange = false;
        break;

      case "select-sel_overtime_mode":
        suppressChange = true;
        if (elements.overtimeModeSelect) elements.overtimeModeSelect.value = data.value;
        suppressChange = false;
        break;

      case "text-custom_sign":
        if (elements.customSignInput) elements.customSignInput.value = data.value;
        break;

      case "text_sensor-ip":
        if (elements.infoIP) elements.infoIP.textContent = data.value;
        document.cookie = `clock_ip=${data.value}; path=/; max-age=31536000`;
        
        // Automatically add reported IP to the extra URLs if not already present
        const reportedUrl = `http://${data.value}`;
        if (!extraUrls.has(reportedUrl)) {
          extraUrls.add(reportedUrl);
          saveExtraUrls();
          renderUrlManagementList();
        }
        break;
      case "text_sensor-device_info":
        if (data.value) {
          const parts = data.value.split('|');
          if (elements.infoReset) elements.infoReset.textContent = parts[9] ? parts[9].replace('Reset: ', '') : "-";
          
          if (elements.infoChip) {
            const chipId = parts[2] ? parts[2].replace('Chip: ', '') : "";
            const cpu = parts[7] ? parts[7].replace('CPU: ', '') : "";
            elements.infoChip.textContent = `${chipId} @ ${cpu}MHz`;
          }

          if (elements.infoFlash) {
            const flashDetails = parts[1] ? parts[1].replace('Flash: ', '') : "";
            const flashId = parts[8] ? parts[8].replace('Flash: ', '') : "";
            elements.infoFlash.textContent = `${flashId} (${flashDetails})`;
          }

          if (elements.infoSDK) {
            const sdk = parts[3] ? parts[3].replace('SDK: ', '') : "";
            const core = parts[4] ? parts[4].replace('Core: ', '') : "";
            const boot = parts[5] ? parts[5].replace('Boot: ', '') : "";
            elements.infoSDK.textContent = `SDK:${sdk} Core:${core} Boot:${boot}`;
          }
        }
        break;
      case "text_sensor-ssid": if (elements.infoSSID) elements.infoSSID.textContent = data.value; break;
      case "text_sensor-bssid": if (elements.infoBSSID) elements.infoBSSID.textContent = data.value; break;
      case "text_sensor-mac": if (elements.infoMAC) elements.infoMAC.textContent = data.value; break;
      case "text-wifi_ssid": if (elements.wifiSsidInput) elements.wifiSsidInput.value = data.value; break;
      case "text-wifi_password": if (elements.wifiPasswordInput) elements.wifiPasswordInput.value = data.value; break;
      case "text_sensor-dns": if (elements.infoDNS) elements.infoDNS.textContent = data.value; break;
      case "sensor-heap_free": if (elements.infoHeapFree) elements.infoHeapFree.textContent = data.state; break;
      case "sensor-heap_max_block": if (elements.infoHeapMax) elements.infoHeapMax.textContent = data.state; break;
      case "sensor-heap_fragmentation": if (elements.infoHeapFrag) elements.infoHeapFrag.textContent = data.state; break;
      case "sensor-loop_time": if (elements.infoLoopTime) elements.infoLoopTime.textContent = data.state; break;
      case "sensor-cpu_frequency": 
        if (elements.infoCpuFreq) {
          const mhz = Math.round(Number(data.value) / 1000000);
          elements.infoCpuFreq.textContent = `${mhz}MHz`;
        }
        break;
      case "sensor-uptime":
        if (elements.infoUptime) {
          bootTimestamp = Number(data.value) * 1000;
          if (!isNaN(bootTimestamp) && bootTimestamp > 0) {
            const bootDate = new Date(bootTimestamp);
            elements.infoUptime.textContent = bootDate.toLocaleString('es-ES', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }).replace(',', '');
          } else {
            elements.infoUptime.textContent = data.state || "-";
            bootTimestamp = null;
            if (elements.infoUptimeDuration) elements.infoUptimeDuration.textContent = "-";
          }
        }
        break;
      case "sensor-wifi_signal":
        if (elements.infoRSSI) elements.infoRSSI.textContent = data.state;
        if (elements.wifiSignalIcon) {
          const rssi = parseInt(data.value);
          let icon = "bi-wifi-off";
          if (rssi > -50) icon = "bi-wifi";
          else if (rssi > -60) icon = "bi-wifi";
          else if (rssi > -70) icon = "bi-wifi-2";
          else if (rssi > -80) icon = "bi-wifi-1";
          else icon = "bi-wifi-1"; // weak but connected
          elements.wifiSignalIcon.className = `bi ${icon} text-secondary me-3 fs-5`;
          // Reset style override (we had it colored before)
          elements.wifiSignalIcon.style.color = "";

          // Percentage calculation (Quality approximation: -100 dBm = 0%, -50 dBm = 100%)
          if (elements.infoWifiPct) {
            let pct = 0;
            if (rssi >= -50) pct = 100;
            else if (rssi <= -100) pct = 0;
            else pct = Math.round(2 * (rssi + 100));
            elements.infoWifiPct.textContent = pct;
          }
        }
        break;
      case "text_sensor-esphome_version": 
        if (elements.infoVersion) {
          // Parse: 2026.1.5 (config hash 0x66291bcd, built 2026-02-15 11:18:09 +0000)
          const raw = data.value;
          const version = raw.split(' ')[0];
          elements.infoVersion.textContent = version;

          const dateMatch = raw.match(/built ([\d-]+ [\d:]+)/);
          if (dateMatch) {
            const date = new Date(dateMatch[1] + " UTC");
            deviceBuildDate = date; // for firmware update comparison
            if (elements.infoBuildTime) {
              elements.infoBuildTime.textContent = date.toLocaleString('es-ES', { 
                day: '2-digit', month: '2-digit', year: '2-digit', 
                hour: '2-digit', minute: '2-digit' 
              }).replace(',', '');
            }
            compareFirmwareVersions();
          }
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

  // === UI Animation Loop (Tenths + Blink Sync) ===
  let lastTenthsUpdate = 0;
  function uiLoop(timestamp) {
    updateBlinkSync();

    if (stopwatchState === "running" && connectionStatus === "connected") {
      if (!lastTenthsUpdate) lastTenthsUpdate = timestamp;
      const delta = timestamp - lastTenthsUpdate;

      if (delta >= 100) {
        lastTenthsUpdate = timestamp - (delta % 100);
        
        // Determine direction from the sign in the string
        const isCountingDown = lastStopwatchValue.startsWith("-");
        
        if (isCountingDown) {
          stopwatchTenths = (stopwatchTenths <= 0) ? 9 : stopwatchTenths - 1;
        } else {
          stopwatchTenths = (stopwatchTenths >= 9) ? 0 : stopwatchTenths + 1;
        }
        
        renderStopwatchTenths();
      }
    } else {
      lastTenthsUpdate = 0;
    }
    requestAnimationFrame(uiLoop);
  }
  requestAnimationFrame(uiLoop);

  tryReconnect();



  // === Inputs and Toggles ===
  elements.toggleWifiPassword?.addEventListener("click", () => {
    const input = elements.wifiPasswordInput;
    const icon = elements.toggleWifiPassword.querySelector("i");
    if (input.type === "password") {
      input.type = "text";
      icon.className = "bi bi-eye-slash";
    } else {
      input.type = "password";
      icon.className = "bi bi-eye";
    }
  });

  elements.connectWifiBtn?.addEventListener("click", async () => {
    const ssid = elements.wifiSsidInput.value.trim();
    const password = elements.wifiPasswordInput.value;

    if (!ssid) {
      alert("Por favor, ingresá el nombre de la red (SSID).");
      return;
    }

    if (!confirm(`¿Querés conectar el reloj a la red "${ssid}"?`)) return;

    elements.connectWifiBtn.disabled = true;
    const originalText = elements.connectWifiBtn.textContent;
    elements.connectWifiBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Conectando...';

    try {
      // 1. Set SSID
      await sendCustomCommand(`/text/wifi_ssid/set?value=${encodeURIComponent(ssid)}`);
      // 2. Set Password
      await sendCustomCommand(`/text/wifi_password/set?value=${encodeURIComponent(password)}`);
      // 3. Press Connect Button
      await sendCustomCommand("/button/connect_to_wifi/press");

      alert("Comando enviado. El reloj intentará conectarse a la nueva red.\n\nSi tiene éxito, deberás actualizar la dirección IP en esta aplicación. Si falla, volverá a la red actual.");
      bootstrap.Modal.getInstance(document.getElementById("wifiConfigModal"))?.hide();
    } catch (err) {
      console.error("Error setting WiFi config:", err);
      alert("Error al enviar la configuración de WiFi.");
    } finally {
      elements.connectWifiBtn.disabled = false;
      elements.connectWifiBtn.textContent = originalText;
    }
  });

  document.getElementById("blinkSwitch").onchange = (e) => {
    if (suppressChange) return;
    const endpoint = e.target.checked ? "/switch/sw_blink/turn_on" : "/switch/sw_blink/turn_off";
    sendCustomCommand(endpoint, e.target);
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
      sendCustomCommand(`/number/countdown_minutes/set?value=${value}`, e.target);
    }
  };

  presetDuration.onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      countdownInput.value = val;
      updateCountdownOutput(val);
      sendCustomCommand(`/number/countdown_minutes/set?value=${val}`, e.target);
    }
  };

  document.getElementById("countdownModeSwitch").onchange = (e) => {
    if (suppressChange) return;
    const mode = e.target.checked ? "countdown" : "normal";
    sendCustomCommand(`/select/sel_stopwatch_mode/set?option=${mode}`, e.target);
  };

  document.getElementById("autoShowSwitch").onchange = (e) => {
    if (suppressChange) return;
    const cmd = e.target.checked ? "turn_on" : "turn_off";
    sendCustomCommand(`/switch/stopwatch_auto_show/${cmd}`, e.target);
  };

  document.getElementById("blinkBeforeOvertimeSwitch").onchange = (e) => {
    if (suppressChange) return;
    const cmd = e.target.checked ? "turn_on" : "turn_off";
    sendCustomCommand(`/switch/stopwatch_blink_before_overtime/${cmd}`, e.target);
  };

  document.getElementById("overtimeModeSelect").onchange = (e) => {
    if (suppressChange) return;
    const value = e.target.value;
    sendCustomCommand(`/select/sel_overtime_mode/set?option=${value}`, e.target);
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

  // Initialize all tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Scale content for very narrow screens
  function handleScaling() {
    const width = window.innerWidth;
    const minWidth = 400;
    if (width < minWidth) {
      const scale = width / minWidth;
      document.body.style.transform = `scale(${scale})`;
      document.body.style.transformOrigin = "top left";
      document.body.style.width = `${(1 / scale) * 100}%`;
      document.body.style.height = `${(1 / scale) * 100}%`;
    } else {
      document.body.style.transform = "";
      document.body.style.transformOrigin = "";
      document.body.style.width = "";
      document.body.style.height = "";
    }
  }

  window.addEventListener("resize", handleScaling);
  handleScaling();

});
