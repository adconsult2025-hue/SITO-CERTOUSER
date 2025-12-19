const nav = document.querySelector('[data-nav]');
const toggle = document.querySelector('[data-nav-toggle]');
const header = document.querySelector('[data-header]');
const firstNavLink = nav ? nav.querySelector('a') : null;

const setMenuState = (open) => {
  if (!nav || !toggle) return;
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('menu-open', open);
  if (open && firstNavLink) {
    firstNavLink.focus();
  }
};

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.contains('is-open');
    setMenuState(!isOpen);
  });
}

if (nav) {
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuState(false));
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
    setMenuState(false);
  }
});

window.addEventListener('scroll', () => {
  if (!header) return;
  if (window.scrollY > 10) {
    header.classList.add('shadow');
  } else {
    header.classList.remove('shadow');
  }
});

// Hero background
const heroes = document.querySelectorAll('.hero[data-hero] .hero__media');
heroes.forEach((media) => {
  const section = media.closest('.hero');
  const src = section?.dataset.hero;
  if (src) {
    media.style.setProperty('--hero-image', `url('${src}')`);
    media.style.backgroundImage = `linear-gradient(180deg, rgba(5,5,5,0.55), rgba(5,5,5,0.45)), var(--hero-image)`;
  }
});

// Card media background
const medias = document.querySelectorAll('[data-media]');
medias.forEach((el) => {
  const src = el.dataset.media;
  if (src) {
    el.style.backgroundImage = `linear-gradient(180deg, rgba(5,5,5,0.35), rgba(5,5,5,0.5)), url('${src}')`;
  }
});
