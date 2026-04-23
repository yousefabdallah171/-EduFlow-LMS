export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;
    void navigator.serviceWorker.register(swUrl).catch(() => undefined);
  });
};

