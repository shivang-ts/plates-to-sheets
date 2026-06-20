import { saveCredentials } from "../lib/storage.js";

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
}

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
    delete partial.resId;
  }

  if (!partial.resId && !partial.csrf && !partial.mxCsrf) return;

  try {
    await saveCredentials("zomato", partial);
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes("Extension context invalidated")) teardown();
  }
}

document.addEventListener(CRED_EVENT, (event) => {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }
  void persistCredentials(event.detail ?? {});
});
