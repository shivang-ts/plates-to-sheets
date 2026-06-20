export function formatUserError(err) {
  if (!err) return "Something went wrong. Please try again.";

  if (err.cancelled) {
    return "Export cancelled.";
  }

  if (err.authError) {
    return (
      err.message ||
      "Your session expired or you don't have access to this restaurant. Please log in again on the partner dashboard."
    );
  }

  const msg = err.message ?? String(err);

  if (/not authorised|not authorized|access denied/i.test(msg)) {
    return "You don't have access to this restaurant outlet. Open the correct outlet on the partner dashboard, then try again.";
  }

  if (/res_Id|restaurant id/i.test(msg)) {
    return msg;
  }

  if (/failed \(\d{3}\)/i.test(msg) || /API request failed/i.test(msg)) {
    return "Could not reach the partner service. Check your internet connection and try again in a few minutes.";
  }

  if (/not logged in/i.test(msg)) {
    return msg;
  }

  return msg || "Export failed. Please try again.";
}

export function resultFromError(err) {
  return {
    ok: false,
    error: formatUserError(err),
    authError: Boolean(err.authError),
    cancelled: Boolean(err.cancelled),
  };
}
