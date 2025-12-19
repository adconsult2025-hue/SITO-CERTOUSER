const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
const sidebarClose = document.querySelector('[data-sidebar-close]');
const sidebarBackdrop = document.querySelector('[data-sidebar-backdrop]');
const sidebarDrawer = document.getElementById('sidebarDrawer');
const firstDrawerLink = sidebarDrawer ? sidebarDrawer.querySelector('a') : null;

const setSidebarState = (open) => {
  if (!sidebarDrawer || !sidebarToggle || !sidebarBackdrop) return;
  document.body.classList.toggle('sidebar-open', open);
  sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  sidebarDrawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (open && firstDrawerLink) {
    firstDrawerLink.focus();
  }
};

if (sidebarToggle && sidebarDrawer && sidebarBackdrop) {
  sidebarToggle.addEventListener('click', () => {
    const isOpen = document.body.classList.contains('sidebar-open');
    setSidebarState(!isOpen);
  });
}

[sidebarClose, sidebarBackdrop].forEach((el) => {
  el?.addEventListener('click', () => setSidebarState(false));
});

if (sidebarDrawer) {
  sidebarDrawer.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setSidebarState(false));
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
    setSidebarState(false);
  }
});

setSidebarState(false);

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
