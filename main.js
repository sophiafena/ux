const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const progressBetween = (value, start, end) => clamp((value - start) / (end - start), 0, 1);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const SITE_NAME = 'Sophia Lattermann';
const CATEGORIES = ['product', 'motion-graphic', 'art'];

// ---------- CURSOR BLOB ----------
const blob = document.getElementById('cursorBlob');

document.addEventListener('mousemove', (e) => {
  if (!finePointer.matches) return;
  // `translate`, not `transform`: the hover `scale` would otherwise scale the position too.
  blob.style.translate = `${e.clientX}px ${e.clientY}px`;
});

// Over a work card the blob grows a little so it shows through the glass.
document.addEventListener('pointerover', (e) => {
  blob.classList.toggle('is-boosted', Boolean(e.target.closest?.('.work-grid .project-card, .case-carousel .project-card')));
});

// ---------- HERO TEXT ANIMATION ----------
// Splits the name into letters and the tagline into words so CSS can stagger them.
(() => {
  const name = document.querySelector('.hero-name');
  name.setAttribute('aria-label', name.textContent.replace(/\s+/g, ' ').trim());
  let charIndex = 0;
  name.querySelectorAll('.hero-name-line > span').forEach(line => {
    const letters = Array.from(line.textContent.trim(), (letter, lineIndex) => {
      const char = document.createElement('span');
      char.className = 'char';
      char.textContent = letter;
      char.style.setProperty('--ci', charIndex++);
      char.style.setProperty('--ci-line', lineIndex);
      return char;
    });
    line.setAttribute('aria-hidden', 'true');
    line.replaceChildren(...letters);
  });

  const tagline = document.querySelector('.hero-tagline');
  const highlights = ['apps,', 'games', 'websites.', 'print', 'illustration.'];
  const words = tagline.textContent.trim().split(/\s+/).flatMap((text, index) => {
    const word = document.createElement('span');
    word.className = 'word' + (highlights.includes(text) ? ' is-highlight' : '');
    word.textContent = text;
    word.style.setProperty('--wi', index);
    return [word, document.createTextNode(' ')];
  });
  tagline.replaceChildren(...words);
})();

// ---------- MISSING MEDIA ----------
// Shows a placeholder instead of a broken image or video until the real file exists.
function showMediaPlaceholder(media) {
  if (media.classList.contains('is-missing')) return;
  media.classList.add('is-missing');
  media.removeAttribute('role');
  media.removeAttribute('tabindex');
  if (media.closest('.software-list')) return;

  const placeholder = document.createElement('div');
  placeholder.className = 'media-placeholder';
  placeholder.setAttribute('aria-hidden', 'true');
  media.after(placeholder);
}

function watchMedia(media) {
  media.addEventListener('error', () => showMediaPlaceholder(media));
  if (media.tagName === 'IMG' && media.complete && media.currentSrc && media.naturalWidth === 0) {
    showMediaPlaceholder(media);
  }
}

document.querySelectorAll('main img, main video').forEach(watchMedia);

// ---------- LIGHTBOX ----------
// Opens one image or a whole series (images, videos or an external link) with previous/next.
const lightbox = (() => {
  const dialog = document.querySelector('.image-lightbox');
  const stage = dialog.querySelector('.image-lightbox-stage');
  const image = dialog.querySelector('.image-lightbox-image');
  const video = dialog.querySelector('.image-lightbox-video');
  const link = dialog.querySelector('.image-lightbox-link');
  const caption = dialog.querySelector('.image-lightbox-caption');
  const counter = dialog.querySelector('.image-lightbox-counter');
  const closeButton = dialog.querySelector('.image-lightbox-close');
  const prevButton = dialog.querySelector('.image-lightbox-prev');
  const nextButton = dialog.querySelector('.image-lightbox-next');
  let items = [];
  let index = 0;

  function show(newIndex) {
    index = (newIndex + items.length) % items.length;
    const item = items[index];
    video.pause();
    stage.classList.remove('is-empty');
    image.hidden = item.type !== 'image';
    video.hidden = item.type !== 'video';
    link.hidden = item.type !== 'link';

    if (item.type === 'image') {
      image.src = item.src;
      image.alt = item.alt;
    } else if (item.type === 'video') {
      video.src = item.src;
      video.setAttribute('aria-label', item.alt);
    } else {
      link.href = item.src;
      link.firstChild.textContent = `${item.label || 'Watch on YouTube'} `;
    }
    caption.replaceChildren(item.caption ? item.caption.cloneNode(true) : document.createTextNode(item.alt));
    const isSeries = items.length > 1;
    prevButton.hidden = !isSeries;
    nextButton.hidden = !isSeries;
    counter.textContent = isSeries ? `${index + 1} / ${items.length}` : '';
  }

  function open(newItems, startIndex = 0) {
    if (!newItems.length) return;
    items = newItems;
    show(startIndex);
    if (!dialog.open) dialog.showModal();
    closeButton.focus();
  }

  image.addEventListener('error', () => {
    image.hidden = true;
    stage.classList.add('is-empty');
  });
  closeButton.addEventListener('click', () => dialog.close());
  prevButton.addEventListener('click', () => show(index - 1));
  nextButton.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('close', () => video.pause());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (items.length < 2) return;
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });

  return { open };
})();

function seriesItems(name) {
  const template = document.querySelector(`template[data-series="${name}"]`);
  if (!template) return [];
  return Array.from(template.content.querySelectorAll('figure'), figure => ({
    type: figure.dataset.type || 'image',
    src: figure.dataset.src,
    alt: figure.dataset.alt || '',
    label: figure.dataset.label,
    caption: figure.querySelector('figcaption'),
  }));
}

function imageItem(img) {
  const figcaption = img.closest('figure')?.querySelector('figcaption');
  return { type: 'image', src: img.currentSrc || img.src, alt: img.alt, caption: figcaption || null };
}

// Series cards and "Beyond the screen" images open their series.
// Delegated, so the series cards copied into the Home carousel (and its clones) open too.
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-series]:not(template)');
  if (!trigger) return;
  lightbox.open(seriesItems(trigger.dataset.series), Number(trigger.dataset.index || 0));
});

// ---------- CASE STUDIES ----------
// Every case study is a <template data-case> in index.html; cards and pages are built from it.
const cases = Array.from(document.querySelectorAll('template[data-case]'), template => ({
  template,
  slug: template.dataset.slug,
  title: template.dataset.title,
  discipline: template.dataset.discipline,
  categories: template.dataset.categories.split(' '),
  teaser: template.dataset.teaser,
  featuredLine: template.dataset.featuredLine,
  image: template.dataset.cardImage,
  imageAlt: template.dataset.cardAlt || '',
  video: template.dataset.cardVideo,
  layout: template.dataset.layout,
}));

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createCaseCard(item, line, index) {
  const card = createElement('a', `project-card case-card stagger-${(index % 4) + 1}`);
  card.href = `#/work/${item.slug}`;
  card.dataset.category = item.categories.join(' ');

  const media = createElement('div', 'case-card-media');
  let img = null;
  if (item.video && !reducedMotion.matches) {
    // Silent looping preview; purely decorative, the card itself is the link.
    // Attributes (not properties) so the carousel's cloned cards autoplay too.
    const video = document.createElement('video');
    for (const name of ['autoplay', 'muted', 'loop', 'playsinline']) video.setAttribute(name, '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('aria-hidden', 'true');
    video.muted = true;
    video.src = item.video;
    video.className = 'project-card-img case-card-video';
    media.append(video);
  } else {
    img = document.createElement('img');
    Object.assign(img, { src: item.image, alt: item.imageAlt, loading: 'lazy', width: 1600, height: 1200 });
    img.className = 'project-card-img';
    media.append(img);
  }

  const body = createElement('div', 'project-card-body');
  body.append(
    createElement('p', 'case-card-discipline', item.discipline),
    createElement('h3', '', item.title),
    createElement('p', '', line),
    createElement('span', 'case-card-link', 'More →'),
  );
  card.append(media, body);
  if (img) watchMedia(img);
  return card;
}

// Cards are ordered by the filter tabs (CATEGORIES), using each card's first category; stable within a tab.
function byCategory(cards) {
  const rank = card => CATEGORIES.indexOf(card.dataset.category.split(' ')[0]);
  return cards.sort((a, b) => rank(a) - rank(b));
}

const workGrid = document.querySelector('[data-case-cards]');
workGrid.prepend(...cases.map((item, index) => createCaseCard(item, item.teaser, index)));
workGrid.append(...byCategory(Array.from(workGrid.children)));
// Home carousel: every case study plus the series cards of the Work grid, in the same card layout.
function createSeriesCard(source, index) {
  // External cards (e.g. the artist portfolio) stay links; the others open their series.
  const isLink = source.tagName === 'A';
  const card = createElement(isLink ? 'a' : 'button', `project-card case-card stagger-${(index % 4) + 1}`);
  if (isLink) {
    Object.assign(card, { href: source.href, target: '_blank', rel: 'noopener' });
  } else {
    card.type = 'button';
    card.dataset.series = source.dataset.series;
  }
  card.dataset.category = source.dataset.category;
  const media = createElement('div', 'case-card-media');
  const img = source.querySelector('img').cloneNode();
  media.append(img);
  const body = createElement('div', 'project-card-body');
  body.append(
    createElement('p', 'case-card-discipline', source.querySelector('.case-card-discipline').textContent),
    createElement('h3', '', source.querySelector('.playground-title').textContent),
    createElement('p', '', source.querySelector('.playground-meta').textContent),
    createElement('span', 'case-card-link', isLink ? 'Visit ↗' : 'View →'),
  );
  card.append(media, body);
  watchMedia(img);
  return card;
}
document.querySelector('[data-featured-cards]').append(...byCategory([
  ...cases.map((item, index) => createCaseCard(item, item.featuredLine || item.teaser, index)),
  ...Array.from(document.querySelectorAll('.work-grid .series-card'), (source, index) => createSeriesCard(source, cases.length + index)),
]));

// ---------- SELECTED WORK CAROUSEL ----------
// Runs on its own (pauses on hover/focus), loops endlessly via cloned cards, and can be dragged.
// The row moves with a sub-pixel transform instead of scrollLeft, which browsers round to whole
// pixels and which made the slow autoplay stutter.
(() => {
  const track = document.querySelector('[data-featured-cards]');
  const prev = document.querySelector('[data-carousel-prev]');
  const next = document.querySelector('[data-carousel-next]');
  const originals = Array.from(track.children);
  const SPEED = 40; // px per second

  let position = 0;
  let loopWidth = 0;
  let hovering = false;
  let visible = false;
  let resumeAt = 0;
  let drag = null;
  let glide = null;
  let lastTime = performance.now();

  let shown = originals;
  // Only card videos that are on screen play; the rest wait, so the row stays smooth.
  const videoObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    });
  });

  function measure() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    loopWidth = shown.reduce((sum, card) => sum + card.offsetWidth + gap, 0);
  }

  // Shows the cards of one category (or all) and adds just enough cloned sets
  // to keep the row wider than the viewport plus one loop.
  function build(category) {
    track.querySelectorAll('[data-clone]').forEach(clone => {
      clone.querySelectorAll('video').forEach(video => videoObserver.unobserve(video));
      clone.remove();
    });
    originals.forEach(card => {
      card.hidden = category !== 'all' && !card.dataset.category.split(' ').includes(category);
    });
    shown = originals.filter(card => !card.hidden);
    if (!shown.length) return;
    measure();
    const sets = Math.max(2, Math.ceil((window.innerWidth + loopWidth) / loopWidth));
    for (let i = 0; i < sets; i++) {
      shown.forEach(card => {
        const clone = card.cloneNode(true);
        clone.dataset.clone = '';
        clone.setAttribute('aria-hidden', 'true');
        clone.tabIndex = -1;
        clone.classList.add('in-view');
        track.append(clone);
      });
    }
    track.querySelectorAll('video').forEach(video => videoObserver.observe(video));
    glide = null;
    setPosition(0);
  }

  document.querySelectorAll('[data-home-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-home-filter]').forEach(other => {
        other.setAttribute('aria-pressed', String(other === button));
      });
      build(button.dataset.homeFilter);
    });
  });
  function wrap(value) {
    if (!loopWidth) return value;
    return ((value % loopWidth) + loopWidth) % loopWidth;
  }
  function setPosition(value) {
    position = wrap(value);
    track.style.transform = `translate3d(${-position}px, 0, 0)`;
  }

  function tick(now) {
    const dt = Math.min(now - lastTime, 100) / 1000;
    lastTime = now;
    if (glide) {
      const t = Math.min((now - glide.start) / glide.duration, 1);
      setPosition(glide.from + (glide.to - glide.from) * easeInOut(t));
      if (t === 1) glide = null;
    } else {
      const paused = hovering || drag || !visible || now < resumeAt || reducedMotion.matches
        || track.contains(document.activeElement);
      if (!paused) setPosition(position + SPEED * dt);
    }
    requestAnimationFrame(tick);
  }

  // Horizontal trackpad scrolling moves the row; vertical scrolling stays with the page.
  track.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    glide = null;
    resumeAt = performance.now() + 1500;
    setPosition(position + event.deltaX);
  }, { passive: false });

  function step(direction) {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const distance = shown[0].offsetWidth + gap;
    // Unwrapped target, so the glide never jumps across the loop seam.
    const from = direction < 0 && position < distance ? position + loopWidth : position;
    resumeAt = performance.now() + 1500;
    if (reducedMotion.matches) { setPosition(from + direction * distance); return; }
    glide = { from, to: from + direction * distance, start: performance.now(), duration: 600 };
  }
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
  });
  // Tabbing to a card that sits outside the visible area brings it in.
  track.addEventListener('focusin', event => {
    const card = event.target.closest('.case-card');
    if (!card) return;
    const left = card.offsetLeft - shown[0].offsetLeft;
    const right = left + card.offsetWidth - (window.innerWidth - shown[0].offsetLeft * 2);
    if (left < position) setPosition(left);
    else if (right > position) setPosition(right);
  });

  track.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hovering = true; });
  track.addEventListener('pointerleave', () => { hovering = false; });

  // Drag with mouse, pen or finger; touch-action: pan-y keeps vertical page scrolling.
  track.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    glide = null;
    drag = { x: event.clientX, start: position, moved: false, id: event.pointerId };
  });
  track.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 5) {
      drag.moved = true;
      track.setPointerCapture(drag.id);
      track.classList.add('is-dragging');
    }
    if (drag.moved) setPosition(drag.start - dx);
  });
  function endDrag() {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    track.classList.remove('is-dragging');
    resumeAt = performance.now() + 800;
    // Swallow the click that follows a drag so it doesn't open a case study.
    if (moved) track.addEventListener('click', event => event.preventDefault(), { capture: true, once: true });
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('dragstart', event => event.preventDefault());

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(track);
  window.addEventListener('resize', () => { measure(); setPosition(position); });
  build('all');
  requestAnimationFrame(tick);
})();

// ---------- LOOPING VIDEOS ----------
// Autoplay videos always start from the first frame: on a fresh load, when the page comes back
// from the back/forward cache, and when a case study is opened again.
function restartVideo(video) {
  if (video.readyState >= 1) video.currentTime = 0;
  else video.addEventListener('loadedmetadata', () => { video.currentTime = 0; }, { once: true });
}
document.querySelectorAll('video[autoplay]').forEach(restartVideo);
window.addEventListener('pageshow', event => {
  if (event.persisted) document.querySelectorAll('video[autoplay]').forEach(restartVideo);
});

const caseRoot = document.querySelector('[data-case-root]');

function renderCase(item) {
  const content = item.template.content.cloneNode(true);

  const header = createElement('header', 'case-header');
  const back = createElement('a', 'case-back', '← Back to Work');
  back.href = '#/work';
  const title = createElement('h1', '', item.title);
  title.tabIndex = -1;
  header.append(back, createElement('p', 'case-discipline', item.discipline), title, createElement('p', 'case-teaser', item.teaser));
  const snapshot = content.querySelector('.snapshot');
  if (snapshot) header.append(snapshot);

  const next = cases[(cases.indexOf(item) + 1) % cases.length];
  const footer = createElement('nav', 'case-footer');
  footer.setAttribute('aria-label', 'More work');
  const nextLink = createElement('a', 'case-next');
  nextLink.href = `#/work/${next.slug}`;
  nextLink.append(createElement('span', 'case-next-label', 'Next project →'), createElement('span', 'case-next-title', next.title));
  const backButton = createElement('a', 'button button-ghost', 'Back to Work');
  backButton.href = '#/work';
  footer.append(nextLink, backButton);

  caseRoot.dataset.layout = item.layout;
  caseRoot.replaceChildren(header, content, footer);

  caseRoot.querySelectorAll('img, video').forEach(watchMedia);
  caseRoot.querySelectorAll('video[autoplay]').forEach(restartVideo);
  caseRoot.querySelectorAll('.case-gallery img, .case-hero img, .case-media img').forEach(img => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `View larger: ${img.alt}`);
  });
}

function openGalleryImage(img) {
  const group = img.closest('.case-gallery') || img.closest('figure');
  const images = Array.from(group.querySelectorAll('img:not(.is-missing)'));
  lightbox.open(images.map(imageItem), Math.max(images.indexOf(img), 0));
}

caseRoot.addEventListener('click', event => {
  const img = event.target.closest('img[role="button"]');
  if (img) openGalleryImage(img);
});
caseRoot.addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('img[role="button"]')) {
    event.preventDefault();
    openGalleryImage(event.target);
  }
});

// ---------- SCROLL ANIMATIONS ----------
const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      scrollObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

function observeElements(container) {
  container.querySelectorAll('.skill-card, .project-card, .reveal').forEach(el => {
    el.classList.remove('in-view');
    scrollObserver.observe(el);
  });
}

// ---------- WORK FILTERS ----------
// One filter for all work; the URL keeps the choice (#/work?filter=art).
const filterButtons = document.querySelectorAll('.project-filter');
const workCards = document.querySelectorAll('#page-work .project-card');
const filterStatus = document.querySelector('.filter-status');

function applyFilter(category) {
  const active = CATEGORIES.includes(category) ? category : 'all';
  filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === active)));

  let visibleCount = 0;
  workCards.forEach(card => {
    card.hidden = active !== 'all' && !card.dataset.category.split(' ').includes(active);
    if (!card.hidden) {
      visibleCount++;
      scrollObserver.observe(card);
    }
  });
  filterStatus.textContent = `${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} shown`;
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const isActive = button.getAttribute('aria-pressed') === 'true';
    const category = isActive && button.dataset.filter !== 'all' ? 'all' : button.dataset.filter;
    applyFilter(category);
    history.replaceState(null, '', category === 'all' ? '#/work' : `#/work?filter=${category}`);
  });
});

// ---------- ROUTING ----------
// #/ · #/work · #/work?filter=<category> · #/work/<slug> · #/about · #/impressum · #/datenschutz
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('[data-nav]');
const homePage = document.getElementById('page-home');
const LEGACY_ROUTES = { home: '/', projects: '/work', about: '/about' };
// Every route starts at the top; the browser must not restore an old scroll position.
history.scrollRestoration = 'manual';

function parseRoute(hash = window.location.hash) {
  let raw = hash.replace(/^#/, '');
  raw = LEGACY_ROUTES[raw] || raw;
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);

  if (!parts.length) return { page: 'home' };
  if (parts[0] === 'work' && parts[1]) {
    const item = cases.find(candidate => candidate.slug === parts[1]);
    return item ? { page: 'case', item } : { page: 'work' };
  }
  if (parts[0] === 'work') return { page: 'work', filter: params.get('filter') || 'all' };
  if (['about', 'impressum', 'datenschutz'].includes(parts[0])) return { page: parts[0] };
  return { page: 'home' };
}

function showRoute(route, { moveFocus = true } = {}) {
  const target = document.getElementById('page-' + route.page);
  const navKey = route.page === 'case' ? 'work' : route.page;

  if (route.page === 'case') renderCase(route.item);
  if (route.page === 'work') applyFilter(route.filter);

  pages.forEach(page => {
    page.classList.toggle('active', page === target);
    page.classList.remove('visible');
  });
  navLinks.forEach(link => {
    const isCurrent = link.dataset.nav === navKey;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  document.title = route.page === 'case' ? `${route.item.title} — ${SITE_NAME}` : target.dataset.title;
  window.scrollTo({ top: 0, behavior: 'instant' });

  requestAnimationFrame(() => {
    target.classList.add('visible');
    observeElements(target);
    heroParallax.refresh();
    window.dispatchEvent(new Event('scroll'));
    if (moveFocus) focusPage(target);
  });
}

// Moves focus to the page heading; falls back to the page itself while the heading is hidden (hero scroll state).
function focusPage(page) {
  const heading = page.querySelector('h1');
  heading?.focus({ preventScroll: true });
  if (document.activeElement !== heading) {
    page.tabIndex = -1;
    page.focus({ preventScroll: true });
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
  const href = link.getAttribute('href');

  if (href === '#main') {
    event.preventDefault();
    focusPage(document.querySelector('.page.active'));
  } else if (href.startsWith('#/')) {
    event.preventDefault();
    if (href !== window.location.hash) history.pushState(null, '', href);
    showRoute(parseRoute(href));
  } else if (href === '#') {
    // Placeholder links (TODO URLs) do nothing yet.
    event.preventDefault();
  }
});

window.addEventListener('popstate', () => showRoute(parseRoute()));

// ---------- HOME PARALLAX ----------
const heroParallax = (() => {
  const hero = document.querySelector('.hero');
  const stage = hero.querySelector('.hero-stage');
  const copy = hero.querySelector('.hero-copy');
  const nameLines = hero.querySelectorAll('.hero-name-line');
  const statement = hero.querySelector('.hero-statement');
  const scrollHint = hero.querySelector('.scroll-hint');

  const parsePoint = (value, fallback) => (value || fallback).trim().split(/\s+/).map(Number);

  const layers = Array.from(hero.querySelectorAll('.parallax-layer'), (el, index) => {
    const [fromX, fromY] = parsePoint(el.dataset.from, '50 50');
    const [toX, toY] = parsePoint(el.dataset.to, el.dataset.from || '50 50');
    el.style.left = fromX + '%';
    el.style.top = fromY + '%';
    el.style.setProperty('--i', index);

    return {
      el,
      fromX, fromY, toX, toY,
      depth: Number(el.dataset.depth || 0.3),
      rotate: Number(el.dataset.rotate || 0),
      scale: Number(el.dataset.scale || 1),
      avoids: !el.classList.contains('layer-fluid'),
      size: 0,
      avoidX: 0,
      avoidY: 0,
      waves: Array.from(el.querySelectorAll('[data-wave]'), (path, waveIndex) => ({
        path,
        vertical: path.dataset.wave !== 'horizontal',
        amplitude: Number(path.dataset.amplitude || 20),
        count: Number(path.dataset.waves || 3),
        seed: index * 1.3 + waveIndex,
      })),
      shapes: Array.from(el.querySelectorAll('[data-morph]'), (path, shapeIndex) => ({
        path,
        points: Number(path.dataset.points || 8),
        wobble: Number(path.dataset.wobble || 0.1),
        spikes: Number(path.dataset.spikes || 0),
        speed: Number(path.dataset.speed || 0.6),
        seed: index * 2.3 + shapeIndex * 1.1,
      })),
    };
  });

  const state = { progress: 0, mouseX: 0, mouseY: 0, targetMouseX: 0, targetMouseY: 0, pointerX: null, pointerY: null };
  // Shapes start dodging the cursor only once the intro animation has finished.
  let canAvoid = false;
  window.addEventListener('load', () => window.setTimeout(() => { canAvoid = true; }, 1800));
  let stageWidth = 0;
  let stageHeight = 0;
  let isVisible = true;
  let frameId = null;

  // Smooth closed blob through n points (Catmull-Rom converted to cubic Béziers).
  function morphPath(shape, time, progress) {
    const { points, wobble, spikes, speed, seed } = shape;
    const intensity = wobble * (1 + progress * 0.8);
    const coords = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
      let radius = 1
        + intensity * Math.sin(time * speed + seed + i * 1.7)
        + intensity * 0.6 * Math.sin(time * speed * 1.3 + seed * 2 + i * 2.9);
      if (i % 2) radius *= 1 - spikes * progress;
      radius *= 72;
      coords.push([100 + Math.cos(angle) * radius, 100 + Math.sin(angle) * radius]);
    }

    const at = i => coords[(i + points) % points];
    let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
    for (let i = 0; i < points; i++) {
      const [x0, y0] = at(i - 1);
      const [x1, y1] = at(i);
      const [x2, y2] = at(i + 1);
      const [x3, y3] = at(i + 2);
      d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)}`
        + ` ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)}`
        + ` ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    return d + 'Z';
  }

  // Rounded squiggle line whose waves travel slowly along it.
  function wavePath(wave, time) {
    const { vertical, amplitude, count, seed } = wave;
    const steps = 40;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const along = 30 + t * 140;
      const across = 100 + Math.sin(t * Math.PI * 2 * count + time * 2 + seed) * amplitude * Math.sin(Math.PI * t * 0.8 + 0.3);
      const [x, y] = vertical ? [across, along] : [along, across];
      d += `${i ? ' L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  // Pushes a layer away from the cursor when it comes close.
  function updateAvoidance(layer, baseX, baseY) {
    let targetX = 0;
    let targetY = 0;
    if (canAvoid && layer.avoids && state.pointerX !== null) {
      const centerX = layer.fromX / 100 * stageWidth + baseX;
      const centerY = layer.fromY / 100 * stageHeight + baseY;
      const dx = centerX - state.pointerX;
      const dy = centerY - state.pointerY;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = layer.size / 2 + 140;
      if (distance < reach) {
        const strength = Math.pow(1 - distance / reach, 1.5) * (layer.size * 0.35 + 90);
        targetX = dx / distance * strength;
        targetY = dy / distance * strength;
      }
    }
    layer.avoidX += (targetX - layer.avoidX) * 0.08;
    layer.avoidY += (targetY - layer.avoidY) * 0.08;
  }

  function readScrollProgress() {
    const distance = hero.offsetHeight - window.innerHeight;
    if (distance <= 0) return 0;
    return clamp(-hero.getBoundingClientRect().top / distance, 0, 1);
  }

  function render(time, progress) {
    const eased = easeInOut(progress);

    layers.forEach(layer => {
      const x = (layer.toX - layer.fromX) / 100 * stageWidth * eased + state.mouseX * layer.depth * 60;
      const y = (layer.toY - layer.fromY) / 100 * stageHeight * eased
        - progress * layer.depth * stageHeight * 0.35
        + state.mouseY * layer.depth * 60;
      updateAvoidance(layer, x, y);
      const rotate = layer.rotate * eased + layer.avoidX * 0.08;
      const scale = 1 + (layer.scale - 1) * eased;
      layer.el.style.transform = `translate3d(${(x + layer.avoidX).toFixed(1)}px, ${(y + layer.avoidY).toFixed(1)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      layer.shapes.forEach(shape => shape.path.setAttribute('d', morphPath(shape, time, progress)));
      layer.waves.forEach(wave => wave.path.setAttribute('d', wavePath(wave, time)));
    });

    const copyFade = progressBetween(progress, 0.08, 0.4);
    copy.style.opacity = String(1 - copyFade);
    copy.style.translate = `0 ${(-progress * 22).toFixed(2)}vh`;
    copy.style.visibility = copyFade > 0.98 ? 'hidden' : '';
    const spread = progressBetween(progress, 0, 0.45) * 14;
    nameLines[0].style.translate = `${-spread}vw 0`;
    nameLines[1].style.translate = `${spread}vw 0`;

    const statementIn = progressBetween(progress, 0.42, 0.68);
    statement.style.opacity = String(statementIn);
    statement.style.translate = `0 ${((1 - statementIn) * 48).toFixed(1)}px`;

    scrollHint.style.opacity = String(1 - progressBetween(progress, 0, 0.08));
  }

  function tick(now) {
    const target = readScrollProgress();
    state.progress += (target - state.progress) * 0.12;
    if (Math.abs(target - state.progress) < 0.0005) state.progress = target;
    state.mouseX += (state.targetMouseX - state.mouseX) * 0.06;
    state.mouseY += (state.targetMouseY - state.mouseY) * 0.06;

    render(now / 1000, state.progress);
    frameId = requestAnimationFrame(tick);
  }

  function shouldAnimate() {
    return isVisible && !document.hidden && !reducedMotion.matches && homePage.classList.contains('active');
  }

  function update() {
    if (shouldAnimate()) {
      if (frameId === null) frameId = requestAnimationFrame(tick);
    } else {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      if (reducedMotion.matches) render(0, 0);
    }
  }

  function refresh() {
    stageWidth = stage.clientWidth;
    stageHeight = stage.clientHeight;
    layers.forEach(layer => { layer.size = layer.el.offsetWidth; });
    update();
  }

  new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    update();
  }).observe(hero);

  window.addEventListener('mousemove', (e) => {
    if (!finePointer.matches) return;
    state.targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    state.targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    const rect = stage.getBoundingClientRect();
    state.pointerX = e.clientX - rect.left;
    state.pointerY = e.clientY - rect.top;
  });
  document.addEventListener('mouseleave', () => { state.pointerX = null; });
  window.addEventListener('resize', refresh);
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);

  render(0, 0);
  return { refresh };
})();

// ---------- GRADIENT ORBS ----------
// Each .orb gets four soft colour ellipses that drift slowly; the shared #orbGrain filter
// blends them into one grainy gradient that dissolves at the edges.
(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // [cx, cy, rx, ry]: outer glow, body, warm zone, hot core
  const layout = [[86, 80, 62, 56], [104, 104, 50, 46], [124, 138, 36, 32], [130, 154, 22, 20]];

  const items = Array.from(document.querySelectorAll('.orb'), (orb, index) => {
    const colors = (orb.dataset.colors || '#63dcff #4a6cff #ff9a3d #ff4b3a').trim().split(/\s+/);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('filter', 'url(#orbGrain)');
    const ellipses = layout.map(([cx, cy, rx, ry], i) => {
      const ellipse = document.createElementNS(SVG_NS, 'ellipse');
      ellipse.setAttribute('fill', colors[i % colors.length]);
      group.append(ellipse);
      return { ellipse, cx, cy, rx, ry };
    });
    svg.append(group);
    orb.append(svg);
    return { orb, ellipses, seed: index * 1.9, visible: false };
  });

  function draw(item, time) {
    item.ellipses.forEach((shape, i) => {
      const angle = time * 0.45 + item.seed + i * 1.7;
      shape.ellipse.setAttribute('cx', (shape.cx + Math.sin(angle) * 11).toFixed(1));
      shape.ellipse.setAttribute('cy', (shape.cy + Math.cos(angle * 0.8) * 9).toFixed(1));
      shape.ellipse.setAttribute('rx', (shape.rx * (1 + 0.08 * Math.sin(angle * 1.3))).toFixed(1));
      shape.ellipse.setAttribute('ry', (shape.ry * (1 + 0.08 * Math.cos(angle * 1.1))).toFixed(1));
    });
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const item = items.find(candidate => candidate.orb === entry.target);
      item.visible = entry.isIntersecting;
    });
  });
  items.forEach(item => {
    draw(item, 0);
    observer.observe(item.orb);
  });

  function loop(now) {
    if (!reducedMotion.matches && !document.hidden) {
      items.forEach(item => { if (item.visible) draw(item, now / 1000); });
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

// ---------- PITCH SLIDES ----------
(() => {
  const pitch = document.querySelector('.pitch');
  const movers = pitch.querySelectorAll('[data-speed]');
  const progress = pitch.querySelector('.pitch-progress');
  const progressButtons = progress.querySelectorAll('button');
  let ticking = false;

  // Each layer moves with its own speed relative to its slide (progress: -1 below, 0 centred, 1 above).
  const layers = Array.from(movers, el => ({
    el,
    slide: el.closest('.pitch-slide'),
    speed: Number(el.dataset.speed || 0),
    shiftX: Number(el.dataset.shiftX || 0),
    tilt: Number(el.dataset.tilt || 0),
    zoom: Number(el.dataset.zoom || 0),
  }));

  function updateParallax() {
    ticking = false;
    if (reducedMotion.matches || !homePage.classList.contains('active')) return;
    const viewport = window.innerHeight;
    layers.forEach(layer => {
      const rect = layer.slide.getBoundingClientRect();
      const progress = clamp((viewport / 2 - (rect.top + rect.height / 2)) / viewport, -1.2, 1.2);
      const y = -progress * viewport * layer.speed;
      const x = progress * layer.shiftX;
      layer.el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      if (layer.tilt) layer.el.style.rotate = `${(progress * layer.tilt).toFixed(2)}deg`;
      if (layer.zoom) layer.el.style.scale = (1 - Math.abs(progress) * layer.zoom).toFixed(3);
    });
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });
  updateParallax();

  const slideObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      progressButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.target === entry.target.id);
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  pitch.querySelectorAll('.pitch-slide').forEach(slide => slideObserver.observe(slide));

  new IntersectionObserver(([entry]) => {
    progress.classList.toggle('is-visible', entry.isIntersecting);
  }, { rootMargin: '-40% 0px -40% 0px' }).observe(pitch);

  progressButtons.forEach(button => {
    button.addEventListener('click', () => {
      document.getElementById(button.dataset.target)
        .scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
  });
})();

// ---------- INITIAL PAGE ----------
showRoute(parseRoute(), { moveFocus: false });
