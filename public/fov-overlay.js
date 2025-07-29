console.log("[FOV OVERLAY] Chargement avec gestion de disparition...");

let overlay = null;
let mapCanvas = null;

function findMapCanvas() {
  const canvas = document.querySelector("canvas");
  if (canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
    return canvas;
  }
  return null;
}

function createOverlay() {
  const existing = document.getElementById("fov-overlay");
  if (existing) existing.remove();

  overlay = document.createElement("canvas");
  overlay.id = "fov-overlay";
  overlay.style.position = "absolute";
  overlay.style.pointerEvents = "none";
  overlay.style.zIndex = "9999";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.width = mapCanvas.width;
  overlay.height = mapCanvas.height;

  const parent = mapCanvas.parentElement;
  parent.style.position = "relative";
  parent.appendChild(overlay);
  console.log("[FOV OVERLAY] Overlay injecté ✅");
}

function drawLine() {
  if (!overlay) return;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(overlay.width, overlay.height);
  ctx.stroke();
}

function maintainOverlay() {
  setInterval(() => {
    const current = document.getElementById("fov-overlay");
    const canvasCheck = findMapCanvas();

    if (!canvasCheck) {
      console.warn("[FOV OVERLAY] Canvas principal non trouvé.");
      return;
    }

    if (!mapCanvas || canvasCheck !== mapCanvas) {
      console.log("[FOV OVERLAY] Mise à jour du canvas source.");
      mapCanvas = canvasCheck;
    }

    if (!current || !current.isConnected || current.width !== mapCanvas.width || current.height !== mapCanvas.height) {
      createOverlay();
      drawLine();
    }
  }, 500); // vérifie toutes les 0.5s
}

(function init() {
  console.log("[FOV OVERLAY] Initialisation...");
  const check = setInterval(() => {
    const canvas = findMapCanvas();
    if (canvas) {
      clearInterval(check);
      mapCanvas = canvas;
      createOverlay();
      drawLine();
      maintainOverlay();
    }
  }, 500);
})();
