(function () {
  const EVENT = "__zomato_orders_creds__";

  function emit(partial) {
    if (!partial.resId && !partial.csrf && !partial.mxCsrf) return;
    if (partial.resId && !/^\d{5,9}$/.test(String(partial.resId))) return;
    document.dispatchEvent(new CustomEvent(EVENT, { detail: partial }));
  }

  function parseResId(body) {
    if (!body) return null;
    try {
      const parsed = typeof body === "string" ? JSON.parse(body) : body;
      if (parsed?.res_Id) return String(parsed.res_Id);
      if (parsed?.res_id) return String(parsed.res_id);
    } catch {
      // ignore
    }
    return null;
  }

  function headerValue(headers, name) {
    if (!headers) return null;
    if (headers instanceof Headers) return headers.get(name);
    if (typeof headers === "object") {
      return headers[name] ?? headers[name.toLowerCase()];
    }
    return null;
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const [input, init] = args;
      const url = typeof input === "string" ? input : input?.url ?? "";
      if (url.includes("api.zomato.com")) {
        const headers = init?.headers ?? (input instanceof Request ? input.headers : null);
        emit({
          resId: parseResId(init?.body),
          csrf: headerValue(headers, "x-zomato-csrft"),
          mxCsrf: headerValue(headers, "x-zomato-mx-csrf-token"),
        });
      }
    } catch {
      // never break the page
    }
    return originalFetch.apply(this, args);
  };
})();
