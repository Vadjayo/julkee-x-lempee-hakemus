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

  // Ensin 1,5 s aikaa lukea WordPress-näkymä, sitten 2,6 s purku. Yhteensä noin 4,65 s häivytyksineen.
  const HOLD = 1500;
  const FALL = 2600;
  setTimeout(() => {
    if (done) return;
    for (const char of chars) {
      const dx = (Math.random() - 0.5) * 240;
      const rot = (Math.random() - 0.5) * 540;
      const duration = 900 + Math.random() * 600;
      char.animate([{ transform: 'none' }, { transform: `translate(${dx}px, 110vh) rotate(${rot}deg)` }], {
        duration,
        delay: Math.random() * (FALL - 1500),
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
  const stage = $('#stage');
  const slots = $$('#stage .slot');
  const hit = $<HTMLButtonElement>('#build-btn');
  const auto = $<HTMLButtonElement>('#build-auto');
  const pct = $('#build-pct');
  const clock = $('#build-time');
  const msg = $('#build-msg');
  const wp = $('#build-wp');
  const TOTAL_PLUGINS = 47;
  let placed = 0;
  let startedAt = 0;
  let ticker = 0;
  let autoTimer = 0;
  let plugin = 0;

  const elapsed = () => (startedAt ? (performance.now() - startedAt) / 1000 : 0);
  const mark = () => {
    slots.forEach((slot, i) => slot.classList.toggle('next', i === placed));
    pct.textContent = `Rakennettu ${Math.round((placed / slots.length) * 100)} %`;
  };

  const start = () => {
    startedAt = performance.now();
    plugin = 1;
    wp.textContent = `Samaan aikaan WordPressissä: päivitetään lisäosaa ${plugin}/${TOTAL_PLUGINS}`;
    ticker = window.setInterval(() => {
      clock.textContent = `${fi(elapsed(), 1)} s`;
      // WordPress ehtii yhden lisäosan noin puolessatoista sekunnissa.
      const now = Math.min(TOTAL_PLUGINS, 1 + Math.floor(elapsed() / 1.5));
      if (now !== plugin) {
        plugin = now;
        wp.textContent = `Samaan aikaan WordPressissä: päivitetään lisäosaa ${plugin}/${TOTAL_PLUGINS}`;
      }
    }, 100);
  };

  const finish = () => {
    clearInterval(ticker);
    clearInterval(autoTimer);
    const seconds = fi(elapsed(), 1);
    clock.textContent = `${seconds} s`;
    msg.textContent = `Valmis ${seconds} sekunnissa. Lisäosia nolla.`;
    wp.textContent = `WordPress päivittää yhä lisäosaa ${plugin}/${TOTAL_PLUGINS}`;
    stage.classList.add('done');
    hit.textContent = 'Pura ja aloita alusta';
    auto.hidden = true;
    auto.disabled = false;
  };

  const place = () => {
    if (placed >= slots.length) return;
    if (placed === 0) start();
    const slot = slots[placed]!;
    const block = slot.firstElementChild as HTMLElement;
    slot.classList.add('placed');
    if (!reduce) {
      const tilt = (Math.random() - 0.5) * 16;
      block.animate(
        [
          { opacity: 0, transform: `translateY(-140px) rotate(${tilt}deg) scale(1.08)` },
          { opacity: 1, transform: 'translateY(8px) rotate(0) scale(1)', offset: 0.7 },
          { opacity: 1, transform: 'translateY(-3px)', offset: 0.85 },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, easing: 'cubic-bezier(.3,.7,.3,1)' },
      );
      // Pieni tärähdys koko lavalle, kun pala osuu paikalleen.
      stage.animate([{ transform: 'none' }, { transform: 'translateY(3px)' }, { transform: 'none' }], { duration: 160, delay: 280 });
    }
    placed++;
    mark();
    if (placed === slots.length) finish();
    else if (!auto.disabled) msg.textContent = `${placed}/${slots.length} palaa paikallaan`;
  };

  const reset = () => {
    clearInterval(ticker);
    clearInterval(autoTimer);
    placed = 0;
    startedAt = 0;
    slots.forEach((slot) => slot.classList.remove('placed'));
    stage.classList.remove('done');
    clock.textContent = '0,0 s';
    msg.textContent = 'Lyö ensimmäinen pala paikalleen.';
    wp.textContent = '';
    hit.textContent = 'Lyö pala paikalleen';
    auto.hidden = false;
    mark();
  };

  hit.addEventListener('click', () => (placed >= slots.length ? reset() : place()));
  // Lavaa voi myös napauttaa suoraan. Valmiin sivun linkki toimii normaalisti.
  stage.addEventListener('click', (event) => {
    if (placed >= slots.length) return;
    event.preventDefault();
    place();
  });
  auto.addEventListener('click', () => {
    if (placed >= slots.length) return;
    auto.disabled = true;
    msg.textContent = 'Claude rakentaa';
    place();
    autoTimer = window.setInterval(place, reduce ? 0 : 300);
  });
  mark();
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
