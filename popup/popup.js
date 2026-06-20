import { PLATFORMS, getPlatform } from "../lib/platforms.js";
import {
  getSelectedPlatform,
  setSelectedPlatform,
  getCredentials,
  saveCredentials,
  clearCredentials,
  isLoggedIn,
} from "../lib/storage.js";
import { resolveZomatoResId, isValidZomatoResId } from "../lib/zomato/res-id.js";

const CAPTURE_WAIT_MS = 120_000;
const POLL_MS = 1500;

let currentPlatform = null;
let pollTimer = null;
let exportPort = null;

const platformSection = document.getElementById("platform-section");
const authSection = document.getElementById("auth-section");
const fetchSection = document.getElementById("fetch-section");
const appTitle = document.getElementById("app-title");
const appSubtitle = document.getElementById("app-subtitle");
const switchPlatformBtn = document.getElementById("switch-platform-btn");
const authStatus = document.getElementById("auth-status");
const authStatusText = document.getElementById("auth-status-text");
const loginBtn = document.getElementById("login-btn");
const restaurantInfo = document.getElementById("restaurant-info");
const fetchBtn = document.getElementById("fetch-btn");
const logoutBtn = document.getElementById("logout-btn");
const helpBtn = document.getElementById("help-btn");
const privacyBtn = document.getElementById("privacy-btn");
const exportProgress = document.getElementById("export-progress");
const exportProgressText = document.getElementById("export-progress-text");
const exportProgressBar = document.getElementById("export-progress-bar");
const exportProgressTrack = exportProgress.querySelector(".export-progress__track");
const cancelExportBtn = document.getElementById("cancel-export-btn");
const messageEl = document.getElementById("message");
const saveManualBtn = document.getElementById("save-manual-btn");
const swiggyManual = document.getElementById("swiggy-manual");
const zomatoManual = document.getElementById("zomato-manual");
const swiggyTokenInput = document.getElementById("swiggy-token-input");
const swiggyRestaurantInput = document.getElementById("swiggy-restaurant-input");
const zomatoResInput = document.getElementById("zomato-res-input");
const zomatoCsrfInput = document.getElementById("zomato-csrf-input");
const zomatoMxCsrfInput = document.getElementById("zomato-mx-csrf-input");
const zomatoDateFields = document.getElementById("zomato-date-fields");
const zomatoStartDate = document.getElementById("zomato-start-date");
const zomatoEndDate = document.getElementById("zomato-end-date");

function showMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.className = `message message--${type}`;
  messageEl.classList.remove("hidden");
}

function hideMessage() {
  messageEl.classList.add("hidden");
}

function showExportProgress(message, percent = null) {
  exportProgress.classList.remove("hidden");
  exportProgressText.textContent = message;
  const value = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  exportProgressBar.style.width = `${value}%`;
  exportProgressTrack.setAttribute("aria-valuenow", String(Math.round(value)));
}

function hideExportProgress() {
  exportProgress.classList.add("hidden");
  exportProgressBar.style.width = "0%";
  exportProgressTrack.setAttribute("aria-valuenow", "0");
}

function progressPercent(current, total, phase) {
  if (total > 0) return (current / total) * 100;
  if (phase === "history") return 15;
  if (phase === "orders") return 30;
  if (phase === "csv" || phase === "download") return 95;
  return 5;
}

function disconnectExportPort() {
  if (exportPort) {
    exportPort.disconnect();
    exportPort = null;
  }
}

function applyTheme(platformId) {
  document.body.classList.remove("platform-swiggy", "platform-zomato");
  document.body.classList.add(`platform-${platformId}`);
  const platform = getPlatform(platformId);
  const theme = platform.theme;
  document.documentElement.style.setProperty("--brand-primary", theme.primary);
  document.documentElement.style.setProperty("--brand-primary-hover", theme.primaryHover);
  document.documentElement.style.setProperty("--brand-primary-light", theme.primaryLight);
  document.documentElement.style.setProperty("--brand-header", theme.header);
  appTitle.textContent = "Plates to Sheets";
  appSubtitle.textContent = `${platform.name} partner export`;
  loginBtn.textContent = `Open ${platform.name} Partner`;
}

function setDefaultZomatoDates() {
  const today = new Date().toISOString().slice(0, 10);
  zomatoStartDate.value = today;
  zomatoEndDate.value = today;
}

function showPlatformPicker() {
  platformSection.classList.remove("hidden");
  authSection.classList.add("hidden");
  fetchSection.classList.add("hidden");
  switchPlatformBtn.classList.add("hidden");
}

function showMainUI() {
  platformSection.classList.add("hidden");
  authSection.classList.remove("hidden");
  switchPlatformBtn.classList.remove("hidden");
  swiggyManual.classList.toggle("hidden", currentPlatform !== "swiggy");
  zomatoManual.classList.toggle("hidden", currentPlatform !== "zomato");
  zomatoDateFields.classList.toggle("hidden", currentPlatform !== "zomato");
}

async function selectPlatform(platformId) {
  currentPlatform = platformId;
  await setSelectedPlatform(platformId);
  applyTheme(platformId);
  if (platformId === "zomato") setDefaultZomatoDates();
  showMainUI();
  await loadAuthState();
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function clearCapturePending() {
  await chrome.storage.session.remove(["capturePending", "capturePendingAt", "capturePlatform"]);
}

async function isCapturePending() {
  const { capturePending, capturePendingAt, capturePlatform } = await chrome.storage.session.get([
    "capturePending",
    "capturePendingAt",
    "capturePlatform",
  ]);
  if (!capturePending || capturePlatform !== currentPlatform) return false;
  if (Date.now() - (capturePendingAt ?? 0) > CAPTURE_WAIT_MS) {
    await clearCapturePending();
    return false;
  }
  return true;
}

function setWaitingUI() {
  authStatus.className = "status status--waiting";
  authStatusText.textContent = "Waiting for dashboard…";
  loginBtn.disabled = true;
  fetchSection.classList.add("hidden");
}

function setAuthUI(creds = {}) {
  const platform = getPlatform(currentPlatform);
  const loggedIn = isLoggedIn(currentPlatform, creds);
  const partial =
    currentPlatform === "swiggy"
      ? Boolean(creds.accessToken || creds.restaurantId)
      : Boolean(creds.resId || creds.authToken || creds.csrf || creds.mxCsrf);

  loginBtn.disabled = false;

  if (loggedIn) {
    authStatus.className = "status status--logged-in";
    authStatusText.textContent = "Logged in";
    loginBtn.classList.add("hidden");
    fetchSection.classList.remove("hidden");
    restaurantInfo.textContent =
      currentPlatform === "swiggy"
        ? `Restaurant ID: ${creds.restaurantId}`
        : `Restaurant ID: ${resolveZomatoResId(creds, "") ?? creds.resId ?? "unknown"}`;
  } else if (partial) {
    authStatus.className = "status status--logged-out";
    authStatusText.textContent = "Partial credentials captured";
    loginBtn.classList.remove("hidden");
    fetchSection.classList.remove("hidden");
    restaurantInfo.textContent = platform.dashboardHint;
  } else {
    authStatus.className = "status status--logged-out";
    authStatusText.textContent = "Not logged in";
    loginBtn.classList.remove("hidden");
    fetchSection.classList.add("hidden");
  }
}

async function checkCaptureProgress() {
  const creds = await getCredentials(currentPlatform);
  if (isLoggedIn(currentPlatform, creds)) {
    await clearCapturePending();
    stopPolling();
    setAuthUI(creds);
    showMessage("Credentials captured successfully.", "success");
    return true;
  }

  const pending = await isCapturePending();
  if (!pending) {
    stopPolling();
    loginBtn.disabled = false;
    setAuthUI(creds);
    return false;
  }

  setAuthUI(creds);
  showMessage("Waiting for dashboard…", "info");
  return false;
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    void checkCaptureProgress();
  }, POLL_MS);
}

async function startCaptureWait() {
  await chrome.storage.session.set({
    capturePending: true,
    capturePendingAt: Date.now(),
    capturePlatform: currentPlatform,
  });
  setWaitingUI();
  showMessage(
    `Opening ${getPlatform(currentPlatform).name} partner dashboard. Credentials will be captured automatically.`,
    "info"
  );
  startPolling();
  await checkCaptureProgress();
}

function fillManualFields(creds) {
  if (currentPlatform === "swiggy") {
    swiggyTokenInput.value = creds.accessToken ?? "";
    swiggyRestaurantInput.value = creds.restaurantId ? String(creds.restaurantId) : "";
  } else {
    zomatoResInput.value = creds.resId ?? "";
    zomatoCsrfInput.value = creds.csrf ?? "";
    zomatoMxCsrfInput.value = creds.mxCsrf ?? "";
  }
}

async function loadAuthState() {
  const creds = await getCredentials(currentPlatform);
  fillManualFields(creds);

  const pending = await isCapturePending();
  if (pending && !isLoggedIn(currentPlatform, creds)) {
    setWaitingUI();
    showMessage("Waiting for dashboard…", "info");
    startPolling();
    return;
  }

  setAuthUI(creds);
}

document.getElementById("select-swiggy-btn").addEventListener("click", () => {
  void selectPlatform("swiggy");
});

document.getElementById("select-zomato-btn").addEventListener("click", () => {
  void selectPlatform("zomato");
});

switchPlatformBtn.addEventListener("click", () => {
  stopPolling();
  void clearCapturePending();
  hideMessage();
  showPlatformPicker();
});

loginBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: getPlatform(currentPlatform).loginUrl });
  void startCaptureWait();
});

saveManualBtn.addEventListener("click", async () => {
  if (currentPlatform === "swiggy") {
    const accessToken = swiggyTokenInput.value.trim();
    const restaurantId = swiggyRestaurantInput.value.trim();
    if (!accessToken || !restaurantId) {
      showMessage("Access token and restaurant ID are required.", "error");
      return;
    }
    if (!/^\d+$/.test(restaurantId)) {
      showMessage("Restaurant ID must be a number.", "error");
      return;
    }
    await saveCredentials("swiggy", {
      accessToken,
      restaurantId: Number(restaurantId),
    });
  } else {
    const resId = zomatoResInput.value.trim();
    if (!resId) {
      showMessage("Restaurant ID (res_Id) is required.", "error");
      return;
    }
    if (!isValidZomatoResId(resId)) {
      showMessage("Invalid res_Id. Use your outlet ID (e.g. 22737520), not a timestamp.", "error");
      return;
    }
    await saveCredentials("zomato", {
      resId,
      csrf: zomatoCsrfInput.value.trim() || undefined,
      mxCsrf: zomatoMxCsrfInput.value.trim() || undefined,
    });
  }

  await clearCapturePending();
  stopPolling();
  const creds = await getCredentials(currentPlatform);
  setAuthUI(creds);
  showMessage("Credentials saved.", "success");
});

logoutBtn.addEventListener("click", async () => {
  await clearCapturePending();
  stopPolling();
  await clearCredentials(currentPlatform);
  fillManualFields({});
  hideMessage();
  setAuthUI({});
  showMessage("Credentials cleared.", "info");
});

helpBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("help/help.html") });
});

privacyBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("help/privacy.html") });
});

cancelExportBtn.addEventListener("click", () => {
  if (exportPort) {
    exportPort.postMessage({ type: "CANCEL" });
    cancelExportBtn.disabled = true;
    showExportProgress("Cancelling…");
  }
});

fetchBtn.addEventListener("click", async () => {
  fetchBtn.disabled = true;
  logoutBtn.disabled = true;
  cancelExportBtn.disabled = false;
  hideMessage();
  showExportProgress("Starting export…", 2);

  disconnectExportPort();
  exportPort = chrome.runtime.connect({ name: "export" });

  const payload = { type: "FETCH_AND_EXPORT", platform: currentPlatform };
  if (currentPlatform === "zomato") {
    payload.startDate = zomatoStartDate.value;
    payload.endDate = zomatoEndDate.value;
  }

  const done = new Promise((resolve) => {
    exportPort.onMessage.addListener((msg) => {
      if (msg.type === "PROGRESS") {
        const pct = progressPercent(msg.current, msg.total, msg.phase);
        showExportProgress(msg.message || "Exporting…", pct);
        return;
      }

      if (msg.type === "DONE") {
        resolve(msg.result);
      }
    });

    exportPort.onDisconnect.addListener(() => {
      resolve({
        ok: false,
        error: "Export interrupted. Re-open the popup and try again.",
      });
    });
  });

  exportPort.postMessage(payload);

  try {
    const response = await done;

    if (response?.cancelled) {
      showMessage("Export cancelled.", "info");
      return;
    }

    if (!response?.ok) {
      showMessage(response?.error ?? "Failed to fetch orders.", "error");
      if (response?.authError) setAuthUI({});
      return;
    }

    if (response.orderCount === 0) {
      showMessage("No orders found for the selected range.", "info");
      return;
    }

    showMessage(`Exported ${response.orderCount} order(s) to ${response.filename}.`, "success");
  } catch (err) {
    showMessage(err.message ?? "Unexpected error.", "error");
  } finally {
    disconnectExportPort();
    hideExportProgress();
    fetchBtn.disabled = false;
    logoutBtn.disabled = false;
    cancelExportBtn.disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (!currentPlatform) return;
  if (
    (area === "local" && (changes.credentials || changes.selectedPlatform)) ||
    (area === "session" && changes.credentialSession)
  ) {
    void loadAuthState();
  }
});

void (async () => {
  const platform = await getSelectedPlatform();
  if (platform) {
    await selectPlatform(platform);
  } else {
    showPlatformPicker();
  }
})();
