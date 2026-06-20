// Runs in the page's MAIN world so hooks apply to Swiggy's own fetch/XHR calls.
(function () {
  const EVENT = "__swiggy_orders_creds__";

  function emit(partial) {
    if (!partial.token && !partial.restaurantId) return;
    document.dispatchEvent(new CustomEvent(EVENT, { detail: partial }));
  }

  function parseRestaurantId(body) {
    if (!body) return null;
    try {
      const parsed = typeof body === "string" ? JSON.parse(body) : body;
      const map = parsed?.restaurantTimeMap;
      if (Array.isArray(map) && map[0]?.restaurantId) {
        return Number(map[0].restaurantId);
      }
      if (parsed?.restaurantId) return Number(parsed.restaurantId);
    } catch {
      // ignore
    }
    return null;
  }

  function headerToken(headers) {
    if (!headers) return null;
    if (headers instanceof Headers) {
      return headers.get("access_token") || headers.get("accesstoken");
    }
    if (typeof headers === "object") {
      return (
        headers.access_token ||
        headers.accesstoken ||
        headers["access_token"] ||
        headers["accesstoken"]
      );
    }
    return null;
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const [input, init] = args;
      const url = typeof input === "string" ? input : input?.url ?? "";
      const headers = init?.headers ?? (input instanceof Request ? input.headers : null);
      const token = headerToken(headers);
      const restaurantId =
        url.includes("rms.swiggy.com") || url.includes("swiggy.com")
          ? parseRestaurantId(init?.body)
          : null;
      emit({ token, restaurantId });
    } catch {
      // never break the page
    }
    return originalFetch.apply(this, args);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__swiggyUrl = url;
    this.__swiggyHeaders = {};
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    this.__swiggyHeaders[name.toLowerCase()] = value;
    return originalSetHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function (body) {
    try {
      const token =
        this.__swiggyHeaders["access_token"] || this.__swiggyHeaders["accesstoken"];
      const restaurantId = parseRestaurantId(body);
      emit({ token, restaurantId });
    } catch {
      // ignore
    }
    return originalSend.call(this, body);
  };
})();
