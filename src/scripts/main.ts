/**
 * Sivun kaikki selainlogiikka. Ei kirjastoja: CSS, Web Animations API ja IntersectionObserver.
 * Sisältö näkyy ilman tätä skriptiä. Skripti lisää vain liikkeen ja mittaukset.
 */
import { intro } from './intro.ts';
import { ASSEMBLE_SECONDS, createAssembler, type Assembler } from './builder-gl.ts';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fi = (value: number, digits = 0) => value.toFixed(digits).replace('.', ',');

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

/* ---------- Intron uusinta ---------- */
function replay(): void {
  const button = $<HTMLButtonElement>('#replay');
  // Nappia ei näytetä, jos liikettä on rajoitettu: silloin introa ei ole lainkaan.
  if (reduce) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    try {
      sessionStorage.removeItem('intro-seen');
    } catch {
      // Jos tallennus on estetty, intro näkyy joka latauksella muutenkin.
    }
    // Sivu ladataan uudelleen ylhäältä, jolloin intro alkaa puhtaalta pöydältä.
    history.scrollRestoration = 'manual';
    scrollTo(0, 0);
    location.reload();
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
  for (const el of items) {
    // Saman ryhmän sisarukset ilmestyvät porrastetusti, enintään neljän askeleen viiveellä.
    const siblings = [...(el.parentElement?.children ?? [])].filter((child) => child.classList.contains('rv'));
    const step = Math.min(siblings.indexOf(el), 4);
    if (step > 0) el.style.transitionDelay = `${step * 70}ms`;
    observer.observe(el);
  }
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

  // Pitkä viesti vierii kiinteän korkuisessa ikkunassa. Hiiri tai kohdistus pysäyttää sen lukemista varten.
  for (const view of $$('[data-chat]')) {
    const track = view.firstElementChild as HTMLElement;
    let animation: Animation | null = null;
    let visible = false;
    let held = false;
    const sync = () => {
      if (!animation) return;
      if (visible && !held) animation.play();
      else animation.pause();
    };
    const build = () => {
      animation?.cancel();
      animation = null;
      const distance = track.scrollHeight - view.clientHeight;
      view.classList.toggle('auto', distance > 8);
      if (distance <= 8) return;
      animation = track.animate(
        [
          { transform: 'translateY(0)', offset: 0 },
          { transform: 'translateY(0)', offset: 0.1, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: 'translateY(' + -distance + 'px)', offset: 0.9 },
          { transform: 'translateY(' + -distance + 'px)', offset: 1 },
        ],
        // Viive antaa rivien ilmestyä ensin. Nopeus on noin 22 pikseliä sekunnissa.
        { duration: Math.max(9000, distance * 45), iterations: Infinity, direction: 'alternate', delay: 5200 },
      );
      animation.pause();
      sync();
    };
    build();
    new ResizeObserver(build).observe(view);
    whenVisible(view, (now) => {
      visible = now;
      sync();
    });
    const hold = (value: boolean) => () => {
      held = value;
      sync();
    };
    view.addEventListener('pointerenter', hold(true));
    view.addEventListener('pointerleave', hold(false));
    view.addEventListener('focus', hold(true));
    view.addEventListener('blur', hold(false));
  }

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
      const end = `translateY(${(-travel * 100).toFixed(2)}%)`;
      // Kuva lepää hetken ylhäällä ja alhaalla, jotta vieritys näyttää harkitulta eikä heilurilta.
      const animation = img.animate(
        [
          { transform: 'translateY(0)', offset: 0 },
          { transform: 'translateY(0)', offset: 0.06, easing: 'cubic-bezier(.45,0,.55,1)' },
          { transform: end, offset: 0.94 },
          { transform: end, offset: 1 },
        ],
        { duration, iterations: Infinity, direction: 'alternate', delay: 400 },
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
  const blocks = slots.map((slot) => slot.firstElementChild as HTMLElement);
  const hit = $<HTMLButtonElement>('#build-btn');
  const auto = $<HTMLButtonElement>('#build-auto');
  const pct = $('#build-pct');
  const clock = $('#build-time');
  const msg = $('#build-msg');
  const wp = $('#build-wp');
  const TOTAL_PLUGINS = 47;
  let placed = 0;      // montako palaa on lyöty
  let landed = 0;      // montako on jo paikallaan
  let startedAt = 0;
  let ticker = 0;
  let autoTimer = 0;
  let plugin = 0;
  let busy = false;    // purku käynnissä
  let assembler: Assembler | null = null;

  /** Näytönohjainefektit luodaan vasta ensimmäisellä lyönnillä ja uudelleen, jos lavan koko on muuttunut. */
  const effects = (): Assembler | null => {
    if (reduce) return null;
    const rect = stage.getBoundingClientRect();
    if (assembler && (Math.abs(assembler.width - rect.width) > 1 || Math.abs(assembler.height - rect.height) > 1)) {
      if (placed > 0) return null; // kesken rakennuksen muuttunut lava: loput palat varatoteutuksella
      assembler.dispose();
      assembler = null;
      // Menetetty konteksti ei palaudu samalle canvasille, joten tilalle vaihdetaan uusi.
      const old = $('#stage-fx');
      const fresh = old.cloneNode() as HTMLCanvasElement;
      old.replaceWith(fresh);
    }
    assembler ??= createAssembler($<HTMLCanvasElement>('#stage-fx') as HTMLCanvasElement, stage, blocks);
    return assembler;
  };

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

  /** Pala on paikallaan: DOM-versio näkyviin, lava tärähtää ja viimeisen jälkeen työ on valmis. */
  const land = (index: number, sparks: boolean) => {
    slots[index]!.classList.add('placed');
    if (sparks) assembler?.land(index);
    if (!reduce) stage.animate([{ transform: 'none' }, { transform: 'translateY(3px)' }, { transform: 'none' }], { duration: 160 });
    landed++;
    if (landed === slots.length) finish();
  };

  const place = () => {
    if (busy || placed >= slots.length) return;
    if (placed === 0) start();
    const index = placed;
    placed++;
    mark();
    if (placed < slots.length && !auto.disabled) msg.textContent = `${placed}/${slots.length} palaa paikallaan`;

    const fx = effects();
    if (fx) {
      // Sirpaleet lentävät paikalleen, ja valmis pala vaihtuu oikeaksi elementiksi.
      fx.assemble(index);
      setTimeout(() => land(index, true), ASSEMBLE_SECONDS * 1000);
      return;
    }
    // Varatoteutus: pala putoaa ylhäältä. Liikkeen rajoituksella se vain ilmestyy.
    const block = blocks[index]!;
    if (reduce) {
      land(index, false);
      return;
    }
    slots[index]!.classList.add('placed');
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
    setTimeout(() => land(index, false), 300);
  };

  const clear = () => {
    placed = 0;
    landed = 0;
    startedAt = 0;
    busy = false;
    slots.forEach((slot) => slot.classList.remove('placed'));
    stage.classList.remove('done');
    clock.textContent = '0,0 s';
    msg.textContent = 'Lyökää ensimmäinen pala paikalleen.';
    wp.textContent = '';
    hit.textContent = 'Lyö pala paikalleen';
    hit.disabled = false;
    auto.hidden = false;
    mark();
  };

  const demolish = () => {
    clearInterval(ticker);
    clearInterval(autoTimer);
    const fx = effects();
    if (!fx) {
      clear();
      return;
    }
    // Valmis sivu räjähtää sirpaleiksi samalla tavalla kuin intron WordPress.
    busy = true;
    hit.disabled = true;
    msg.textContent = 'Puretaan';
    slots.forEach((slot) => slot.classList.remove('placed'));
    stage.classList.remove('done');
    fx.explode();
    stage.animate(
      [0, -7, 6, -4, 3, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 4 : -3}px)` })),
      { duration: 380 },
    );
    setTimeout(clear, 1300);
  };

  hit.addEventListener('click', () => (placed >= slots.length ? demolish() : place()));
  // Lavaa voi myös napauttaa suoraan. Valmiin sivun linkki toimii normaalisti.
  stage.addEventListener('click', (event) => {
    if (placed >= slots.length) return;
    event.preventDefault();
    place();
  });
  auto.addEventListener('click', () => {
    if (busy || placed >= slots.length) return;
    auto.disabled = true;
    msg.textContent = 'Rakennetaan';
    place();
    autoTimer = window.setInterval(place, reduce ? 0 : 260);
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
replay();
reveal();
previews();
pipeline();
builder();
metrics();
