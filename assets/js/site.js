const header = document.querySelector('[data-header]');
const mobileMenu = document.getElementById('mobileMenu');
const mobileBackdrop = document.querySelector('[data-menu-backdrop]');
const mobileToggle = document.querySelector('[data-menu-toggle]');
const mobileClose = document.querySelector('[data-menu-close]');
const firstMobileLink = mobileMenu ? mobileMenu.querySelector('a') : null;

const setMobileMenuState = (open) => {
  if (!mobileMenu || !mobileToggle || !mobileBackdrop) return;
  mobileMenu.classList.toggle('is-open', open);
  mobileBackdrop.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open && firstMobileLink) {
    firstMobileLink.focus();
  }
};

if (mobileToggle && mobileMenu && mobileBackdrop) {
  mobileToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('is-open');
    setMobileMenuState(!isOpen);
  });
}

[mobileClose, mobileBackdrop].forEach((el) => {
  el?.addEventListener('click', () => setMobileMenuState(false));
});

if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMobileMenuState(false));
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu?.classList.contains('is-open')) {
    setMobileMenuState(false);
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
