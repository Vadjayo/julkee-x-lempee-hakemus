/**
 * Sivun kaikki selainlogiikka. Ei kirjastoja: CSS, Web Animations API ja IntersectionObserver.
 * Sisältö näkyy ilman tätä skriptiä. Skripti lisää vain liikkeen ja mittaukset.
 */
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fi = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',');

/* ---------- Intro: feikki-WordPress räjäytetään dynamiitilla ---------- */
function intro(): void {
  if (root.classList.contains('intro-done')) return;
  const overlay = $('#intro');
  const hud = $('#intro-hud');
  const pct = $('#intro-pct');
  const meter = $('#intro-meter');
  const tnt = $('#intro-tnt');
  let done = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
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

  // Aikajana: lue sivu (1,2 s), dynamiitti putoaa (0,45 s), lanka palaa (1,35 s), räjähdys (1,1 s), häivytys (0,4 s).
  const HOLD = 1200;
  const DROP = 450;
  const FUSE = 1350;
  const BLAST = 1100;
  const fill = 'forwards' as const;

  later(() => {
    tnt.animate(
      [
        { opacity: 1, transform: 'translateY(-110vh) rotate(-30deg)' },
        { opacity: 1, transform: 'translateY(0) rotate(6deg)', offset: 0.7 },
        { opacity: 1, transform: 'translateY(-16px) rotate(-3deg)', offset: 0.85 },
        { opacity: 1, transform: 'none' },
      ],
      { duration: DROP, easing: 'cubic-bezier(.4,0,.6,1)', fill },
    );
  }, HOLD);

  later(() => {
    // Lanka lyhenee, kipinä laskeutuu sen mukana ja nippu vilkkuu yhä tiheämmin.
    $('#intro-fuse').animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)' }], { duration: FUSE, easing: 'linear', fill });
    $('#intro-spark').animate(
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 1, transform: 'translateY(7px) scale(1.5)' },
        { opacity: 1, transform: 'translateY(14px) scale(0.9)' },
        { opacity: 1, transform: 'translateY(21px) scale(1.6)' },
        { opacity: 1, transform: 'translateY(27px) scale(1.1)' },
      ],
      { duration: FUSE, easing: 'linear', fill },
    );
    // Kahdeksan välähdystä, joista jokainen on edellistä lyhyempi.
    const gaps = Array.from({ length: 8 }, (_, i) => 0.78 ** i);
    const total = gaps.reduce((sum, gap) => sum + gap, 0);
    const blink: Keyframe[] = [];
    let at = 0;
    for (const gap of gaps) {
      blink.push({ opacity: 0, offset: at / total }, { opacity: 0.85, offset: (at + gap / 2) / total });
      at += gap;
    }
    blink.push({ opacity: 1, offset: 1 });
    $('#intro-glow').animate(blink, { duration: FUSE, fill });
    tnt.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }], { duration: 260, delay: FUSE - 260, easing: 'ease-in', fill, composite: 'add' });
  }, HOLD + DROP);

  later(() => {
    // Räjähdys: välähdys, paineaalto, tärähdys ja kaikki sisältö lentää dynamiitista poispäin.
    const origin = tnt.getBoundingClientRect();
    const ox = origin.left + origin.width / 2;
    const oy = origin.top + origin.height / 2;
    tnt.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 60, fill });
    $('#intro-flash').animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 520, easing: 'ease-out' });
    $('#intro-blast').animate(
      [
        { opacity: 0.9, transform: 'scale(0.2)' },
        { opacity: 0, transform: 'scale(16)' },
      ],
      { duration: 650, easing: 'cubic-bezier(.1,.7,.3,1)' },
    );
    overlay.animate(
      [0, -9, 8, -6, 5, -3, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 6 : -5}px)` })).concat({ transform: 'none' }),
      { duration: 420 },
    );

    // Otsikko lentää kirjaimittain, ylä- ja ilmoituspalkki kokonaisina kappaleina.
    const pieces: HTMLElement[] = [$('.intro-bar'), $('.intro-notice')];
    for (const line of [$('.intro-title'), $('.intro-sub')]) {
      const text = line.textContent ?? '';
      line.textContent = '';
      for (const char of text) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.dataset.t = char;
        line.append(span);
        pieces.push(span);
      }
    }
    for (const piece of pieces) {
      const rect = piece.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - ox;
      const dy = rect.top + rect.height / 2 - oy;
      const length = Math.hypot(dx, dy) || 1;
      // Lähellä olevat palat lentävät kovempaa.
      const force = (520 + Math.random() * 420) * Math.min(1.6, 260 / length + 0.5);
      const fx = (dx / length) * force + (Math.random() - 0.5) * 160;
      const fy = (dy / length) * force - 120;
      const rot = (Math.random() - 0.5) * 900;
      piece.animate(
        [
          { transform: 'none' },
          { transform: `translate(${fx * 0.7}px, ${fy * 0.7}px) rotate(${rot * 0.6}deg)`, offset: 0.45, easing: 'ease-in' },
          { transform: `translate(${fx * 1.15}px, ${fy * 0.7 + innerHeight}px) rotate(${rot}deg)` },
        ],
        { duration: BLAST * (0.8 + Math.random() * 0.3), easing: 'cubic-bezier(.1,.6,.4,1)', fill },
      );
    }

    const start = performance.now();
    const COUNT = BLAST - 200;
    const tick = (now: number) => {
      if (done) return;
      const p = Math.min(1, (now - start) / COUNT);
      const label = `Purettu ${Math.round(p * 100)} %`;
      if (pct.textContent !== label) pct.textContent = label;
      meter.style.transform = `scaleX(${p})`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, HOLD + DROP + FUSE);

  // Ajastin päättää intron, vaikka välilehti olisi taustalla eikä animaatio pyörisi.
  later(finish, HOLD + DROP + FUSE + BLAST + 150);
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
    msg.textContent = 'Rakennetaan';
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
previews();
pipeline();
builder();
metrics();
