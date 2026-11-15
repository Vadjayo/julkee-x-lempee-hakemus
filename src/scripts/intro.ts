/**
 * Intron ohjaus: pelimäinen välianimaatio, jossa feikki-WordPress räjäytetään.
 *
 * Aikajana (ms sivun avaamisesta):
 *      0  WordPress-näkymä, ilmoituksia kasautuu
 *   1500  elokuvarajaus ja tummennus, kohdelukko käy kohteet läpi
 *   2300  dynamiitti putoaa
 *   2750  sytytyslanka palaa, lähtölaskenta 3, 2, 1
 *   4100  välähdys ja osumapysäytys (90 ms), sitten räjähdys: sivu sirpaloituu näytönohjaimella (intro-gl.ts)
 *   5190  viimeinen sitkeä ilmoitus ilmestyy ja putoaa
 *   6040  intro häipyy, saavutusilmoitus jää hetkeksi oikean sivun päälle
 *
 * DOM-elementeissä animoidaan vain transform ja opacity. Räjähdys piirretään WebGL2:lla.
 * Jos WebGL2 puuttuu, käytetään tämän tiedoston Canvas 2D -hiukkasia ja lentäviä DOM-paloja.
 */
import { createShatter, snapshotPage, type Shatter } from './intro-gl.ts';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];
const root = document.documentElement;

const HOLD = 1500;
const CINE = 800;
const DROP = 450;
const FUSE = 1350;
const HITSTOP = 90;
const BLAST = 1000;
const ENCORE = 700;
const OUT = 'cubic-bezier(.16,1,.3,1)';
const fill = 'forwards' as const;

/* ---------- Hiukkaset ---------- */
type Particle = {
  kind: 'fire' | 'spark' | 'smoke' | 'chunk';
  x: number; y: number; vx: number; vy: number;
  px: number; py: number;
  age: number; life: number; size: number;
  rot: number; spin: number; tone: number;
};

/** Pehmeä pyöreä sivellin, jolla tuli ja savu piirretään. Tehdään kerran, käytetään joka ruudussa. */
function softDot(color: string): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const g = sprite.getContext('2d')!;
  const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 64, 64);
  return sprite;
}

function explosion(canvas: HTMLCanvasElement, ox: number, oy: number): () => void {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = innerWidth;
  const height = innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const scale = Math.min(1.25, Math.max(0.6, width / 1100)); // pienempi räjähdys pienellä näytöllä

  const sprites = [softDot('rgba(255,255,255,1)'), softDot('rgba(244,241,234,0.95)'), softDot('rgba(255,43,43,0.9)')];
  const smoke = softDot('rgba(29,35,39,0.55)');
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  const particles: Particle[] = [];
  const add = (kind: Particle['kind'], speed: number, life: number, size: number, tone = 0, up = 0) => {
    const angle = rand(0, Math.PI * 2);
    particles.push({
      kind, x: ox, y: oy, px: ox, py: oy,
      vx: Math.cos(angle) * speed * scale,
      vy: Math.sin(angle) * speed * scale - up * scale,
      age: 0, life, size: size * scale,
      rot: rand(0, 6), spin: rand(-9, 9), tone,
    });
  };
  for (let i = 0; i < 46; i++) add('fire', rand(40, 520), rand(0.35, 0.8), rand(60, 150), i % 3, 60);
  for (let i = 0; i < 130; i++) add('spark', rand(380, 1500), rand(0.5, 1.2), rand(1.5, 3.2), i % 2, 260);
  for (let i = 0; i < 26; i++) add('smoke', rand(30, 240), rand(1.0, 1.9), rand(110, 220), 0, 110);
  for (let i = 0; i < 26; i++) add('chunk', rand(300, 1000), rand(0.9, 1.5), rand(8, 20), i % 3, 320);

  let frame = 0;
  let last = performance.now();
  let elapsed = 0;
  const GRAVITY = 1700 * scale;

  const draw = (now: number) => {
    // Ensimmäisen ruudun aikaleima voi olla hieman käynnistyshetkeä aiempi, joten negatiivinen askel nollataan.
    const dt = Math.max(0, Math.min(0.033, (now - last) / 1000));
    last = now;
    elapsed += dt;
    ctx.clearRect(0, 0, width, height);

    // Paineaalto: nopeasti laajeneva, oheneva rengas.
    const wave = elapsed / 0.55;
    if (wave < 1) {
      const eased = 1 - (1 - wave) ** 3;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - wave)})`;
      ctx.lineWidth = 26 * scale * (1 - wave) + 2;
      ctx.beginPath();
      ctx.arc(ox, oy, eased * Math.max(width, height) * 0.75, 0, Math.PI * 2);
      ctx.stroke();
    }

    let alive = 0;
    // Savu ja sirpaleet alle, tuli ja kipinät päälle valoa lisäävällä sekoituksella.
    for (const pass of ['under', 'over'] as const) {
      ctx.globalCompositeOperation = pass === 'under' ? 'source-over' : 'lighter';
      for (const p of particles) {
        const glowing = p.kind === 'fire' || p.kind === 'spark';
        if (glowing !== (pass === 'over')) continue;
        if (pass === 'under') {
          // Fysiikka lasketaan kerran ruudussa, ensimmäisellä kierroksella kaikille.
        }
        const t = p.age / p.life;
        if (t >= 1) continue;
        alive++;
        if (p.kind === 'fire') {
          const size = p.size * (0.5 + t * 1.3);
          ctx.globalAlpha = (1 - t) ** 1.5;
          // Ydin on valkoinen, reunat punaisia: sävy tummenee iän mukana.
          const sprite = sprites[Math.min(2, p.tone + (t > 0.45 ? 1 : 0))]!;
          ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size);
        } else if (p.kind === 'spark') {
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = p.tone ? '#ff2b2b' : '#fff6e0';
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        } else if (p.kind === 'smoke') {
          const size = p.size * (0.6 + t * 2.2);
          ctx.globalAlpha = Math.min(1, t * 6) * (1 - t) * 0.9;
          ctx.drawImage(smoke, p.x - size / 2, p.y - size / 2, size, size);
        } else {
          ctx.globalAlpha = Math.min(1, (1 - t) * 3);
          ctx.fillStyle = ['#ffffff', '#1d2327', '#d63638'][p.tone]!;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;

    for (const p of particles) {
      if (p.age >= p.life) continue;
      p.age += dt;
      p.px = p.x;
      p.py = p.y;
      const drag = p.kind === 'spark' ? 0.985 : p.kind === 'chunk' ? 0.992 : 0.94;
      p.vx *= drag;
      p.vy *= drag;
      if (p.kind === 'spark' || p.kind === 'chunk') p.vy += GRAVITY * dt;
      if (p.kind === 'smoke' || p.kind === 'fire') p.vy -= 90 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }

    if (alive > 0) frame = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, width, height);
  };
  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
}

/* ---------- Ohjaus ---------- */
export function intro(): void {
  if (root.classList.contains('intro-done')) return;
  const overlay = $('#intro');
  const page = $('#intro-page');
  const hud = $('#intro-hud');
  const pct = $('#intro-pct');
  const meter = $('#intro-meter');
  const tnt = $('#intro-tnt');
  const count = $('#intro-count');
  const toast = $('#intro-toast');
  let done = false;
  let stopFx = () => {};
  let shatter: Shatter | null = null;
  let complete = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  // Vaiheet kirjataan juurielementtiin. Testit lukevat ne lopuksi sen sijaan, että kyttäisivät lyhyitä hetkiä.
  const stages: string[] = [];
  const stage = (name: string) => {
    stages.push(name);
    root.dataset.introStages = stages.join(' ');
  };

  const finish = (skipped: boolean) => {
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
      stopFx();
      root.classList.add('intro-done');
      root.dataset.introMs = String(Math.round(performance.now()));
    }, 400);
    stage(skipped ? 'ohitettu' : 'valmis');
    if (skipped) return;
    // Lopputila asetetaan myös tässä, jotta se ei jää hitaalla laitteella ajastimien varaan.
    complete = true;
    pct.textContent = 'Purettu 100 %';
    meter.style.transform = 'scaleX(1)';
    $('#intro-plugins').textContent = '0';
    // Saavutus liukuu sisään oikealta, viipyy ja poistuu. Vain transform, jotta teksti pysyy aina täysin luettavana.
    toast.classList.add('show');
    toast
      .animate(
        [
          { transform: 'translateX(130%)', offset: 0 },
          { transform: 'translateX(0)', offset: 0.14, easing: OUT },
          { transform: 'translateX(0)', offset: 0.86, easing: 'ease-in' },
          { transform: 'translateX(130%)', offset: 1 },
        ],
        { duration: 3200 },
      )
      .finished.then(() => toast.classList.remove('show'))
      .catch(() => {});
  };
  $('#intro-skip').addEventListener('click', () => finish(true));

  // Ilmoituksia tulee lisää, kuten oikeassakin ohjausnäkymässä.
  $$('.intro-notice.late').forEach((notice, i) => {
    later(() => {
      if (i === 0) stage('ilmoitukset');
      notice.style.visibility = 'visible';
      notice.animate([{ transform: 'translateY(-14px) scaleY(0.4)' }, { transform: 'none' }], { duration: 260, easing: OUT });
    }, 350 + i * 380);
  });

  // Elokuvarajaus laskeutuu, kuva tummenee reunoilta ja kohdelukko käy kohteet läpi.
  later(() => {
    stage('rajaus');
    // Varjostimet käännetään jo nyt, jotta räjähdyshetkellä ei tule viivettä.
    shatter = createShatter($<HTMLCanvasElement>('#intro-gl') as HTMLCanvasElement);
    $('#intro-letterbox').animate([{ transform: 'translateY(-100%)' }, { transform: 'none' }], { duration: 420, easing: OUT, fill });
    $('#intro-vignette').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill });
    page.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }], { duration: CINE + DROP + FUSE, easing: 'linear', fill });
    const lock = $('#intro-lock');
    const targets = [$('.intro-notices'), $('.intro-title'), $('.wp-cookie')];
    targets.forEach((target, i) => {
      later(() => {
        const r = target.getBoundingClientRect();
        const pad = 10;
        lock.style.width = `${r.width + pad * 2}px`;
        lock.style.height = `${r.height + pad * 2}px`;
        const at = `translate(${r.left - pad}px, ${r.top - pad}px)`;
        lock.animate(
          [
            { opacity: 1, transform: `${at} scale(1.18)` },
            { opacity: 1, transform: `${at} scale(1)`, offset: 0.5 },
            { opacity: 1, transform: `${at} scale(1)`, offset: 0.9 },
            { opacity: i === targets.length - 1 ? 0 : 1, transform: `${at} scale(1)` },
          ],
          { duration: 230, easing: OUT, fill },
        );
      }, 120 + i * 220);
    });
  }, HOLD);

  later(() => {
    stage('dynamiitti');
    tnt.animate(
      [
        { opacity: 1, transform: 'translateY(-110vh) rotate(-30deg)' },
        { opacity: 1, transform: 'translateY(0) rotate(6deg)', offset: 0.7 },
        { opacity: 1, transform: 'translateY(-16px) rotate(-3deg)', offset: 0.85 },
        { opacity: 1, transform: 'none' },
      ],
      { duration: DROP, easing: 'cubic-bezier(.4,0,.6,1)', fill },
    );
  }, HOLD + CINE);

  later(() => {
    // Lähtölaskenta: jokainen numero iskeytyy ruutuun ja kuva nytkähtää.
    [3, 2, 1].forEach((n, i) => {
      later(() => {
        stage(`laskenta-${n}`);
        count.dataset.t = String(n);
        count.animate(
          [
            { opacity: 1, transform: 'scale(2.2)' },
            { opacity: 1, transform: 'scale(1)', offset: 0.28, easing: 'ease-in' },
            { opacity: 1, transform: 'scale(0.94)', offset: 0.85 },
            { opacity: 0, transform: 'scale(0.9)' },
          ],
          { duration: FUSE / 3, easing: OUT },
        );
        page.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(5px)' }, { transform: 'translateY(0)' }], { duration: 140, composite: 'add' });
      }, (i * FUSE) / 3);
    });
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
  }, HOLD + CINE + DROP);

  later(() => {
    // Osuma: valkoinen ruutu ja lyhyt pysäytys ennen kuin mikään liikkuu. Se tekee iskusta painavan.
    const origin = tnt.getBoundingClientRect();
    const ox = origin.left + origin.width / 2;
    const oy = origin.top + origin.height / 2;
    $('#intro-flash').animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset: HITSTOP / 460 },
        { opacity: 0, offset: 1 },
      ],
      { duration: 460, easing: 'ease-out' },
    );
    tnt.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill });
    $('#intro-vignette').animate([{ opacity: 1 }, { opacity: 0.45 }], { duration: 900, delay: HITSTOP, fill });

    // Välähdyksen suojassa sivusta otetaan kuva, joka sirpaloidaan.
    const snapshot = shatter ? snapshotPage(page) : null;

    later(() => {
      const plugins = $('#intro-plugins');
      const start = performance.now();
      const COUNT = BLAST - 150;
      // Mittarit: purkuprosentti nousee ja lisäosalaskuri putoaa nollaan.
      const tick = (now: number) => {
        // Jos ruudunpäivitys laahaa, viimeinen ilmoitus on voinut jo nostaa lukeman sataan. Sitä ei ylikirjoiteta.
        if (done || complete) return;
        // Yksi prosentti jää odottamaan viimeistä ilmoitusta.
        const p = Math.min(0.99, (now - start) / COUNT);
        const label = `Purettu ${Math.round(p * 100)} %`;
        if (pct.textContent !== label) pct.textContent = label;
        const left = String(Math.round(47 * (1 - Math.min(1, p / 0.9))));
        if (plugins.textContent !== left) plugins.textContent = left;
        meter.style.transform = `scaleX(${p})`;
        if (p < 0.99) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      stage(shatter && snapshot ? 'rajahdys-webgl' : 'rajahdys-canvas');
      if (shatter && snapshot) {
        // DOM-sivu vaihtuu kuvaan, jonka näytönohjain räjäyttää. Alta paljastuu musta, kuten oikea sivu.
        page.style.display = 'none';
        $('#intro-vignette').style.visibility = 'hidden';
        overlay.style.background = '#000';
        shatter.start(snapshot, ox, oy);
        stopFx = () => shatter?.stop();
        return;
      }

      // Varatoteutus ilman WebGL2:ta.
      stopFx = explosion($<HTMLCanvasElement>('#intro-fx') as HTMLCanvasElement, ox, oy);

      // Kameran tärinä vaimenee nopeasti.
      const shake: Keyframe[] = Array.from({ length: 14 }, (_, i) => {
        const power = 16 * (1 - i / 14) ** 2;
        return { transform: `translate(${(Math.random() - 0.5) * 2 * power}px, ${(Math.random() - 0.5) * 2 * power}px)` };
      });
      overlay.animate([...shake, { transform: 'none' }], { duration: 620 });

      // Otsikko lentää kirjaimittain, palkki ja ilmoitukset kokonaisina kappaleina.
      const pieces: HTMLElement[] = [$('.intro-bar'), ...$$('.intro-notices .intro-notice'), ...$$('#intro-page [data-piece]')];
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
            { transform: 'none', easing: 'cubic-bezier(.1,.7,.3,1)' },
            { transform: `translate(${fx * 0.7}px, ${fy * 0.7}px) rotate(${rot * 0.6}deg)`, offset: 0.4, easing: 'cubic-bezier(.5,0,.9,.5)' },
            // Loppupiste on aina reilusti ruudun alapuolella, myös ylöspäin lentäneillä kappaleilla.
            { transform: `translate(${fx * 1.15}px, ${Math.max(fy * 0.7, 0) + innerHeight + 300}px) rotate(${rot}deg)` },
          ],
          { duration: BLAST * (0.8 + Math.random() * 0.2), fill },
        );
      }

    }, HITSTOP);
  }, HOLD + CINE + DROP + FUSE);

  later(() => {
    // Raunioille ilmestyy vielä yksi ilmoitus. Sekin lähtee.
    stage('viimeinen-ilmoitus');
    const straggler = $('#intro-straggler');
    straggler.style.visibility = 'visible';
    straggler.animate(
      [
        { transform: 'translateY(-16px) scaleY(0.4)', offset: 0 },
        { transform: 'none', offset: 0.22 },
        { transform: 'none', offset: 0.6 },
        { transform: 'rotate(4deg)', offset: 0.68 },
        { transform: `translateY(${innerHeight}px) rotate(38deg)`, offset: 1, easing: 'ease-in' },
      ],
      { duration: ENCORE, fill },
    );
    later(() => {
      complete = true;
      pct.textContent = 'Purettu 100 %';
      $('#intro-plugins').textContent = '0';
      meter.style.transform = 'scaleX(1)';
    }, ENCORE * 0.78);
  }, HOLD + CINE + DROP + FUSE + HITSTOP + BLAST);

  // Ajastin päättää intron, vaikka välilehti olisi taustalla eikä animaatio pyörisi.
  later(() => finish(false), HOLD + CINE + DROP + FUSE + HITSTOP + BLAST + ENCORE + 150);
}
