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

function drawFOV(angleDeg = 0, fovDeg = 90) {
  if (!overlay) return;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  const centerX = overlay.width / 2;
  const centerY = overlay.height / 2;

  const radius = 500; // Distance (pixels) du cône

  const angleRad = (angleDeg - 90) * Math.PI / 180;
  const halfFovRad = fovDeg / 2 * Math.PI / 180;

  const startAngle = angleRad - halfFovRad;
  const endAngle = angleRad + halfFovRad;

  const x1 = centerX + radius * Math.cos(startAngle);
  const y1 = centerY + radius * Math.sin(startAngle);
  const x2 = centerX + radius * Math.cos(endAngle);
  const y2 = centerY + radius * Math.sin(endAngle);

  ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fill();
}


function maintainOverlay() {
  setInterval(() => {
    const current = document.getElementById("fov-overlay");
    const canvasCheck = findMapCanvas();

    if (!canvasCheck) return;

    if (!mapCanvas || canvasCheck !== mapCanvas) {
      mapCanvas = canvasCheck;
    }

    if (!current || !current.isConnected || current.width !== mapCanvas.width || current.height !== mapCanvas.height) {
      createOverlay();
    }

    drawFOV(0); // <- Angle fixe pour l’instant (0° = nord / haut)
  }, 500);
}


(function init() {
  console.log("[FOV OVERLAY] Initialisation...");
  const check = setInterval(() => {
    const canvas = findMapCanvas();
    if (canvas) {
      clearInterval(check);
      mapCanvas = canvas;
      createOverlay();
      drawFOV();
      maintainOverlay();
    }
  }, 500);
})();
