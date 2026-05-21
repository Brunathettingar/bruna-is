// Accessible hamburger menu toggle — vanilla ES module.
// Handles: click toggle, Escape close (returns focus to toggle), link-click close.
//
// Accepts { signal } from main.js so document/window listeners are killed
// atomically on each Swup page swap — without this the keydown listener
// would accumulate across navigations.

export function initMobileNav({ signal } = {}) {
  const toggle = document.querySelector(".site-header__toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  const close = ({ restoreFocus = false } = {}) => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.style.overflow = isOpen ? "hidden" : "";
  }, { signal });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      close({ restoreFocus: true });
    }
  }, { signal });

  // Delegate link clicks so dynamically rendered links still close the drawer.
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  }, { signal });
}
