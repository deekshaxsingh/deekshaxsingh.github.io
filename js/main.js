// Small interactions for the portfolio. No libraries.

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // --- Every visitor gets a custom "You" cursor (mouse users only) ----------
  const you = document.querySelector('.you-cursor');
  if (you && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.documentElement.classList.add('has-custom-cursor');
    let x = -100, y = -100, raf = 0;
    const paint = () => {
      you.style.transform = `translate(${x - 1}px, ${y - 2}px)`;   // arrow tip sits on the pointer
      raf = 0;
    };
    window.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      you.classList.add('is-visible');
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    // some things rename the cursor while you point at them (data-cursor="…")
    const youTag = you.querySelector('.cursor__tag');
    document.addEventListener('pointerover', (e) => {
      const hint = e.target.closest && e.target.closest('[data-cursor]');
      youTag.textContent = hint ? hint.dataset.cursor : 'You';
      you.classList.toggle('is-muted', !!hint && hint.dataset.cursorTone === 'muted');   // grey for "coming soon"
    });
    window.addEventListener('pointerdown', () => you.classList.add('is-pressing'));
    window.addEventListener('pointerup', () => you.classList.remove('is-pressing'));
    document.documentElement.addEventListener('pointerleave', () => you.classList.remove('is-visible'));
  }

  // --- Footer clock: Deeksha's local time ------------------------------------
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    const tick = () => { clock.textContent = fmt.format(new Date()).toUpperCase(); };
    tick();
    setInterval(tick, 30000);
  }

  // --- Carousels and marquee rows: duplicate the items for a seamless loop --
  document.querySelectorAll('.carousel__track, .marquee__track').forEach((track) => {
    if (reduceMotion) return;
    [...track.children].forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  // --- Work reels play only while their card is on screen ---------------------
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('is-playing', en.isIntersecting));
    }, { threshold: 0.25 });
    document.querySelectorAll('.work-grid .shot__frame').forEach((f) => io.observe(f));
  }

  // --- "Say hello" copies the email address instead of opening a mail app --
  // (the mailto: link stays as the fallback if copying isn't allowed)
  document.querySelectorAll('[data-copy-email]').forEach((btn) => {
    const label = btn.textContent;
    let timer = 0;
    btn.addEventListener('click', async (e) => {
      const email = btn.dataset.copyEmail;
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        return;   // let the mailto: link open instead
      }
      e.preventDefault();
      btn.textContent = 'Email copied ✓';
      btn.classList.add('is-copied');
      btn.setAttribute('aria-label', `Copied ${email}`);
      clearTimeout(timer);
      timer = setTimeout(() => {
        btn.textContent = label;
        btn.classList.remove('is-copied');
        btn.removeAttribute('aria-label');
      }, 2200);
    });
  });

  // --- Links still waiting for a real URL shouldn't jump to the top --------
  document.querySelectorAll('a[data-todo][href="#"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  // --- Pages without the hero canvas (case studies) ---------------------------
  // Same rulers as the homepage, Figma handles on image frames, and a contents
  // rail that marks the section you're reading.
  function pageChrome() {
    document.querySelectorAll('.cs-shot .shot__frame').forEach((frame) => {
      ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br'].forEach((p) => {
        const h = document.createElement('i');
        h.className = `h h--${p}`;
        frame.appendChild(h);
      });
    });

    const top = document.querySelector('.ruler--top');
    const left = document.querySelector('.ruler--left');
    if (top && left) {
      const css = (name, fallback) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback;
      const bandTop = top.querySelector('.ruler__band');
      const bandLeft = left.querySelector('.ruler__band');
      const num = (ruler, v, axis, at) => {
        const n = document.createElement('span');
        n.className = 'ruler__num';
        n.textContent = v;
        n.style[axis] = `${at}px`;
        ruler.appendChild(n);
      };
      let target = null, raf = 0;
      const paint = () => {
        raf = 0;
        top.querySelectorAll('.ruler__num').forEach((n) => n.remove());
        for (let v = 100; v < top.offsetWidth; v += 100) num(top, v, 'left', v);
        const y = Math.round(window.scrollY);
        left.style.setProperty('--ruler-y0', `${-(y % 100)}px`);
        left.querySelectorAll('.ruler__num').forEach((n) => n.remove());
        for (let v = Math.max(100, Math.ceil(y / 100) * 100); v - y < left.offsetHeight; v += 100) num(left, v, 'top', v - y);
        if (!target) { bandTop.style.opacity = 0; bandLeft.style.opacity = 0; return; }
        const r = target.getBoundingClientRect();
        const rs = css('--ruler-size', 20);
        bandTop.style.opacity = 1;
        bandLeft.style.opacity = 1;
        bandTop.style.left = `${r.left - rs}px`;
        bandTop.style.width = `${r.width}px`;
        bandLeft.style.top = `${r.top - css('--topbar-h', 56) - rs}px`;
        bandLeft.style.height = `${r.height}px`;
      };
      const later = () => { if (!raf) raf = requestAnimationFrame(paint); };
      document.querySelectorAll('.shot__frame').forEach((frame) => {
        frame.addEventListener('mouseenter', () => { target = frame; later(); });
        frame.addEventListener('mouseleave', () => { target = null; later(); });
      });
      window.addEventListener('scroll', later, { passive: true });
      window.addEventListener('resize', later);
      paint();
    }

    const links = [...document.querySelectorAll('.cs-toc a[href^="#"]')];
    if (links.length) {
      const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
      let raf = 0;
      const mark = () => {
        raf = 0;
        let current = sections[0];
        sections.forEach((s) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) current = s; });
        links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + current.id));
      };
      window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(mark); }, { passive: true });
      mark();
    }
  }

  // --- About photo: a crop that opens up as the photo scrolls into view ------
  // A crop box starts inset on a dimmed, slightly zoomed photo (with a thirds
  // grid) and grows to the frame edges; "Crop · W × H" reports the box's size.
  const crop = document.querySelector('.about2__frame');
  const cropBox = crop && crop.querySelector('.crop-box');
  const cropOut = document.querySelector('[data-crop]');
  const CROP_START = { t: 18, r: 14, b: 8, l: 14 };          // % inset at the start
  const paintCrop = () => {
    if (!crop) return;
    const r = crop.getBoundingClientRect();
    const vh = window.innerHeight;
    // from "top of the photo just entering" to "photo at its resting spot under the rulers"
    const start = vh * 0.92, end = 150;
    const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (start - r.top) / (start - end)));
    const e = p * p * (3 - 2 * p);                           // ease in-out: stays inset long enough to see
    const left = 1 - e;
    crop.style.setProperty('--ct', `${CROP_START.t * left}%`);
    crop.style.setProperty('--cr', `${CROP_START.r * left}%`);
    crop.style.setProperty('--cb', `${CROP_START.b * left}%`);
    crop.style.setProperty('--cl', `${CROP_START.l * left}%`);
    crop.style.setProperty('--cdim', (0.35 * left).toFixed(3));
    crop.style.setProperty('--cblur', `${(14 * left).toFixed(2)}px`);   // strong blur outside the box
    crop.style.setProperty('--cgrid', Math.min(1, left * 3).toFixed(3));
    crop.style.setProperty('--crop-scale', (1.14 - 0.14 * e).toFixed(4));
    if (cropOut && cropBox) cropOut.textContent = `${Math.round(cropBox.offsetWidth)} × ${Math.round(cropBox.offsetHeight)}`;
  };
  if (crop) {
    let cropRaf = 0;
    window.addEventListener('scroll', () => { if (!cropRaf) cropRaf = requestAnimationFrame(() => { cropRaf = 0; paintCrop(); }); }, { passive: true });
  }

  // --- Frame labels show their live size ---------------------------------------
  const frames = [...document.querySelectorAll('.frame')];
  const sizeFrames = () => {
    frames.forEach((f) => {
      const out = f.querySelector('[data-size]');
      if (out) out.textContent = `${Math.round(f.offsetWidth)} × ${Math.round(f.offsetHeight)}`;
    });
    paintCrop();
  };

  // --- Top bar: highlight the tab for the section in view ------------------
  const tabs = [...document.querySelectorAll('.topbar__tabs a[href^="#"]:not([href="#"])')];
  const targets = tabs.map((t) => document.querySelector(t.getAttribute('href'))).filter(Boolean);
  if (targets.length) {
    // the last section whose top has passed the middle of the screen wins
    let tabRaf = 0;
    const markTab = () => {
      tabRaf = 0;
      const line = window.innerHeight * 0.5;
      let current = null, best = -Infinity;   // nothing is highlighted while you're still in the hero
      targets.forEach((t) => {
        const top = t.getBoundingClientRect().top;
        if (top <= line && top > best) { best = top; current = t; }
      });
      tabs.forEach((t) => t.classList.toggle('is-active', !!current && t.getAttribute('href') === '#' + current.id));
    };
    window.addEventListener('scroll', () => { if (!tabRaf) tabRaf = requestAnimationFrame(markTab); }, { passive: true });
    markTab();
  }

  const hero = document.querySelector('[data-canvas]');
  if (!hero) {
    pageChrome();
    window.addEventListener('resize', sizeFrames);
    sizeFrames();
    return;
  }

  // ==========================================================================
  // Hero canvas
  // ==========================================================================
  const $ = (s) => hero.querySelector(s);
  const sel = $('.sel');
  const badge = $('.sel__badge');
  const hoverBox = $('.hover-box');
  const hoverName = $('.hover-box__name');
  const measure = $('.measure');
  const ring = $('.lens-ring');
  const rulerTop = document.querySelector('.ruler--top');
  const rulerLeft = document.querySelector('.ruler--left');
  const bandTop = rulerTop.querySelector('.ruler__band');
  const bandLeft = rulerLeft.querySelector('.ruler__band');
  const layerBtns = [...hero.querySelectorAll('.layer[data-target]')];
  const toolBtns = [...hero.querySelectorAll('.tool')];
  const prop = (k) => hero.querySelector(`[data-prop="${k}"]`);
  const textProps = $('[data-props-text]');
  const viewportOut = $('[data-viewport]');
  const wordmark = $('[data-id="wordmark"]');
  const lensText = $('.lens-text');
  const statement = $('[data-id="intro"]');
  const thread = $('.thread');
  const threadPin = $('.thread__pin');
  const threadCount = $('.thread__count');
  const threadMsgs = [...hero.querySelectorAll('.thread__msg')];
  const threadReply = $('.thread__reply');
  const penCursor = $('.cursor--deeksha');
  const penTag = penCursor.querySelector('.cursor__tag');
  const fineMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const layerById = (id) => hero.querySelector(`[data-id="${id}"]`);

  // photos revealed through the name by the lens; the design panel names the fill
  // `pos` keeps the face inside the band of the photo the letters show
  const LENS_FILLS = [
    { src: 'assets/img/lens-deeksha.jpg', name: 'deeksha.jpg', pos: '50% 42%' },
  ];
  LENS_FILLS.forEach((f) => { const i = new Image(); i.src = f.src; });

  let selected = wordmark;
  let hovered = null;
  let tool = 'move';
  let pins = 0;
  let busy = false;          // dragging or scaling: no hover feedback
  let introRunning = false;
  let lens = null;           // current lens fill while the pointer is over the name

  const rulerSize = () => parseFloat(getComputedStyle(hero).getPropertyValue('--ruler-size')) || 20;

  function box(el) {
    const h = hero.getBoundingClientRect();
    const r = (el === thread ? threadPin : el).getBoundingClientRect();
    return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height, r: r.right - h.left, b: r.bottom - h.top };
  }
  function place(node, b) {
    node.style.transform = `translate(${b.x}px, ${b.y}px)`;
    node.style.width = `${b.w}px`;
    node.style.height = `${b.h}px`;
  }

  // ---- design panel ----
  const WEIGHTS = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold' };
  const KINDS = { text: 'text', frame: 'frame', image: 'image', comment: 'comment' };
  function rgb(color) {
    const m = color.match(/\d+(\.\d+)?/g);
    if (!m || (m[3] !== undefined && +m[3] === 0)) return null;
    return m.slice(0, 3).map(Number);
  }
  function paintProps(el) {
    if (!prop('name')) return;   // no design panel on the page
    const rs = rulerSize();
    const swatch = prop('swatch');
    swatch.style.backgroundImage = '';
    prop('fill-extra').textContent = '100%';
    if (!el) {
      prop('name').textContent = 'Home · Desktop / frame';
      prop('x').textContent = 0; prop('y').textContent = 0;
      prop('w').textContent = Math.round(hero.offsetWidth - rs);
      prop('h').textContent = Math.round(hero.offsetHeight - rs);
      textProps.hidden = true;
      prop('fill').textContent = 'RGB(236, 236, 232)';
      swatch.style.background = '#ecece8';
      return;
    }
    const b = box(el);
    const cs = getComputedStyle(el);
    prop('name').textContent = `${el.dataset.name} / ${el.dataset.kind || KINDS[el.dataset.layer]}`;
    prop('x').textContent = Math.round(b.x - rs);
    prop('y').textContent = Math.round(b.y - rs);
    prop('w').textContent = Math.round(b.w);
    prop('h').textContent = Math.round(b.h);
    const isText = el.dataset.layer === 'text';
    textProps.hidden = !isText;
    if (isText) {
      const size = parseFloat(cs.fontSize);
      const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
      const sc = el === wordmark && wordmark.classList.contains('is-scaled') ? 1.04 : 1;
      prop('font').textContent = cs.fontFamily.split(',')[0].replace(/["']/g, '');
      prop('weight').textContent = WEIGHTS[cs.fontWeight] || cs.fontWeight;
      prop('size').textContent = Math.round(size * sc);
      prop('tracking').textContent = `${Math.round((ls / size) * 100)}%`;
    }
    if (el === wordmark && lens) {
      swatch.style.background = '';
      swatch.style.backgroundImage = `url("${lens.src}")`;
      prop('fill').textContent = 'Image';
      prop('fill-extra').textContent = lens.name;
      return;
    }
    // the name's colour may be mid-fade during the intro: report its resting fill
    const c = el === wordmark ? [12, 12, 14] : rgb(isText ? cs.color : cs.backgroundColor);
    prop('fill').textContent = c ? `RGB(${c.join(', ')})` : 'None';
    swatch.style.background = c ? `rgb(${c.join(',')})` : 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 8px 8px';
  }

  // ---- selection ----
  function paintSelection(el, { animate = true, liveSize = false } = {}) {
    sel.classList.toggle('no-anim', !animate);
    const rs = rulerSize();
    if (!el) {
      sel.style.opacity = 0;
      bandTop.style.opacity = 0;
      bandLeft.style.opacity = 0;
    } else {
      const b = box(el);
      sel.style.opacity = '';
      place(sel, b);
      badge.textContent = `${Math.round(b.w)} × ${Math.round(b.h)}`;
    }
    paintBands();
    layerBtns.forEach((btn) => btn.classList.toggle('is-selected', !!el && btn.dataset.target === el.dataset.id));
    if (!hovered) paintProps(el);
    if (hovered || (el && el === hoverTarget)) drawMeasures();
  }
  function select(el) {
    selected = el;
    clearHover();
    paintSelection(el);
  }
  // keep the selection glued to a layer while it animates (hover scale)
  let followUntil = 0;
  function follow(ms) {
    const start = !followUntil || performance.now() > followUntil;
    followUntil = performance.now() + ms;
    if (!start) return;
    const step = () => {
      paintSelection(selected, { animate: false });
      if (performance.now() < followUntil) requestAnimationFrame(step);
      else followUntil = 0;
    };
    requestAnimationFrame(step);
  }

  // ---- redlines ----
  function line(kind, x, y, len, tx, ty) {
    if (len < 2) return;
    const l = document.createElement('i');
    l.className = `measure__line measure__line--${kind}`;
    l.style.left = `${x}px`;
    l.style.top = `${y}px`;
    l.style[kind === 'h' ? 'width' : 'height'] = `${len}px`;
    measure.appendChild(l);
    const t = document.createElement('span');
    t.className = 'measure__tag';
    t.textContent = Math.round(len);
    t.style.left = `${tx}px`;
    t.style.top = `${ty}px`;
    measure.appendChild(t);
  }
  let hoverTarget = null;    // the layer under the pointer, selected or not
  function drawMeasures() {
    measure.replaceChildren();
    const target = hovered || hoverTarget;
    if (!target) return;
    const h = box(target);
    const rs = rulerSize();
    const W = hero.offsetWidth;
    if (target === selected || !selected) {
      // pointing at the selection: distances to the frame edges and the next layer down
      const cy = h.y + h.h / 2, cx = h.x + h.w / 2;
      line('h', rs, cy, h.x - rs, (rs + h.x) / 2, cy);
      line('h', h.r, cy, W - h.r, (h.r + W) / 2, cy);
      line('v', cx, rs, h.y - rs, cx, (rs + h.y) / 2);
      const below = target === wordmark ? statement : null;
      // off-centre so the label doesn't sit on the size badge
      if (below) { const s = box(below), bx = h.x + h.w * 0.3; line('v', bx, h.b, s.y - h.b, bx, (h.b + s.y) / 2); }
      return;
    }
    const s = box(selected);
    const ox1 = Math.max(s.x, h.x), ox2 = Math.min(s.r, h.r);
    const oy1 = Math.max(s.y, h.y), oy2 = Math.min(s.b, h.b);
    const cx = ox2 > ox1 ? (ox1 + ox2) / 2 : h.x + h.w / 2;
    const cy = oy2 > oy1 ? (oy1 + oy2) / 2 : h.y + h.h / 2;
    if (h.y >= s.b) line('v', cx, s.b, h.y - s.b, cx, (s.b + h.y) / 2);
    else if (s.y >= h.b) line('v', cx, h.b, s.y - h.b, cx, (h.b + s.y) / 2);
    if (h.x >= s.r) line('h', s.r, cy, h.x - s.r, (s.r + h.x) / 2, cy);
    else if (s.x >= h.r) line('h', h.r, cy, s.x - h.r, (h.r + s.x) / 2, cy);
  }

  // ---- hover: outline + name + redlines + inspect ----
  function showHover(el) {
    if (busy || introRunning || tool === 'comment') el = null;
    if (el !== hoverTarget) {
      hoverTarget = el;
      if (el && el === selected) drawMeasures();
    }
    const next = el && el !== selected ? el : null;
    if (next === hovered) return;
    hovered = next;
    if (!hovered) { clearHover(true); if (hoverTarget) drawMeasures(); return; }
    place(hoverBox, box(hovered));
    hoverName.textContent = hovered.dataset.name;
    hoverBox.classList.add('is-on');
    drawMeasures();
    paintProps(hovered);
    layerBtns.forEach((btn) => btn.classList.toggle('is-hovered', btn.dataset.target === hovered.dataset.id));
  }
  function clearHover(keepTarget) {
    hovered = null;
    if (!keepTarget) hoverTarget = null;
    hoverBox.classList.remove('is-on');
    measure.replaceChildren();
    layerBtns.forEach((btn) => btn.classList.remove('is-hovered'));
    paintProps(selected);
  }

  // ---- lens over the name: scale up 4% and reveal a photo inside the letters ----
  let lensIndex = -1;
  function lensOn(e) {
    if (lens || !fineMouse) return;
    lensIndex = (lensIndex + 1) % LENS_FILLS.length;
    lens = LENS_FILLS[lensIndex];
    lensText.style.backgroundImage = `url("${lens.src}")`;
    lensText.style.backgroundPosition = lens.pos || 'center';
    wordmark.classList.add('is-scaled');
    ring.classList.add('is-on');
    follow(520);
    lensMove(e);
    paintProps(hovered || selected);
  }
  function lensMove(e) {
    if (!lens) return;
    const h = hero.getBoundingClientRect();
    ring.style.left = `${e.clientX - h.left}px`;
    ring.style.top = `${e.clientY - h.top}px`;
    const r = wordmark.getBoundingClientRect();
    const k = r.width / wordmark.offsetWidth;          // undo the hover scale
    lensText.style.clipPath = `circle(${82 / k}px at ${(e.clientX - r.left) / k}px ${(e.clientY - r.top) / k}px)`;
  }
  function lensOff() {
    if (!lens) return;
    lens = null;
    wordmark.classList.remove('is-scaled');
    ring.classList.remove('is-on');
    lensText.style.clipPath = '';
    follow(520);
    paintProps(hovered || selected);
  }

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const overUi = e.target.closest('.panel, .toolbar, .pin, .sel__h, .thread__card');
    const layer = overUi ? null : e.target.closest('[data-layer]');
    if (layer === wordmark && tool === 'move' && !busy && !introRunning) { lensOn(e); lensMove(e); } else lensOff();
    if (overUi && e.target.closest('.layers')) return;
    showHover(layer);
  });
  hero.addEventListener('pointerleave', () => { lensOff(); showHover(null); });
  layerBtns.forEach((btn) => {
    btn.addEventListener('click', () => select(layerById(btn.dataset.target)));
    btn.addEventListener('mouseenter', () => showHover(layerById(btn.dataset.target)));
    btn.addEventListener('mouseleave', () => showHover(null));
  });

  // ---- comment thread ----
  function placeThread() {
    const w = box(wordmark);
    thread.style.left = `${w.r - Math.min(150, w.w * 0.18)}px`;
    thread.style.top = `${w.y + 6}px`;
  }
  let typingThread = false;
  threadPin.addEventListener('mouseenter', () => { if (!typingThread) thread.classList.add('is-open'); });
  thread.addEventListener('mouseleave', () => { if (!typingThread) thread.classList.remove('is-open'); });
  threadPin.addEventListener('click', () => { if (!typingThread) thread.classList.toggle('is-open'); });
  function fillThread() {
    threadMsgs.forEach((m) => { m.textContent = m.dataset.text; });
    threadReply.hidden = false;
    threadCount.hidden = false;
  }

  // ---- rulers: fixed on screen; the left one reads page position as you scroll ----
  const topbarH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topbar-h')) || 56;
  const addNum = (ruler, v, axis, at) => {
    const n = document.createElement('span');
    n.className = 'ruler__num';
    n.textContent = v;
    n.style[axis] = `${at}px`;
    ruler.appendChild(n);
  };
  function paintRulers() {
    rulerTop.querySelectorAll('.ruler__num').forEach((n) => n.remove());
    for (let v = 100; v < rulerTop.offsetWidth; v += 100) addNum(rulerTop, v, 'left', v);
    paintLeftRuler();
    if (viewportOut) viewportOut.textContent = `${window.innerWidth} × ${window.innerHeight}`;
  }
  function paintLeftRuler() {
    const y = Math.round(window.scrollY);
    rulerLeft.style.setProperty('--ruler-y0', `${-(y % 100)}px`);
    rulerLeft.querySelectorAll('.ruler__num').forEach((n) => n.remove());
    const h = rulerLeft.offsetHeight;
    for (let v = Math.max(100, Math.ceil(y / 100) * 100); v - y < h; v += 100) addNum(rulerLeft, v, 'top', v - y);
  }

  // the purple bands show the selected layer, or any image frame you point at
  let bandTarget = null;
  function paintBands() {
    const el = bandTarget || selected;
    if (!el) { bandTop.style.opacity = 0; bandLeft.style.opacity = 0; return; }
    const r = el.getBoundingClientRect();
    const rs = rulerSize();
    if (r.bottom < topbarH() + rs || r.top > window.innerHeight) {   // scrolled out of view
      bandTop.style.opacity = 0; bandLeft.style.opacity = 0; return;
    }
    bandTop.style.opacity = 1;
    bandLeft.style.opacity = 1;
    bandTop.style.left = `${r.left - rs}px`;
    bandTop.style.width = `${r.width}px`;
    bandLeft.style.top = `${r.top - topbarH() - rs}px`;
    bandLeft.style.height = `${r.height}px`;
  }
  document.querySelectorAll('.shot__frame, .about2__frame').forEach((frame) => {
    frame.addEventListener('mouseenter', () => { bandTarget = frame; paintBands(); });
    frame.addEventListener('mouseleave', () => { bandTarget = null; paintBands(); });
  });
  function layout() {
    paintRulers();
    placeThread();
    if (!introRunning) paintSelection(selected, { animate: false });
    sizeFrames();
  }

  // ---- tools ----
  function setTool(name) {
    if (name === 'pen') { if (!introRunning) runIntro().catch(settle); return; }
    tool = name;
    markTool(name);
    hero.classList.toggle('tool-text', name === 'text');
    hero.classList.toggle('tool-comment', name === 'comment');
    if (name !== 'move') { showHover(null); lensOff(); }
  }
  const markTool = (name) => toolBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.tool === name));
  toolBtns.forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

  // ---- text editing ----
  function startEditing(el) {
    if (el.dataset.layer !== 'text') return;
    lensOff();
    select(el);
    el.contentEditable = 'true';
    el.spellcheck = false;
    if (lensText) lensText.contentEditable = 'false';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el === wordmark ? wordmark.querySelector('span:not(.lens-text)') || el : el);
    range.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(range);
  }
  const wordmarkText = () => [...wordmark.childNodes].filter((n) => !(n.classList && n.classList.contains('lens-text'))).map((n) => n.textContent).join('');
  hero.querySelectorAll('[data-layer="text"]').forEach((el) => {
    el.addEventListener('blur', () => { el.contentEditable = 'false'; });
    el.addEventListener('input', () => {
      if (el === wordmark) lensText.textContent = wordmarkText();
      paintSelection(el, { animate: false });
      placeThread();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener('dblclick', () => startEditing(el));
  });

  // ---- pointer: scale (handles / scale tool), drag, select, comment ----
  let drag = null;
  let scale = null;
  let swallowClick = false;

  function startScale(e, dir) {
    const el = selected;
    if (!el || el === thread) return;
    e.preventDefault();
    e.stopPropagation();
    lensOff();
    const b = box(el);
    const cs = getComputedStyle(el);
    const absolute = cs.position === 'absolute';
    scale = {
      el, b, dir, sx: e.clientX, sy: e.clientY,
      text: el.dataset.layer === 'text',
      fs: parseFloat(cs.fontSize),
      lh: cs.lineHeight.endsWith('px') && el !== wordmark ? parseFloat(cs.lineHeight) : null,
      s0: parseFloat(el.style.scale) || 1,
      kx: absolute ? 1 : 2,        // flex-centred layers grow from their centre
    };
    if (!scale.text) el.style.transformOrigin = absolute ? 'top left' : 'center top';
    busy = true;
    clearHover();
    document.body.classList.add('is-scaling');
  }
  function moveScale(e) {
    const { el, b, dir, sx, sy, kx } = scale;
    const hx = dir[1] === 'r' ? 1 : dir[1] === 'l' ? -1 : 0;
    const vy = dir[0] === 'b' ? 1 : dir[0] === 't' ? -1 : 0;
    const fx = hx ? (b.w + hx * (e.clientX - sx) * kx) / b.w : null;
    const fy = vy ? (b.h + vy * (e.clientY - sy)) / b.h : null;
    let f = fx ?? fy;
    if (fx !== null && fy !== null) f = Math.abs(fx - 1) > Math.abs(fy - 1) ? fx : fy;
    f = Math.min(2.2, Math.max(0.35, f));
    if (scale.text) {
      el.style.fontSize = `${scale.fs * f}px`;
      if (scale.lh) el.style.lineHeight = `${scale.lh * f}px`;
    } else {
      el.style.scale = String(scale.s0 * f);
    }
    paintSelection(el, { animate: false, liveSize: true });
    paintProps(el);
    if (el === wordmark) placeThread();
  }
  function endScale() {
    document.body.classList.remove('is-scaling');
    busy = false;
    paintSelection(scale.el, { animate: false });
    scale = null;
    swallowClick = true;
  }
  sel.addEventListener('dblclick', (e) => {
    if (!e.target.closest('.sel__h') || !selected) return;
    selected.style.fontSize = '';
    selected.style.lineHeight = '';
    selected.style.scale = '';
    paintSelection(selected);
    placeThread();
  });

  hero.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (introRunning) { skipIntro(); return; }
    const handle = e.target.closest('.sel__h');
    if (handle) { if (fineMouse) startScale(e, handle.dataset.h); return; }
    if (e.target.closest('.panel, .toolbar, .pin, .ruler, .thread, .float-card__btn')) return;
    const layer = e.target.closest('[data-layer]');

    if (tool === 'comment') { e.preventDefault(); dropPin(e); return; }
    if (tool === 'text') {
      if (layer && layer.dataset.layer === 'text') { e.preventDefault(); startEditing(layer); setTool('move'); }
      return;
    }
    if (layer && layer.isContentEditable) return;
    if (!layer) { select(null); return; }

    select(layer);
    if (!fineMouse || e.pointerType !== 'mouse') return;
    if (tool === 'scale') { startScale(e, 'br'); return; }
    const [tx, ty] = (layer.style.translate || '0px 0px').split(' ').map(parseFloat);
    drag = { el: layer, sx: e.clientX, sy: e.clientY, tx: tx || 0, ty: ty || 0, moved: false };
  });

  window.addEventListener('pointermove', (e) => {
    if (scale) { moveScale(e); return; }
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; busy = true; lensOff(); clearHover(); document.body.classList.add('is-dragging'); }
    drag.el.style.translate = `${drag.tx + dx}px ${drag.ty + dy}px`;
    paintSelection(drag.el, { animate: false });
    if (drag.el === wordmark) placeThread();
  });

  window.addEventListener('pointerup', () => {
    if (scale) { endScale(); return; }
    if (!drag) return;
    if (drag.moved) swallowClick = true;
    document.body.classList.remove('is-dragging');
    busy = false;
    drag = null;
  });

  hero.addEventListener('click', (e) => {
    if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; }
  }, true);

  // ---- comment tool: visitors can drop a note (stays in their browser tab only) ----
  function dropPin(e) {
    const h = hero.getBoundingClientRect();
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.style.left = `${e.clientX - h.left}px`;
    pin.style.top = `${e.clientY - h.top}px`;
    pins += 1;
    pin.innerHTML = `<span class="pin__dot">${pins}</span><span class="pin__box"><b>You</b><input type="text" maxlength="80" placeholder="Leave a thought…" aria-label="Comment text"></span>`;
    hero.appendChild(pin);
    const input = pin.querySelector('input');
    input.focus();
    setTimeout(() => { if (input.isConnected) input.focus(); }, 0);
    const done = () => {
      const text = input.value.trim();
      if (!text) { pin.remove(); return; }
      const p = document.createElement('span');
      p.textContent = text;
      input.replaceWith(p);
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
      if (ev.key === 'Escape') { input.value = ''; input.blur(); }
      ev.stopPropagation();
    });
    input.addEventListener('blur', done, { once: true });
    setTool('move');
  }

  // ---- keyboard shortcuts ----
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (introRunning) { skipIntro(); return; }
    const k = e.key.toLowerCase();
    const map = { v: 'move', f: 'frame', p: 'pen', t: 'text', c: 'comment', k: 'scale' };
    if (map[k]) setTool(map[k]);
    else if (k === 'escape') { setTool('move'); select(null); }
  });

  // ---- collaborators drift around the canvas ----
  const wanderers = [];
  function wander(cursor, spots) {
    const w = { cursor, spots, i: 0, timer: 0, paused: false };
    const step = () => {
      if (!w.paused && !introRunning) {
        w.i = (w.i + 1) % spots.length;
        const [fx, fy] = spots[w.i];
        cursor.style.left = `${fx * hero.offsetWidth}px`;
        cursor.style.top = `${fy * hero.offsetHeight}px`;
      }
      w.timer = setTimeout(step, 2400 + Math.random() * 1800);
    };
    w.start = () => { clearTimeout(w.timer); step(); };
    wanderers.push(w);
    return w;
  }
  const penWander = wander(penCursor, [[0.8, 0.66], [0.76, 0.74], [0.83, 0.7], [0.78, 0.8]]);   // the empty space lower right

  // ==========================================================================
  // Intro: pen draws the name → it fills → the file opens → a comment types itself
  // ==========================================================================
  let skip = null;
  let skipped = false;
  const wait = (ms) => (skipped ? Promise.resolve() : Promise.race([sleep(ms), skip]));
  function skipIntro() { if (introRunning && !skipped) { skipped = true; skip.resolveNow(); } }

  async function typeInto(node, text) {
    const caret = document.createElement('span');
    caret.className = 'caret';
    node.textContent = '';
    node.appendChild(caret);
    for (let c = 1; c <= text.length && !skipped; c++) {
      node.firstChild && node.firstChild.nodeType === 3 ? (node.firstChild.textContent = text.slice(0, c)) : node.insertBefore(document.createTextNode(text.slice(0, c)), caret);
      const ch = text[c - 1];
      await wait(ch === ',' || ch === '!' || ch === '.' ? 180 : 24 + Math.random() * 30);
    }
    node.textContent = text;
  }

  // anchor points along each letter: baseline corners plus the top of the glyph
  function letterAnchors() {
    const out = [];
    const cs = getComputedStyle(wordmark);
    const fs = parseFloat(cs.fontSize);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const h = hero.getBoundingClientRect();
    const walker = document.createTreeWalker(wordmark, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest('.lens-text') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      for (let i = 0; i < node.length; i++) {
        const ch = node.textContent[i];
        if (!ch.trim()) continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        const m = ctx.measureText(ch);
        const fA = m.fontBoundingBoxAscent || fs * 0.9;
        const fD = m.fontBoundingBoxDescent || fs * 0.25;
        const baseline = r.top - h.top + (r.height - (fA + fD)) / 2 + fA;
        const top = baseline - (m.actualBoundingBoxAscent || fs * 0.7);
        const x0 = r.left - h.left + 6;
        const x1 = r.right - h.left - 6;
        out.push({ x: x0, y: baseline }, { x: (x0 + x1) / 2, y: top }, { x: x1, y: baseline }, { x: x1, y: (top + baseline) / 2 });
      }
    }
    return out;
  }

  async function runIntro() {
    introRunning = true;
    skipped = false;
    let resolveNow;
    skip = new Promise((r) => { resolveNow = r; });
    skip.resolveNow = resolveNow;

    hero.classList.add('is-intro');
    hero.classList.remove('is-ready');
    lensOff();
    clearHover();
    thread.classList.remove('is-open', 'is-dropping');
    threadCount.hidden = true;
    threadReply.hidden = true;
    threadMsgs.forEach((m) => { m.textContent = ''; });
    markTool('pen');
    hero.querySelectorAll('.anchor').forEach((a) => a.remove());

    // 1) the pen draws the outline, dropping anchor points
    wordmark.classList.add('is-outline');
    const wb = box(wordmark);
    const anchors = letterAnchors().sort((a, b) => a.x - b.x);
    const drawMs = 1300;
    const ease = 'cubic-bezier(.45, .05, .55, .95)';
    const reveal = wordmark.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: drawMs, easing: ease, fill: 'forwards' });
    penTag.textContent = 'Deeksha · Pen';
    penCursor.classList.add('is-pen');
    const path = anchors.filter((_, i) => i % 4 === 1).map((p) => ({ left: `${p.x}px`, top: `${p.y - 4}px` }));
    const pen = penCursor.animate(
      [{ left: `${wb.x - 40}px`, top: `${wb.y + wb.h * 0.7}px` }, ...path, { left: `${wb.r + 10}px`, top: `${wb.y + wb.h * 0.55}px` }],
      { duration: drawMs, easing: ease, fill: 'forwards' },
    );
    const dropTimers = anchors.map((p) => setTimeout(() => {
      const a = document.createElement('i');
      a.className = 'anchor';
      a.style.left = `${p.x}px`;
      a.style.top = `${p.y}px`;
      hero.appendChild(a);
    }, ((p.x - wb.x) / wb.w) * drawMs));

    await wait(drawMs + 100);
    reveal.finish();
    dropTimers.forEach(clearTimeout);

    // 2) fill in under the outline, then drop the outline
    wordmark.classList.add('is-filling');
    await wait(460);
    wordmark.classList.remove('is-outline', 'is-filling');
    hero.querySelectorAll('.anchor').forEach((a) => a.classList.add('is-gone'));

    // 3) the file opens: annotations, selection, statement, cards and panels
    try { pen.commitStyles(); } catch { /* cursor hidden on small screens */ }
    pen.cancel();
    reveal.cancel();
    penCursor.classList.remove('is-pen');
    penTag.textContent = 'Deeksha';
    hero.classList.remove('is-intro');
    markTool('move');
    tool = 'move';
    selected = wordmark;
    paintSelection(wordmark, { animate: false });
    placeThread();
    await wait(420);
    hero.querySelectorAll('.anchor').forEach((a) => a.remove());

    // the collaborator walks over to the name and leaves a comment
    const tb = box(thread);
    penCursor.style.left = `${tb.x + 30}px`;
    penCursor.style.top = `${tb.y + 26}px`;
    await wait(650);

    hero.classList.add('is-ready');
    thread.classList.add('is-dropping', 'is-open');
    typingThread = true;
    await wait(420);
    await typeInto(threadMsgs[0], threadMsgs[0].dataset.text);
    await wait(500);
    threadReply.hidden = false;
    await typeInto(threadMsgs[1], threadMsgs[1].dataset.text);
    await wait(2200);
    typingThread = false;
    if (!thread.matches(':hover')) thread.classList.remove('is-open');
    threadCount.hidden = false;
    finish();
  }

  function finish() {
    introRunning = false;
    hero.classList.add('is-ready');
    thread.classList.remove('is-dropping');
    fillThread();
    penWander.start();
    paintSelection(selected, { animate: false });
  }

  // land on the finished hero (skip, reduced motion, or anything failing mid-intro)
  function settle() {
    typingThread = false;
    hero.classList.remove('is-intro');
    hero.querySelectorAll('.anchor, .caret').forEach((n) => n.remove());
    wordmark.classList.remove('is-outline', 'is-filling');
    wordmark.getAnimations().forEach((a) => a.cancel());
    penCursor.getAnimations().forEach((a) => a.cancel());
    penCursor.classList.remove('is-pen');
    penTag.textContent = 'Deeksha';
    thread.classList.remove('is-open');
    markTool('move');
    tool = 'move';
    placeThread();
    finish();
  }

  // ---- scroll: cards and panels drift out to the side walls and fade ----
  if (!reduceMotion) {
    let scrollRaf = 0;
    const drift = () => {
      scrollRaf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.55)));
      hero.style.setProperty('--sp', p.toFixed(3));
    };
    window.addEventListener('scroll', () => { if (!scrollRaf) scrollRaf = requestAnimationFrame(drift); }, { passive: true });
    drift();
  }

  // ---- rulers follow the scroll (always, even with reduced motion) ----
  let rulerRaf = 0;
  window.addEventListener('scroll', () => {
    if (rulerRaf) return;
    rulerRaf = requestAnimationFrame(() => { rulerRaf = 0; paintLeftRuler(); paintBands(); });
  }, { passive: true });

  // ---- keep everything in sync with layout ----
  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(layout);
  });
  layout();

  const start = () => {
    layout();
    if (reduceMotion) settle();
    else runIntro().then(() => { if (skipped) settle(); }).catch(settle);
  };
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, sleep(1500)]).then(start);
  else start();
  window.addEventListener('load', layout);
})();
