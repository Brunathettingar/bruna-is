export function initMobileNav() {
  const toggle = document.querySelector(".site-header__toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}
