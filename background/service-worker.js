import { migrateStorage, getSelectedPlatform } from "../lib/storage.js";
import { exportSwiggyOrders } from "../lib/swiggy/handler.js";
import { exportZomatoOrders } from "../lib/zomato/handler.js";
import { ExportContext } from "../lib/export-context.js";
import { resultFromError } from "../lib/user-errors.js";
import { registerWebRequestCapture } from "./credentials.js";

registerWebRequestCapture();
void migrateStorage();

let activeExportContext = null;

async function downloadCsv(csvContent, filename) {
  const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  await chrome.downloads.download({
    url: dataUrl,
    filename,
    saveAs: true,
  });
}

async function handleFetchAndExport(message = {}, ctx = null) {
  const platform = message.platform || (await getSelectedPlatform()) || "swiggy";

  const result =
    platform === "zomato"
      ? await exportZomatoOrders({
          daysBack: message.daysBack,
          startDate: message.startDate,
          endDate: message.endDate,
          ctx,
        })
      : await exportSwiggyOrders({ ctx });

  if (!result.ok) return result;

  if (result.shouldDownload) {
    ctx?.report({
      phase: "download",
      current: result.orderCount,
      total: result.orderCount,
      message: "Saving CSV…",
    });
    await downloadCsv(result.csvContent, result.filename);
  }

  return result;
}

function postProgress(port, progress) {
  try {
    port.postMessage({ type: "PROGRESS", ...progress });
  } catch {
    // Popup closed — export continues without UI updates.
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "export") return;

  port.onMessage.addListener((message) => {
    if (message.type === "CANCEL") {
      activeExportContext?.cancel();
      return;
    }

    if (message.type !== "FETCH_AND_EXPORT") return;

    const ctx = new ExportContext((progress) => postProgress(port, progress));
    activeExportContext = ctx;

    handleFetchAndExport(message, ctx)
      .then((result) => {
        port.postMessage({ type: "DONE", result });
      })
      .catch((err) => {
        port.postMessage({ type: "DONE", result: resultFromError(err) });
      })
      .finally(() => {
        if (activeExportContext === ctx) {
          activeExportContext = null;
        }
      });
  });
});

// Legacy one-shot message (no progress / cancel).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_AND_EXPORT") {
    handleFetchAndExport(message)
      .then(sendResponse)
      .catch((err) => {
        sendResponse(resultFromError(err));
      });
    return true;
  }
});
