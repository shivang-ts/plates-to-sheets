import { saveCredentials } from "../lib/storage.js";

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

async function persistCredentials(partial) {
  if (!isExtensionAlive()) {
    teardown();
    return;
  }

  const update = {};
  if (partial.token) update.accessToken = partial.token;
  if (partial.restaurantId) update.restaurantId = partial.restaurantId;
  if (!Object.keys(update).length) return;

  try {
    await saveCredentials("swiggy", update);
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
  const detail = event.detail ?? {};
  void persistCredentials({
    token: detail.token,
    restaurantId: detail.restaurantId,
  });
});
