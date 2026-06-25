const CRED_EVENT = "__swiggy_orders_creds__";

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

function persistCredentials(partial) {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }

  const creds = {};
  if (partial.token) creds.accessToken = partial.token;
  if (partial.restaurantId) creds.restaurantId = partial.restaurantId;
  if (!Object.keys(creds).length) return;

  chrome.runtime.sendMessage(
    { type: "SAVE_CREDENTIALS", platform: "swiggy", creds },
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
  const detail = event.detail ?? {};
  persistCredentials({
    token: detail.token,
    restaurantId: detail.restaurantId,
  });
});
