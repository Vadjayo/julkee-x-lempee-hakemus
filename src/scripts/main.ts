/**
 * Sivun kaikki selainlogiikka. Ei kirjastoja: CSS, Web Animations API ja IntersectionObserver.
 * Sisältö näkyy ilman tätä skriptiä. Skripti lisää vain liikkeen ja mittaukset.
 */
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fi = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',');

/* ---------- Intro: feikki-WordPress puretaan ---------- */
function intro(): void {
  if (root.classList.contains('intro-done')) return;
  const overlay = $('#intro');
  const hud = $('#intro-hud');
  const pct = $('#intro-pct');
  const meter = $('#intro-meter');
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    try {
      sessionStorage.setItem('intro-seen', '1');
    } catch {
      // Yksityinen selaus tai estetty tallennus: intro näytetään uudelleen, muuta haittaa ei ole.
    }
    overlay.classList.add('gone');
    hud.classList.add('gone');
    // Luokka vapauttaa vierityksen ja käynnistää heron sisääntulon.
    setTimeout(() => {
      root.classList.add('intro-done');
      root.dataset.introMs = String(Math.round(performance.now()));
    }, 400);
  };
  $('#intro-skip').addEventListener('click', finish);

  // Pilko tekstit putoaviksi paloiksi: otsikko kirjaimittain, muu teksti sanoittain.
  // Sanat pitävät elementtien määrän pienenä, jotta purku pyörii kevyesti hitaallakin puhelimella.
  const walker = document.createTreeWalker(overlay, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const chars: HTMLElement[] = [];
  for (const node of nodes) {
    const text = node.textContent ?? '';
    if (!text.trim()) continue;
    const byLetter = node.parentElement?.classList.contains('intro-title');
    const pieces = byLetter ? [...text] : text.split(/(?<=\s)/);
    const fragment = document.createDocumentFragment();
    for (const piece of pieces) {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = piece;
      fragment.append(span);
      chars.push(span);
    }
    node.replaceWith(fragment);
  }

  // Kokonaiskesto: 700 + 1800 + 150 + 400 ms = 3,05 s.
  const HOLD = 700;
  const FALL = 1800;
  setTimeout(() => {
    if (done) return;
    for (const char of chars) {
      const dx = (Math.random() - 0.5) * 240;
      const rot = (Math.random() - 0.5) * 540;
      const duration = 700 + Math.random() * 500;
      char.animate([{ transform: 'none' }, { transform: `translate(${dx}px, 110vh) rotate(${rot}deg)` }], {
        duration,
        delay: Math.random() * (FALL - 1200),
        easing: 'cubic-bezier(.5,0,.9,.5)',
        fill: 'forwards',
      });
    }
    const start = performance.now();
    const tick = (now: number) => {
      if (done) return;
      const p = Math.min(1, (now - start) / FALL);
      const label = `Purettu ${Math.round(p * 100)} %`;
      if (pct.textContent !== label) pct.textContent = label;
      meter.style.transform = `scaleX(${p})`;
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finish, 150);
    };
    requestAnimationFrame(tick);
  }, HOLD);
  // Varmistus: jos välilehti on taustalla eikä animaatio pyöri, sivu aukeaa silti.
  setTimeout(finish, HOLD + FALL + 400);
}

/* ---------- Punainen piste ---------- */
function dot(): void {
  const button = $<HTMLButtonElement>('#dot');
  button.addEventListener('click', () => {
    button.classList.add('off');
    button.disabled = true;
    button.setAttribute('aria-label', 'Punainen piste on sammutettu');
    $('#dot-msg').textContent = 'Ärsyttikö? Piste sammui, hakemus jatkuu.';
  });
}

/* ---------- Ilmestyminen vierittäessä ---------- */
function reveal(): void {
  const items = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -5% 0px' },
  );
  items.forEach((el) => observer.observe(el));
}

/** Kutsuu funktiota aina, kun elementti tulee näkyviin tai poistuu näkyvistä. */
function whenVisible(el: Element, callback: (visible: boolean) => void, threshold = 0.25): void {
  if (!('IntersectionObserver' in window)) {
    callback(true);
    return;
  }
  new IntersectionObserver((entries) => entries.forEach((e) => callback(e.isIntersecting)), { threshold }).observe(el);
}

/* ---------- Kokemuslaskuri ---------- */
function experience(): void {
  const box = $('#xp');
  const startYear = Number(box.dataset.year);
  const startMonth = Number(box.dataset.month);
  const required = Number(box.dataset.required);
  const now = new Date();
  const months = Math.min(required, Math.max(0, (now.getFullYear() - startYear) * 12 + (now.getMonth() + 1 - startMonth)));
  const pct = Math.round((months / required) * 100);
  const monthsEl = $('#xp-months');
  let ran = false;

  const run = () => {
    if (ran) return;
    ran = true;
    $('#xp-pct').textContent = `${pct} %`;
    $('#xp-bar-wrap').setAttribute('aria-label', `Kokemusvaatimuksesta täytetty ${pct} prosenttia`);
    $('#xp-bar').style.transform = `scaleX(${Math.max(pct, 2) / 100})`;
    box.classList.add('counted');
    if (reduce) {
      monthsEl.textContent = String(months);
      return;
    }
    const start = performance.now();
    const DURATION = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION);
      monthsEl.textContent = String(Math.round(months * p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  whenVisible(box, (visible) => visible && run(), 0.4);
}

/* ---------- Projektien esikatselut ---------- */
function previews(): void {
  // Mockit: animaatio pyörii vain näkyvissä. "once" käynnistyy kerran ja jää näkyviin.
  for (const mock of $$('[data-play]')) {
    whenVisible(mock, (visible) => {
      if (mock.dataset.play === 'once') {
        if (visible) mock.classList.add('playing');
      } else {
        mock.classList.toggle('playing', visible);
      }
    });
  }
  if (reduce) return;

  for (const preview of $$('[data-preview]')) {
    const animations: Animation[] = [];
    const frames = $$('[data-scroll]').filter((el) => preview.contains(el));
    const desktopImg = frames[0]?.querySelector('img');
    // Kesto määräytyy työpöytäkuvan pituudesta, ja mobiilikuva vierii samassa tahdissa.
    const pace = desktopImg ? Number(desktopImg.getAttribute('height')) / Number(desktopImg.getAttribute('width')) : 2;
    const duration = Math.min(36_000, Math.max(9_000, pace * 7_000));

    for (const frame of frames) {
      const img = frame.querySelector('img');
      if (!img) continue;
      const imgRatio = Number(img.getAttribute('height')) / Number(img.getAttribute('width'));
      const [w, h] = getComputedStyle(frame).aspectRatio.split('/').map(Number);
      const frameRatio = h! / w!;
      const travel = 1 - frameRatio / imgRatio; // osuus kuvan korkeudesta
      if (!(travel > 0.02)) continue;
      const animation = img.animate(
        [{ transform: 'translateY(0)' }, { transform: `translateY(${(-travel * 100).toFixed(2)}%)` }],
        { duration, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', delay: 600 },
      );
      animation.pause();
      animations.push(animation);
    }

    const video = preview.querySelector<HTMLVideoElement>('[data-video]');
    video?.addEventListener('playing', () => video.classList.add('on'));

    preview.dataset.state = 'paused';
    whenVisible(preview, (visible) => {
      preview.dataset.state = visible ? 'running' : 'paused';
      animations.forEach((a) => (visible ? a.play() : a.pause()));
      if (!video) return;
      if (visible) video.play().catch(() => {});
      else video.pause();
    }, 0.3);

    // Hiiri kortin päällä nopeuttaa vieritystä.
    const card = preview.closest('[data-card]') ?? preview;
    const speed = (rate: number) => () => {
      preview.dataset.speed = String(rate);
      animations.forEach((a) => a.updatePlaybackRate(rate));
    };
    card.addEventListener('pointerenter', speed(4));
    card.addEventListener('pointerleave', speed(1));
  }
}

/* ---------- Työtapaputken varatoteutus ---------- */
function pipeline(): void {
  if (CSS.supports('animation-timeline: view()')) return;
  const pipe = $('#pipe');
  whenVisible(pipe, (visible) => visible && pipe.classList.add('in'), 0.3);
}

/* ---------- Rakennustyökalu ---------- */
function builder(): void {
  const blocks = $$('#stage .blk');
  const button = $<HTMLButtonElement>('#build-btn');
  const pct = $('#build-pct');
  const msg = $('#build-msg');
  let built = false;
  let busy = false;
  const setPct = (value: number) => (pct.textContent = `Rakennettu ${value} %`);

  const build = () => {
    busy = true;
    button.disabled = true;
    msg.textContent = 'Rakennetaan';
    const start = performance.now();
    const step = reduce ? 0 : 260;
    const duration = reduce ? 1 : 700;
    blocks.forEach((block, i) => {
      const dx = (Math.random() - 0.5) * 600;
      const dy = -200 - Math.random() * 300;
      const rot = (Math.random() - 0.5) * 90;
      block.animate(
        [
          { opacity: 0, transform: `translate(${dx}px,${dy}px) rotate(${rot}deg)` },
          { opacity: 1, transform: 'translate(0,6px) rotate(0)', offset: 0.8 },
          { opacity: 1, transform: 'none' },
        ],
        { duration, delay: i * step, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
      );
      setTimeout(() => setPct(Math.round(((i + 1) / blocks.length) * 100)), i * step + duration);
    });
    setTimeout(
      () => {
        const seconds = fi((performance.now() - start) / 1000, 1);
        msg.textContent = `Valmis ${seconds} sekunnissa. Lisäosia nolla.`;
        button.textContent = 'Pura ja rakenna uudelleen';
        button.disabled = false;
        busy = false;
        built = true;
      },
      (blocks.length - 1) * step + duration + 50,
    );
  };

  const demolish = (then: () => void) => {
    busy = true;
    button.disabled = true;
    msg.textContent = 'Puretaan';
    const duration = reduce ? 1 : 600;
    for (const block of blocks) {
      const dx = (Math.random() - 0.5) * 200;
      const rot = (Math.random() - 0.5) * 120;
      block.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: `translate(${dx}px,300px) rotate(${rot}deg)` },
        ],
        { duration, delay: reduce ? 0 : Math.random() * 200, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' },
      );
    }
    setPct(0);
    setTimeout(then, duration + 250);
  };

  button.addEventListener('click', () => {
    if (busy) return;
    if (built) demolish(build);
    else build();
  });
}

/* ---------- Sivu mitattuna ---------- */
function metrics(): void {
  const measure = () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const loadEnd = nav?.loadEventStart || Infinity;
    // Ensimmäinen lataus: kaikki, mikä haettiin ennen load-tapahtumaa.
    const first = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(
      (entry) => entry.responseEnd <= loadEnd,
    );
    const size = (entry: PerformanceResourceTiming) => entry.transferSize || entry.encodedBodySize || 0;
    const bytes = (nav ? size(nav) : 0) + first.reduce((sum, entry) => sum + size(entry), 0);
    $('#m-size').textContent = fi(bytes / 1024, 1);
    $('#m-req').textContent = String(first.length + 1);
    $('#m-dom').textContent = nav ? String(Math.round(nav.domContentLoadedEventEnd - nav.startTime)) : '?';
    $('#m-cookie').textContent = String(document.cookie ? document.cookie.split(';').length : 0);
    $('#metrics').dataset.measured = 'true';
  };
  if (document.readyState === 'complete') setTimeout(measure, 0);
  else addEventListener('load', () => setTimeout(measure, 0));
}

intro();
dot();
reveal();
experience();
previews();
pipeline();
builder();
metrics();
