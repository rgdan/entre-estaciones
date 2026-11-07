(() => {
  let preference;
  try {
    preference = localStorage.getItem("entre-estaciones-theme");
  } catch {}
  const dark = preference
    ? preference === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  function apply(isDark) {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDark ? "#111c27" : "#f3f4ef");
    const toggle = document.querySelector(".theme-toggle");
    if (toggle) {
      toggle.textContent = isDark ? "Modo claro" : "Modo oscuro";
      toggle.setAttribute("aria-pressed", String(isDark));
    }
  }
  apply(dark);
  document.addEventListener("DOMContentLoaded", () => {
    apply(dark);
    document.querySelector(".theme-toggle")?.addEventListener("click", () => {
      const isDark = document.documentElement.dataset.theme !== "dark";
      apply(isDark);
      try {
        localStorage.setItem(
          "entre-estaciones-theme",
          isDark ? "dark" : "light",
        );
      } catch {}
    });
  });
})();
