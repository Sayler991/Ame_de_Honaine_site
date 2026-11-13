(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#menu-principal");
  const toast = document.querySelector("#toast");
  const lightbox = document.querySelector("#lightbox");
  const form = document.querySelector("#form-reservation");

  const PLACEHOLDER_MSG =
    "Numéro provisoire : 0X XX XX XX XX — à confirmer. Aucun appel ni message n'est lancé.";

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      toggle.querySelector(".sr-only").textContent = open ? "Ouvrir le menu" : "Fermer le menu";
    });
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        toggle.querySelector(".sr-only").textContent = "Ouvrir le menu";
      });
    });
  }

  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 5000);
  };

  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast(PLACEHOLDER_MSG);
    });
  });

  document.querySelectorAll(".menu-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.cat;
      document.querySelectorAll(".menu-tabs button").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll(".menu-card").forEach((card) => {
        card.hidden = cat !== "all" && card.dataset.cat !== cat;
      });
    });
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const status = form.querySelector(".form-status");
      const name = form.nom.value.trim();
      const phone = form.telephone.value.trim();
      if (!name || !phone) {
        if (status) status.textContent = "Merci d'indiquer au moins un nom et un téléphone.";
        return;
      }
      if (status) {
        status.textContent =
          "Maquette : la demande n'a pas été envoyée. Quand le site sera en ligne, elle arrivera au restaurant.";
      }
      form.reset();
      form.personnes.value = "2";
    });
  }

  if (lightbox) {
    const img = lightbox.querySelector("img");
    const cap = lightbox.querySelector(".lightbox-caption");
    const close = () => {
      lightbox.hidden = true;
      img.removeAttribute("src");
    };
    document.querySelectorAll(".gallery-item").forEach((item) => {
      item.tabIndex = 0;
      const open = () => {
        img.src = item.dataset.full || item.querySelector("img").src;
        img.alt = item.querySelector("img").alt;
        cap.textContent = item.querySelector("figcaption")?.textContent || "";
        lightbox.hidden = false;
      };
      item.addEventListener("click", open);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
    lightbox.querySelector(".lightbox-close").addEventListener("click", close);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) close();
    });
  }

  const io = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      )
    : null;

  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.animationDelay = `${(i % 6) * 0.07}s`;
    if (io) io.observe(el);
    else el.classList.add("is-in");
  });
})();
