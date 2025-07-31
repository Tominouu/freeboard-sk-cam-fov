let overlayVisible = true;

function toggleOverlayVisibility() {
  const overlay = document.getElementById("fov-overlay");
  if (overlay) {
    overlay.style.display = overlayVisible ? "none" : "block";
    toggleBtn.innerHTML = overlayVisible ? showIcon + " Afficher FOV" : hideIcon + " Cacher FOV";
    overlayVisible = !overlayVisible;
  }
}

const showIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="vertical-align:middle;margin-right:6px;" viewBox="0 0 16 16"><path d="M8 3.5a5 5 0 1 0 0 9a5 5 0 0 0 0-9zM0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3a3 3 0 1 1 0-6a3 3 0 0 1 0 6z"/></svg>`;
const hideIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" style="vertical-align:middle;margin-right:6px;" viewBox="0 0 16 16"><path d="M13.359 11.238C14.269 10.237 15 8.889 15 8s-.731-2.237-1.641-3.238C12.387 3.675 10.498 2.5 8 2.5c-1.227 0-2.358.248-3.352.687l1.538 1.539A5.98 5.98 0 0 1 8 4.5c2.498 0 4.387 1.175 5.359 2.262C14.269 7.763 15 9.111 15 10s-.731 2.237-1.641 3.238l-1.538-1.538a6.005 6.005 0 0 0 1.538-1.462zM2.146 1.146a.5.5 0 0 1 .708 0l12 12a.5.5 0 0 1-.708.708l-1.27-1.27A7.962 7.962 0 0 1 8 13.5c-2.498 0-4.387-1.175-5.359-2.262C1.731 10.237 1 8.889 1 8c0-.857.676-2.145 1.76-3.2L1.146 1.854a.5.5 0 0 1 0-.708z"/></svg>`;

function createToggleButton() {
  if (document.getElementById("fov-toggle-btn")) return;

  const btn = document.createElement("button");
  btn.id = "fov-toggle-btn";
  btn.innerHTML = hideIcon + " Cacher FOV";

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "10000",
    padding: "10px 14px",
    background: "#2c3e50",
    color: "#ecf0f1",
    border: "none",
    borderRadius: "6px",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
    cursor: "pointer",
    fontSize: "14px",
    fontFamily: "sans-serif",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    opacity: "0.9",
    transition: "opacity 0.3s ease",
  });

  btn.addEventListener("mouseenter", () => btn.style.opacity = "1");
  btn.addEventListener("mouseleave", () => btn.style.opacity = "0.9");
  btn.addEventListener("click", toggleOverlayVisibility);

  document.body.appendChild(btn);
  window.toggleBtn = btn;
}

(function waitForOverlayAndInjectToggle() {
  const check = setInterval(() => {
    const overlay = document.getElementById("fov-overlay");
    if (overlay) {
      clearInterval(check);
      createToggleButton();
    }
  }, 300);
})();
