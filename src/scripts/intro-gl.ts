/**
 * Intron räjähdys näytönohjaimella (WebGL2, ei kirjastoja).
 *
 * 1. Feikki-WordPress piirretään kuvaksi ja kuva jaetaan satoihin kolmioihin.
 *    Paineaalto etenee dynamiitista ulospäin ja irrottaa jokaisen sirpaleen vuorollaan.
 *    Sirpaleet pyörivät kolmiulotteisesti, heijastavat valoa ja putoavat painovoiman mukana.
 * 2. Tuli, kipinät, savu, hehkuvat kekäleet ja paineaallon rengas ovat hiukkasia,
 *    joiden liike lasketaan kokonaan varjostimessa lähtöarvoista ja ajasta.
 *
 * Jos WebGL2 ei ole käytössä, createShatter palauttaa null ja intro käyttää
 * Canvas 2D -varatoteutusta (ks. intro.ts).
 */

const SHARD_VS = `#version 300 es
in vec2 aPos;
in vec2 aCenter;
in vec3 aSeed;
uniform vec2 uRes;
uniform vec2 uOrigin;
uniform vec2 uShake;
uniform float uTime;
uniform float uScale;
out vec2 vUv;
out float vLight;
out float vHeat;
out float vFade;
out float vBack;

mat3 rotation(vec3 axis, float a) {
  float s = sin(a), c = cos(a), oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,          oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
    oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c);
}

void main() {
  vec2 d = aCenter - uOrigin;
  float dist = length(d);
  // Paineaalto kulkee 2600 px sekunnissa: lähimmät sirpaleet irtoavat ensin.
  float t = max(0.0, uTime - dist / (2600.0 * uScale));
  float moving = step(0.0001, t);
  vec2 dir = d / max(dist, 1.0);
  float power = (420.0 + 1100.0 * aSeed.x) * (0.4 + 1.5 * exp(-dist / (420.0 * uScale))) * uScale;
  float travel = (1.0 - exp(-2.4 * t)) / 2.4;          // ilmanvastus hidastaa lentoa
  vec2 offset = dir * power * travel;
  offset.x += (aSeed.y - 0.5) * 220.0 * travel * uScale;
  offset.y += (-300.0 * aSeed.z * travel + 950.0 * t * t) * uScale;   // nousu ja painovoima
  float z = (aSeed.z - 0.3) * 1500.0 * travel * uScale;

  vec3 axis = normalize(aSeed * 2.0 - 1.0 + vec3(0.001));
  float angle = (2.5 + 9.0 * aSeed.y) * t * (aSeed.x > 0.5 ? 1.0 : -1.0);
  mat3 R = rotation(axis, angle);
  vec3 local = R * vec3(aPos - aCenter, 0.0);
  vec3 world = vec3(aCenter + offset, z) + local;

  float persp = 1000.0 / (1000.0 - min(world.z, 850.0));
  vec2 screen = (world.xy - uRes * 0.5) * persp + uRes * 0.5 + uShake;
  gl_Position = vec4(screen.x / uRes.x * 2.0 - 1.0, 1.0 - screen.y / uRes.y * 2.0, -world.z / 4000.0, 1.0);

  vec3 n = R * vec3(0.0, 0.0, 1.0);
  vBack = step(n.z, 0.0);
  vec3 facing = n * sign(n.z + 0.0001);
  float spec = pow(max(dot(facing, normalize(vec3(-0.35, -0.55, 0.75))), 0.0), 28.0);
  vLight = mix(1.0, 0.3 + 0.7 * abs(n.z) + spec * 0.9, moving);
  vHeat = exp(-dist / (300.0 * uScale)) * exp(-t * 3.5) * moving;
  vFade = 1.0 - smoothstep(0.95, 1.55, t);
  vUv = aPos / uRes;
}`;

const SHARD_FS = `#version 300 es
precision mediump float;
in vec2 vUv;
in float vLight;
in float vHeat;
in float vFade;
in float vBack;
uniform sampler2D uPage;
uniform float uVignette;
out vec4 outColor;

void main() {
  vec3 color = texture(uPage, vUv).rgb;
  // Sama reunojen tummennus kuin DOM-kerroksessa, jotta vaihto kuvaan ei näy.
  float r = length((vUv - vec2(0.5, 0.62)) / vec2(0.72, 0.9));
  color *= 1.0 - smoothstep(0.28, 1.0, r) * 0.88 * uVignette;
  color = mix(color, vec3(0.62, 0.63, 0.65), vBack);       // paperin harmaa kääntöpuoli
  color *= vLight;
  color += vec3(1.0, 0.5, 0.12) * vHeat * 1.6;             // liekin hehku lähellä räjähdystä
  outColor = vec4(color * vFade, vFade);
}`;

const PARTICLE_VS = `#version 300 es
in vec2 aCorner;
in vec4 aSeed;
in float aKind;
uniform vec2 uRes;
uniform vec2 uOrigin;
uniform vec2 uShake;
uniform float uTime;
uniform float uScale;
out vec2 vCorner;
out vec4 vSeed;
out float vKind;
out float vAge;

void main() {
  float t = uTime;
  float S = uScale;
  float angle = aSeed.x * 6.28318;
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 pos = uOrigin;
  vec2 along = vec2(1.0, 0.0);
  vec2 size = vec2(0.0);
  float life = 1.0;

  if (aKind < 0.5) {                                   // tuli
    life = 0.45 + 0.55 * aSeed.z;
    float travel = (1.0 - exp(-3.4 * t)) / 3.4;
    pos += dir * (60.0 + 560.0 * aSeed.y) * travel * S + vec2(0.0, -150.0 * t * S);
    size = vec2((80.0 + 170.0 * aSeed.w) * S * (0.45 + 1.7 * t / life));
  } else if (aKind < 1.5) {                            // kipinä, venytetään lentosuuntaan
    life = 0.5 + 0.9 * aSeed.z;
    float k = 1.5;
    float speed = 480.0 + 1700.0 * aSeed.y;
    pos += dir * speed * (1.0 - exp(-k * t)) / k * S + vec2(0.0, 850.0 * t * t * S);
    vec2 velocity = dir * speed * exp(-k * t) + vec2(0.0, 1700.0 * t);
    along = normalize(velocity);
    size = vec2(clamp(length(velocity) * 0.04, 5.0, 110.0), 1.6 + 2.2 * aSeed.w) * S;
  } else if (aKind < 2.5) {                            // savu
    life = 1.2 + 1.0 * aSeed.z;
    t = max(0.0, t - 0.08);
    pos += dir * (40.0 + 300.0 * aSeed.y) * (1.0 - exp(-2.0 * t)) / 2.0 * S + vec2(0.0, -130.0 * t * S);
    size = vec2((130.0 + 230.0 * aSeed.w) * S * (0.5 + 1.6 * t / life));
  } else if (aKind < 3.5) {                            // kekäle
    life = 1.3 + 1.2 * aSeed.z;
    pos += dir * (120.0 + 560.0 * aSeed.y) * (1.0 - exp(-1.3 * t)) / 1.3 * S;
    pos += vec2(sin(t * 5.0 + aSeed.w * 40.0) * 16.0, -70.0 * t + 160.0 * t * t) * S;
    size = vec2(4.0 + 6.0 * aSeed.w) * S;
  } else if (aKind < 4.5) {                            // paineaallon rengas
    life = 0.6;
    float p = clamp(t / life, 0.0, 1.0);
    size = vec2(max(uRes.x, uRes.y) * 1.9 * (1.0 - pow(1.0 - p, 3.0)));
  } else {                                             // välähdys räjähdyksen ytimessä
    life = 0.4;
    size = vec2((520.0 + 1300.0 * t) * S);
  }

  vAge = t / life;
  if (vAge >= 1.0) size = vec2(0.0);
  vec2 perp = vec2(-along.y, along.x);
  vec2 screen = pos + along * aCorner.x * size.x * 0.5 + perp * aCorner.y * size.y * 0.5 + uShake;
  gl_Position = vec4(screen.x / uRes.x * 2.0 - 1.0, 1.0 - screen.y / uRes.y * 2.0, 0.0, 1.0);
  vCorner = aCorner;
  vSeed = aSeed;
  vKind = aKind;
}`;

const PARTICLE_FS = `#version 300 es
precision mediump float;
in vec2 vCorner;
in vec4 vSeed;
in float vKind;
in float vAge;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float turbulence(vec2 p) { return noise(p) * 0.65 + noise(p * 2.3) * 0.35; }

void main() {
  float r = length(vCorner);
  float life = 1.0 - vAge;
  // Väri on valmiiksi kerrottu peitolla. Peitto 0 tarkoittaa valoa lisäävää sekoitusta.
  if (vKind < 0.5) {
    float n = turbulence(vCorner * 2.6 + vSeed.xy * 17.0 + vec2(0.0, vAge * 2.5));
    float shape = smoothstep(1.0, 0.1, r + (n - 0.5) * 0.8);
    float heat = shape * (1.0 - vAge * 0.85);
    vec3 color = mix(vec3(0.75, 0.1, 0.02), vec3(1.0, 0.45, 0.08), smoothstep(0.1, 0.45, heat));
    color = mix(color, vec3(1.0, 0.82, 0.35), smoothstep(0.45, 0.75, heat));
    color = mix(color, vec3(1.0), smoothstep(0.8, 1.0, heat));
    outColor = vec4(color * shape * life * 0.9, 0.0);
  } else if (vKind < 1.5) {
    float core = 1.0 - smoothstep(0.3, 1.0, abs(vCorner.y));
    float tail = smoothstep(-1.0, 0.4, vCorner.x);
    vec3 color = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.96, 0.82), life);
    outColor = vec4(color * core * tail * life * 1.4, 0.0);
  } else if (vKind < 2.5) {
    float n = turbulence(vCorner * 2.2 + vSeed.xy * 23.0 + vec2(0.0, vAge * 1.5));
    float shape = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.7);
    float alpha = shape * smoothstep(0.0, 0.12, vAge) * life * 0.6;
    vec3 color = vec3(0.05, 0.05, 0.06) + vec3(0.55, 0.2, 0.04) * (1.0 - smoothstep(0.0, 0.35, vAge)) * shape;
    outColor = vec4(color * alpha, alpha);
  } else if (vKind < 3.5) {
    float glow = pow(max(0.0, 1.0 - r), 1.5) * life * (0.6 + 0.4 * sin(vAge * 45.0 + vSeed.w * 60.0));
    outColor = vec4(vec3(1.0, 0.55, 0.15) * glow * 1.6, 0.0);
  } else if (vKind < 4.5) {
    float ring = smoothstep(0.07, 0.0, abs(r - 0.92)) * life;
    outColor = vec4(vec3(1.0, 0.92, 0.82) * ring * 0.75, 0.0);
  } else {
    float glow = pow(max(0.0, 1.0 - r), 2.0) * life;
    outColor = vec4(vec3(1.0, 0.86, 0.6) * glow * 1.5, 0.0);
  }
}`;

export type Shatter = {
  /** Käynnistää räjähdyksen. snapshot on kuva sivusta, origin räjähdyksen keskipiste CSS-pikseleinä. */
  start(snapshot: HTMLCanvasElement, originX: number, originY: number): void;
  stop(): void;
};

function program(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram | null {
  const build = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, build(gl.VERTEX_SHADER, vertex));
  gl.attachShader(prog, build(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Intron varjostin ei kääntynyt, käytetään varatoteutusta.', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

/** Valmistelee varjostimet ja geometrian etukäteen, jotta räjähdyshetkellä ei tule viivettä. */
export function createShatter(canvas: HTMLCanvasElement): Shatter | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;
  const shardProgram = program(gl, SHARD_VS, SHARD_FS);
  const particleProgram = program(gl, PARTICLE_VS, PARTICLE_FS);
  if (!shardProgram || !particleProgram) return null;

  const width = innerWidth;
  const height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const scale = Math.min(1.3, Math.max(0.55, width / 1100));

  /* --- Sirpaleet: ruudukko, jonka sisäpisteitä on siirretty satunnaisesti, jaettuna kolmioiksi --- */
  const cell = width < 700 ? 34 : 46;
  const cols = Math.max(6, Math.round(width / cell));
  const rows = Math.max(6, Math.round(height / cell));
  const points: [number, number][] = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      const edgeX = x === 0 || x === cols;
      const edgeY = y === 0 || y === rows;
      points.push([
        ((x + (edgeX ? 0 : (Math.random() - 0.5) * 0.72)) / cols) * width,
        ((y + (edgeY ? 0 : (Math.random() - 0.5) * 0.72)) / rows) * height,
      ]);
    }
  }
  const shardData: number[] = [];
  const triangle = (a: [number, number], b: [number, number], c: [number, number]) => {
    const cx = (a[0] + b[0] + c[0]) / 3;
    const cy = (a[1] + b[1] + c[1]) / 3;
    const seed = [Math.random(), Math.random(), Math.random()];
    for (const p of [a, b, c]) shardData.push(p[0], p[1], cx, cy, ...seed);
  };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * (cols + 1) + x;
      const [a, b, c, d] = [points[i]!, points[i + 1]!, points[i + cols + 1]!, points[i + cols + 2]!];
      // Halkaisijan suunta vaihtelee, jotta sirpaleista ei muodostu säännöllistä kuviota.
      if (Math.random() < 0.5) {
        triangle(a, b, c);
        triangle(b, d, c);
      } else {
        triangle(a, b, d);
        triangle(a, d, c);
      }
    }
  }
  const shardCount = shardData.length / 7;
  const shardVao = gl.createVertexArray()!;
  gl.bindVertexArray(shardVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shardData), gl.STATIC_DRAW);
  const shardAttr = (name: string, size: number, offset: number) => {
    const location = gl.getAttribLocation(shardProgram, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 28, offset);
  };
  shardAttr('aPos', 2, 0);
  shardAttr('aCenter', 2, 8);
  shardAttr('aSeed', 3, 16);

  /* --- Hiukkaset: yksi neliö, joka piirretään kerralla jokaiselle hiukkaselle --- */
  // Piirtojärjestys: savu alle, sitten valoa lisäävät tuli, rengas, välähdys, kipinät ja kekäleet.
  const mobile = width < 700;
  const kinds: [kind: number, count: number][] = [
    [2, mobile ? 22 : 38],
    [0, mobile ? 40 : 70],
    [4, 1],
    [5, 1],
    [1, mobile ? 140 : 260],
    [3, mobile ? 60 : 110],
  ];
  const instanceData: number[] = [];
  for (const [kind, count] of kinds) {
    for (let i = 0; i < count; i++) instanceData.push(Math.random(), Math.random(), Math.random(), Math.random(), kind);
  }
  const instanceCount = instanceData.length / 5;
  const particleVao = gl.createVertexArray()!;
  gl.bindVertexArray(particleVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(particleProgram, 'aCorner');
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instanceData), gl.STATIC_DRAW);
  const instanceAttr = (name: string, size: number, offset: number) => {
    const location = gl.getAttribLocation(particleProgram, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 20, offset);
    gl.vertexAttribDivisor(location, 1);
  };
  instanceAttr('aSeed', 4, 0);
  instanceAttr('aKind', 1, 16);
  gl.bindVertexArray(null);

  const texture = gl.createTexture();
  let frame = 0;
  let running = false;

  return {
    start(snapshot, originX, originY) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshot);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthFunc(gl.LEQUAL);

      const common = (prog: WebGLProgram, time: number, shakeX: number, shakeY: number) => {
        gl.useProgram(prog);
        gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), width, height);
        gl.uniform2f(gl.getUniformLocation(prog, 'uOrigin'), originX, originY);
        gl.uniform2f(gl.getUniformLocation(prog, 'uShake'), shakeX, shakeY);
        gl.uniform1f(gl.getUniformLocation(prog, 'uTime'), time);
        gl.uniform1f(gl.getUniformLocation(prog, 'uScale'), scale);
      };

      const began = performance.now();
      running = true;
      const draw = (now: number) => {
        if (!running) return;
        const time = Math.max(0, (now - began) / 1000);
        // Kameran tärinä vaimenee nopeasti.
        const power = 20 * scale * Math.exp(-time * 5.5);
        const shakeX = (Math.random() - 0.5) * 2 * power;
        const shakeY = (Math.random() - 0.5) * 2 * power;

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enable(gl.DEPTH_TEST);
        common(shardProgram, time, shakeX, shakeY);
        gl.uniform1f(gl.getUniformLocation(shardProgram, 'uVignette'), Math.max(0, 1 - time / 0.5));
        gl.uniform1i(gl.getUniformLocation(shardProgram, 'uPage'), 0);
        gl.bindVertexArray(shardVao);
        gl.drawArrays(gl.TRIANGLES, 0, shardCount);

        gl.disable(gl.DEPTH_TEST);
        common(particleProgram, time, shakeX, shakeY);
        gl.bindVertexArray(particleVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);

        if (time < 2.8) frame = requestAnimationFrame(draw);
        else gl.clear(gl.COLOR_BUFFER_BIT);
      };
      frame = requestAnimationFrame(draw);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
    },
  };
}

/**
 * Piirtää feikki-WordPressin kuvaksi DOM:n mittojen mukaan: taustat suorakulmioina
 * ja tekstit sana kerrallaan täsmälleen siihen kohtaan, jossa selain ne näyttää.
 */
export function snapshotPage(page: HTMLElement): HTMLCanvasElement {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#f0f0f1';
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  // Sivua on voitu hieman suurentaa animaatiolla. Fonttikoko skaalataan samassa suhteessa.
  const zoom = page.getBoundingClientRect().width / page.offsetWidth || 1;

  const visible = (el: Element) => getComputedStyle(el).visibility !== 'hidden' && !el.closest('.tnt');
  for (const box of page.querySelectorAll<HTMLElement>('.intro-bar, .intro-notices .intro-notice')) {
    if (!visible(box)) continue;
    const r = box.getBoundingClientRect();
    const style = getComputedStyle(box);
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(r.left, r.top, r.width, r.height);
    const border = parseFloat(style.borderLeftWidth);
    if (border > 0) {
      ctx.fillStyle = style.borderLeftColor;
      ctx.fillRect(r.left, r.top, border * zoom, r.height);
    }
  }

  const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  ctx.textBaseline = 'middle';
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || !node.data.trim() || !visible(parent)) continue;
    const style = getComputedStyle(parent);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize) * zoom}px ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    for (const word of node.data.matchAll(/\S+/g)) {
      range.setStart(node, word.index);
      range.setEnd(node, word.index + word[0].length);
      const r = range.getBoundingClientRect();
      ctx.fillText(word[0], r.left, r.top + r.height / 2);
    }
  }
  return canvas;
}
