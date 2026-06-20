const LOG = "[SwiggyOrders]";
const CRED_EVENT = "__swiggy_orders_creds__";
const POLL_MS = 5000;

let pollTimer = null;
let tornDown = false;

function isExtensionAlive() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

function teardown() {
  if (tornDown) return;
  tornDown = true;
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  console.info(LOG, "Extension was reloaded. Refresh this tab to resume capture.");
}

async function persistCredentials(partial) {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }

  try {
    const { credentials = {} } = await chrome.storage.local.get("credentials");
    const current = credentials.swiggy ?? {};
    const updated = { ...current };
    if (partial.token) updated.accessToken = partial.token;
    if (partial.restaurantId) updated.restaurantId = partial.restaurantId;
    if (JSON.stringify(updated) === JSON.stringify(current)) return;

    credentials.swiggy = updated;
    await chrome.storage.local.set({ credentials });
    console.log(LOG, "Captured via content script:", Object.keys(partial).join(", "));
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes("Extension context invalidated")) teardown();
    else console.warn(LOG, "Failed to save credentials:", msg);
  }
}

function poll() {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }
}

document.addEventListener(CRED_EVENT, (event) => {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }
  const detail = event.detail ?? {};
  void persistCredentials({
    token: detail.token,
    restaurantId: detail.restaurantId,
  });
});

console.log(LOG, "Content script active on", location.href);
pollTimer = setInterval(poll, POLL_MS);
