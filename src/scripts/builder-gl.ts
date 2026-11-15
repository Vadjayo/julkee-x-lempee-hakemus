/**
 * Rakennustyökalun näytönohjainefektit (WebGL2, ei kirjastoja).
 *
 * Intro hajottaa sivun sirpaleiksi. Tässä sama tapahtuu toisin päin: jokainen pala
 * kootaan sirpaleista, jotka lentävät paikalleen, ja osumakohta kipinöi. Purku
 * räjäyttää valmiin sivun samalla tavalla kuin intro.
 *
 * Jos WebGL2 ei ole käytössä, createAssembler palauttaa null ja työkalu käyttää
 * Web Animations API -varatoteutusta (ks. main.ts).
 */
import { PARTICLE_FS, PARTICLE_VS, paintDom, program } from './intro-gl.ts';

const MAX_BLOCKS = 8;
/** Kokoamisen kesto sekunteina: viimeinenkin sirpale on paikallaan tämän jälkeen. */
export const ASSEMBLE_SECONDS = 0.9;

const VS = `#version 300 es
in vec2 aPos;
in vec2 aCenter;
in vec3 aSeed;
in float aBlock;
uniform vec2 uRes;
uniform vec2 uOrigin;
uniform float uTime;
uniform float uBoom;
uniform float uStart[${MAX_BLOCKS}];
out vec2 vUv;
out float vLight;
out float vGlow;
out float vAlpha;
out float vBack;

mat3 rotation(vec3 axis, float a) {
  float s = sin(a), c = cos(a), oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,          oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
    oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c);
}

void main() {
  float start = uStart[int(aBlock + 0.5)];
  vec2 offset = vec2(0.0);
  float z = 0.0;
  float angle = 0.0;
  float moving = 1.0;
  vAlpha = 1.0;
  vGlow = 0.0;

  if (uBoom >= 0.0) {
    // Purku: paineaalto etenee keskeltä ja heittää sirpaleet ulos, painovoima vetää alas.
    vec2 d = aCenter - uOrigin;
    float dist = length(d);
    float t = max(0.0, uTime - uBoom - dist / 1800.0);
    float travel = (1.0 - exp(-2.4 * t)) / 2.4;
    offset = d / max(dist, 1.0) * (240.0 + 700.0 * aSeed.x) * (0.5 + 1.3 * exp(-dist / 280.0)) * travel;
    offset += vec2((aSeed.y - 0.5) * 160.0 * travel, -220.0 * aSeed.z * travel + 900.0 * t * t);
    z = (aSeed.z - 0.3) * 900.0 * travel;
    angle = (2.5 + 9.0 * aSeed.y) * t * (aSeed.x > 0.5 ? 1.0 : -1.0);
    moving = step(0.0001, t);
    vAlpha = 1.0 - smoothstep(0.75, 1.25, t);
    vGlow = exp(-dist / 220.0) * exp(-t * 4.0) * moving;
  } else if (start < 0.0) {
    vAlpha = 0.0;                                      // palaa ei ole vielä aloitettu tai se on jo DOM:ssa
  } else {
    // Kokoaminen: sirpale lähtee kaukaa ja hidastuu paikalleen. Jokaisella on oma pieni viive.
    float local = uTime - start;
    float u = clamp((local - aSeed.x * 0.3) / 0.6, 0.0, 1.0);
    float left = pow(1.0 - u, 3.0);                    // jäljellä oleva osuus matkasta
    vec2 dir = normalize(vec2(aSeed.y - 0.5, aSeed.z - 0.62) + vec2(0.0001));
    offset = dir * (220.0 + 520.0 * aSeed.x) * left;
    z = 760.0 * aSeed.z * left;
    angle = (3.0 + 9.0 * aSeed.y) * left * (aSeed.x > 0.5 ? 1.0 : -1.0);
    vAlpha = smoothstep(0.0, 0.18, u);
    vGlow = smoothstep(0.7, 1.0, u) * exp(-max(0.0, local - 0.75) * 9.0);
  }

  vec3 axis = normalize(aSeed * 2.0 - 1.0 + vec3(0.001));
  mat3 R = rotation(axis, angle);
  vec3 world = vec3(aCenter + offset, z) + R * vec3(aPos - aCenter, 0.0);
  float persp = 1000.0 / (1000.0 - min(world.z, 850.0));
  vec2 screen = (world.xy - uRes * 0.5) * persp + uRes * 0.5;
  gl_Position = vec4(screen.x / uRes.x * 2.0 - 1.0, 1.0 - screen.y / uRes.y * 2.0, -world.z / 4000.0, 1.0);

  vec3 n = R * vec3(0.0, 0.0, 1.0);
  vBack = step(n.z, 0.0);
  vec3 facing = n * sign(n.z + 0.0001);
  float spec = pow(max(dot(facing, normalize(vec3(-0.35, -0.55, 0.75))), 0.0), 24.0);
  vLight = mix(1.0, 0.35 + 0.65 * abs(n.z) + spec, moving * step(0.001, abs(angle)));
  vUv = aPos / uRes;
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUv;
in float vLight;
in float vGlow;
in float vAlpha;
in float vBack;
uniform sampler2D uPage;
out vec4 outColor;

void main() {
  vec4 page = texture(uPage, vUv);
  vec3 color = mix(page.rgb, vec3(0.2, 0.2, 0.21), vBack) * vLight;
  color += vec3(1.0, 0.4, 0.3) * vGlow * 0.38;         // osuman hehku
  float alpha = max(page.a, vBack) * vAlpha;
  outColor = vec4(color * alpha, alpha);
}`;

export type Assembler = {
  /** Kokoaa palan sirpaleista. Kutsuja näyttää DOM-palan ASSEMBLE_SECONDS kuluttua ja kutsuu sitten land(). */
  assemble(index: number): void;
  /** Piilottaa palan sirpaleet (DOM-pala on nyt näkyvissä) ja sytyttää kipinät osumakohtaan. */
  land(index: number): void;
  /** Räjäyttää koko valmiin sivun. */
  explode(): void;
  /** Lavan koko, jolle efektit on rakennettu. Jos lava on muuttunut, tee uusi. */
  readonly width: number;
  readonly height: number;
  dispose(): void;
};

export function createAssembler(canvas: HTMLCanvasElement, stage: HTMLElement, blocks: HTMLElement[]): Assembler | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl || blocks.length > MAX_BLOCKS) return null;
  const shardProgram = program(gl, VS, FS);
  const particleProgram = program(gl, PARTICLE_VS, PARTICLE_FS);
  if (!shardProgram || !particleProgram) return null;

  const frameRect = stage.getBoundingClientRect();
  const width = frameRect.width;
  const height = frameRect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  // Kuva valmiista sivusta. Palat ovat vielä piilossa, joten ne piirretään mittojensa perusteella.
  const snapshot = paintDom(stage, { width, height, originX: frameRect.left, originY: frameRect.top, includeHidden: true, skip: 'canvas' });
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshot);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  /* --- Sirpaleet: jokainen pala jaetaan omaksi kolmioverkokseen, jotta reunat pysyvät suorina --- */
  const data: number[] = [];
  const centers: [number, number][] = [];
  blocks.forEach((block, index) => {
    const r = block.getBoundingClientRect();
    const left = r.left - frameRect.left;
    const top = r.top - frameRect.top;
    centers.push([left + r.width / 2, top + r.height / 2]);
    const cols = Math.max(2, Math.round(r.width / 26));
    const rows = Math.max(2, Math.round(r.height / 22));
    const points: [number, number][] = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const edgeX = x === 0 || x === cols;
        const edgeY = y === 0 || y === rows;
        points.push([
          left + ((x + (edgeX ? 0 : (Math.random() - 0.5) * 0.7)) / cols) * r.width,
          top + ((y + (edgeY ? 0 : (Math.random() - 0.5) * 0.7)) / rows) * r.height,
        ]);
      }
    }
    const triangle = (a: [number, number], b: [number, number], c: [number, number]) => {
      const cx = (a[0] + b[0] + c[0]) / 3;
      const cy = (a[1] + b[1] + c[1]) / 3;
      const seed = [Math.random(), Math.random(), Math.random()];
      for (const p of [a, b, c]) data.push(p[0], p[1], cx, cy, ...seed, index);
    };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * (cols + 1) + x;
        const [a, b, c, d] = [points[i]!, points[i + 1]!, points[i + cols + 1]!, points[i + cols + 2]!];
        if (Math.random() < 0.5) {
          triangle(a, b, c);
          triangle(b, d, c);
        } else {
          triangle(a, b, d);
          triangle(a, d, c);
        }
      }
    }
  });
  const vertexCount = data.length / 8;
  const shardVao = gl.createVertexArray()!;
  gl.bindVertexArray(shardVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  const attr = (name: string, size: number, offset: number) => {
    const location = gl.getAttribLocation(shardProgram, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset);
  };
  attr('aPos', 2, 0);
  attr('aCenter', 2, 8);
  attr('aSeed', 3, 16);
  attr('aBlock', 1, 28);

  /* --- Kipinät: yksi välähdys, kipinöitä ja kekäleitä per osuma --- */
  const instances: number[] = [];
  for (const [kind, count] of [[5, 1], [1, 46], [3, 14]] as const) {
    for (let i = 0; i < count; i++) instances.push(Math.random(), Math.random(), Math.random(), Math.random(), kind);
  }
  const instanceCount = instances.length / 5;
  const particleVao = gl.createVertexArray()!;
  gl.bindVertexArray(particleVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(particleProgram, 'aCorner');
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(instances), gl.STATIC_DRAW);
  const instanceAttr = (name: string, size: number, offset: number) => {
    const location = gl.getAttribLocation(particleProgram, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 20, offset);
    gl.vertexAttribDivisor(location, 1);
  };
  instanceAttr('aSeed', 4, 0);
  instanceAttr('aKind', 1, 16);
  gl.bindVertexArray(null);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthFunc(gl.LEQUAL);

  const started = performance.now();
  const seconds = () => (performance.now() - started) / 1000;
  const starts = new Float32Array(MAX_BLOCKS).fill(-1);
  let bursts: { x: number; y: number; at: number; size: number }[] = [];
  let boom = -1;
  let frame = 0;
  let running = false;
  let disposed = false;

  const draw = () => {
    if (disposed) return;
    const time = seconds();
    bursts = bursts.filter((burst) => time - burst.at < 1.6);
    if (boom >= 0 && time - boom > 1.6) {
      boom = -1;
      starts.fill(-1);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(shardProgram);
    gl.uniform2f(gl.getUniformLocation(shardProgram, 'uRes'), width, height);
    gl.uniform2f(gl.getUniformLocation(shardProgram, 'uOrigin'), width / 2, height * 0.6);
    gl.uniform1f(gl.getUniformLocation(shardProgram, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(shardProgram, 'uBoom'), boom);
    gl.uniform1fv(gl.getUniformLocation(shardProgram, 'uStart'), starts);
    gl.uniform1i(gl.getUniformLocation(shardProgram, 'uPage'), 0);
    gl.bindVertexArray(shardVao);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(particleProgram);
    gl.uniform2f(gl.getUniformLocation(particleProgram, 'uRes'), width, height);
    gl.uniform2f(gl.getUniformLocation(particleProgram, 'uShake'), 0, 0);
    gl.bindVertexArray(particleVao);
    for (const burst of bursts) {
      gl.uniform2f(gl.getUniformLocation(particleProgram, 'uOrigin'), burst.x, burst.y);
      gl.uniform1f(gl.getUniformLocation(particleProgram, 'uTime'), time - burst.at);
      gl.uniform1f(gl.getUniformLocation(particleProgram, 'uScale'), burst.size);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, instanceCount);
    }

    const active = boom >= 0 || bursts.length > 0 || starts.some((start) => start >= 0);
    if (active) {
      frame = requestAnimationFrame(draw);
    } else {
      running = false;
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  };
  const wake = () => {
    if (running || disposed) return;
    running = true;
    frame = requestAnimationFrame(draw);
  };

  return {
    width,
    height,
    assemble(index) {
      starts[index] = seconds();
      wake();
    },
    land(index) {
      starts[index] = -1;
      const [x, y] = centers[index]!;
      bursts.push({ x, y, at: seconds(), size: 0.3 });
      wake();
    },
    explode() {
      // Kaikki palat piirretään paikallaan ja räjäytetään lavan keskeltä.
      starts.fill(0);
      boom = seconds();
      bursts.push({ x: width / 2, y: height * 0.6, at: boom, size: 0.55 });
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
