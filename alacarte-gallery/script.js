(() => {
  const filters = document.querySelectorAll(".filter");
  const shots = document.querySelectorAll(".shot");
  const lightbox = document.getElementById("lightbox");
  const lbImg = lightbox.querySelector("img");
  const lbCap = lightbox.querySelector(".lightbox__cap");
  const closeBtn = lightbox.querySelector(".lightbox__close");

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      filters.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const key = btn.dataset.filter;
      shots.forEach((shot) => {
        const show = key === "all" || shot.dataset.cat === key;
        shot.classList.toggle("is-hidden", !show);
      });
    });
  });

  shots.forEach((shot) => {
    shot.addEventListener("click", () => {
      const img = shot.querySelector("img");
      const cap = shot.querySelector("figcaption");
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
      lbCap.textContent = cap ? cap.textContent : "";
      lightbox.showModal();
    });
  });

  const close = () => lightbox.close();
  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.open) close();
  });
})();
