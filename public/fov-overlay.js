console.log("[FOV OVERLAY] Initialisation avec WebSocket dynamique...");

let overlay = null;
let mapCanvas = null;
let latestBearing = 0; // Valeur par défaut
let connected = false;

function findMapCanvas() {
  const canvas = document.querySelector("canvas");
  return canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0 ? canvas : null;
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
  const radius = 500; // Longueur du cône en pixels

  // 0° = droite → pour tourner à partir du haut, on décale de -90°
  const angleRad = (angleDeg - 90) * Math.PI / 180;
  const halfFovRad = (fovDeg / 2) * Math.PI / 180;

  const x1 = centerX + radius * Math.cos(angleRad - halfFovRad);
  const y1 = centerY + radius * Math.sin(angleRad - halfFovRad);
  const x2 = centerX + radius * Math.cos(angleRad + halfFovRad);
  const y2 = centerY + radius * Math.sin(angleRad + halfFovRad);

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

    drawFOV(latestBearing); // Mise à jour du FOV avec la dernière valeur reçue
  }, 100); // Rafraîchissement 10x/seconde
}

function connectWebSocket() {
  const ws = new WebSocket("ws://localhost:8765");

  ws.addEventListener("open", () => {
    console.log("[FOV WS] Connexion WebSocket établie ✅");
    connected = true;
  });

  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if ("rel_bearing" in data) {
        latestBearing = data.rel_bearing; // Affectation dynamique
        console.log("[FOV WS] Bearing reçu :", latestBearing.toFixed(2));
      }
    } catch (e) {
      console.warn("[FOV WS] Erreur JSON:", e);
    }
  });

  ws.addEventListener("close", () => {
    console.warn("[FOV WS] Déconnexion WebSocket ❌");
    connected = false;
    // Reconnexion automatique après 1s
    setTimeout(connectWebSocket, 1000);
  });

  ws.addEventListener("error", (e) => {
    console.error("[FOV WS] Erreur WebSocket:", e);
  });
}

(function init() {
  const check = setInterval(() => {
    const canvas = findMapCanvas();
    if (canvas) {
      clearInterval(check);
      mapCanvas = canvas;
      createOverlay();
      maintainOverlay();
      connectWebSocket(); // Connexion au flux en temps réel
    }
  }, 500);
})();
