const CRED_EVENT = "__zomato_orders_creds__";

let tornDown = false;

function isExtensionAlive() {
  try {
    return Boolean(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

function teardown() {
  tornDown = true;
}

function isValidResId(id) {
  if (id === undefined || id === null) return false;
  const s = String(id).trim();
  if (!/^\d{5,9}$/.test(s)) return false;
  if (Number(s) >= 1_000_000_000) return false;
  return true;
}

function persistCredentials(partial) {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }

  const creds = { ...partial };
  if (creds.resId && !isValidResId(creds.resId)) {
    delete creds.resId;
  }

  if (!creds.resId && !creds.csrf && !creds.mxCsrf) return;

  chrome.runtime.sendMessage(
    { type: "SAVE_CREDENTIALS", platform: "zomato", creds },
    () => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message ?? "";
        if (msg.includes("Extension context invalidated")) teardown();
      }
    }
  );
}

document.addEventListener(CRED_EVENT, (event) => {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }
  persistCredentials(event.detail ?? {});
});
