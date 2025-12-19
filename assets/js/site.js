const nav = document.querySelector('.nav');
const toggle = document.querySelector('.menu-toggle');
const links = document.querySelectorAll('.nav a');
const header = document.querySelector('.site-header');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

links.forEach((link) => {
  link.addEventListener('click', () => {
    if (nav.classList.contains('open')) {
      nav.classList.remove('open');
    }
  });
});

window.addEventListener('scroll', () => {
  if (!header) return;
  if (window.scrollY > 10) {
    header.classList.add('shadow');
  } else {
    header.classList.remove('shadow');
  }
});
