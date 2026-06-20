const LOG = "[ZomatoOrders]";
const CRED_EVENT = "__zomato_orders_creds__";

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

/** Zomato res_Id is typically 5–9 digits; reject timestamps. */
function isValidResId(id) {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  if (!/^\d{5,9}$/.test(s)) return false;
  if (Number(s) >= 1_000_000_000) return false;
  return true;
}

async function persistCredentials(partial) {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }

  if (partial.resId && !isValidResId(partial.resId)) {
    console.warn(LOG, "Ignoring invalid resId:", partial.resId);
    delete partial.resId;
  }

  if (!partial.resId && !partial.csrf && !partial.mxCsrf) return;

  try {
    const { credentials = {} } = await chrome.storage.local.get("credentials");
    const current = credentials.zomato ?? {};
    const updated = { ...current };
    if (partial.resId) updated.resId = String(partial.resId);
    if (partial.csrf) updated.csrf = partial.csrf;
    if (partial.mxCsrf) updated.mxCsrf = partial.mxCsrf;
    if (JSON.stringify(updated) === JSON.stringify(current)) return;

    credentials.zomato = updated;
    await chrome.storage.local.set({ credentials });
    console.log(LOG, "Captured via content script:", Object.keys(partial).join(", "));
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes("Extension context invalidated")) teardown();
    else console.warn(LOG, "Failed to save credentials:", msg);
  }
}

document.addEventListener(CRED_EVENT, (event) => {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }
  void persistCredentials(event.detail ?? {});
});

console.log(LOG, "Content script active on", location.href);
