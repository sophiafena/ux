// ---------- CURSOR BLOB ----------
const blob = document.getElementById('cursorBlob');
blob.style.left = window.innerWidth / 2 + 'px';
blob.style.top = window.innerHeight / 2 + 'px';

document.addEventListener('mousemove', (e) => {
  blob.style.left = e.clientX + 'px';
  blob.style.top = e.clientY + 'px';
});

// ---------- PILL NAVIGATION ----------
const navLinks = document.querySelectorAll('.nav-pill a');
const pages = document.querySelectorAll('.page');

function showPage(pageId) {
  pages.forEach(p => p.classList.remove('active', 'visible'));
  navLinks.forEach(l => l.classList.remove('active'));

  const target = document.getElementById('page-' + pageId);
  const link = document.querySelector(`.nav-pill a[data-page="${pageId}"]`);

  target.classList.add('active');
  link.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  requestAnimationFrame(() => {
    target.classList.add('visible');
    observeElements(target);
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showPage(link.dataset.page);
  });
});

// ---------- PROJECT FILTERS ----------
const projectFilters = document.querySelectorAll('.project-filter');
const projectCards = document.querySelectorAll('#page-projects .project-card');

projectFilters.forEach(button => {
  button.addEventListener('click', () => {
    const isActive = button.getAttribute('aria-pressed') === 'true';
    const selectedCategory = isActive ? '' : button.dataset.projectFilter;

    projectFilters.forEach(filter => {
      filter.setAttribute('aria-pressed', String(filter === button && !isActive));
    });

    projectCards.forEach(card => {
      card.hidden = selectedCategory !== '' && card.dataset.category !== selectedCategory;
    });
  });
});

// ---------- SCROLL ANIMATIONS ----------
const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' };
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      scrollObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

function observeElements(container) {
  const els = container.querySelectorAll('.skill-card, .project-card');
  els.forEach(el => {
    el.classList.remove('in-view');
    scrollObserver.observe(el);
  });
}

// Initial page
const homePage = document.getElementById('page-home');
homePage.classList.add('visible');
observeElements(homePage);

// ---------- CAROUSEL DRAG-TO-SCROLL ----------
document.querySelectorAll('.carousel-track-wrapper').forEach(wrapper => {
  const track = wrapper.querySelector('.carousel-track');
  let isDown = false;
  let startX, scrollStart;

  wrapper.addEventListener('mousedown', (e) => {
    isDown = true;
    wrapper.classList.add('grabbing');
    startX = e.pageX;
    scrollStart = wrapper.scrollLeft;
  });

  wrapper.addEventListener('mouseleave', () => {
    isDown = false;
    wrapper.classList.remove('grabbing');
  });

  wrapper.addEventListener('mouseup', () => {
    isDown = false;
    wrapper.classList.remove('grabbing');
  });

  wrapper.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = (x - startX) * 1.8;
    wrapper.scrollLeft = scrollStart - walk;
  });

  // Touch support
  let touchStartX;
  wrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].pageX;
    scrollStart = wrapper.scrollLeft;
  }, { passive: true });

  wrapper.addEventListener('touchmove', (e) => {
    const x = e.touches[0].pageX;
    const walk = (x - touchStartX) * 1.5;
    wrapper.scrollLeft = scrollStart - walk;
  }, { passive: true });

  // Allow native horizontal scroll via mouse wheel
  wrapper.style.overflowX = 'auto';
  wrapper.style.scrollbarWidth = 'none';       // Firefox
  wrapper.style.msOverflowStyle = 'none';      // IE/Edge
  // Webkit scrollbar hidden via CSS pseudo-element won't work in JS,
  // but the wrapper already hides overflow visually.

  // Scroll horizontally with mouse wheel
  wrapper.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      wrapper.scrollLeft += e.deltaY;
    }
  }, { passive: false });
});
