
// Gestion des popups services
document.querySelectorAll(".service-card").forEach(card => {
  card.addEventListener("click", () => {
    const popupId = card.getAttribute("data-popup");
    const popupOverlay = document.getElementById(popupId);
    popupOverlay.style.display = "flex";
  });
});

document.querySelectorAll(".popup-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target.classList.contains("popup-overlay") || e.target.classList.contains("close-btn")) {
      overlay.style.display = "none";
    }
  });
});

// Gestion des popups services
document.querySelectorAll(".service-card").forEach(card => {
  card.addEventListener("click", () => {
    const popupId = card.getAttribute("data-popup");
    const popupOverlay = document.getElementById(popupId);
    popupOverlay.style.display = "flex";
  });
});

document.querySelectorAll(".popup-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target.classList.contains("popup-overlay") || e.target.classList.contains("close-btn")) {
      overlay.style.display = "none";
    }
  });
});
