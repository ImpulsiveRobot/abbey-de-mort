// Atmospheric WebGL2 3D Renderer for Abbaye de Mort
// Supports dynamic sky dome (storm dusk -> night -> fire -> dawn), 10 dynamic point lights,
// directional moonlight/sunlight, height + distance fog, emissive stained glass, particles & tracers.

import { mat4Identity, mat4Multiply, mat4Model } from './math.js';
import { createTextureAtlas } from './textures.js';

const WORLD_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNorm;
layout(location = 2) in vec2 aUV;
layout(location = 3) in vec3 aColor;

uniform mat4 uViewProj;
uniform mat4 uModel;

out vec3 vWorldPos;
out vec3 vNormal;
out vec2 vUV;
out vec3 vColor;

void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorldPos = wp.xyz;
  vNormal = normalize(mat3(uModel) * aNorm);
  vUV = aUV;
  vColor = aColor;
  gl_Position = uViewProj * wp;
}
`;

const WORLD_FS = `#version 300 es
precision highp float;

in vec3 vWorldPos;
in vec3 vNormal;
in vec2 vUV;
in vec3 vColor;

uniform sampler2D uTex;
uniform vec3 uCamPos;
uniform vec3 uTint;
uniform float uEmissive;

// Atmospheric lighting
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbientSky;
uniform vec3 uAmbientGround;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uLightning;

// Up to 10 dynamic point lights (torches, braziers, muzzle flash, flares)
uniform int uLightCount;
uniform vec4 uLightPosRad[10];   // xyz = pos, w = radius
uniform vec4 uLightColInt[10];   // rgb = color, w = intensity

out vec4 fragColor;

void main() {
  vec4 texel = texture(uTex, vUV);
  vec3 albedo = texel.rgb * vColor * uTint;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);

  // Hemisphere ambient
  float hemi = N.y * 0.5 + 0.5;
  vec3 lighting = mix(uAmbientGround, uAmbientSky, hemi);

  // Directional moon/dawn sun + lightning flash
  vec3 Ldir = normalize(uSunDir);
  float ndotl = max(dot(N, Ldir), 0.0);
  vec3 sunBoost = uSunColor + vec3(0.65, 0.78, 1.0) * uLightning;
  lighting += sunBoost * ndotl;

  // Rim/wetness specular highlight
  vec3 H = normalize(Ldir + V);
  float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.18;
  lighting += sunBoost * spec;

  // Dynamic point lights (torches, muzzle flashes, crimson resistance flares)
  for (int i = 0; i < 10; i++) {
    if (i >= uLightCount) break;
    vec3 lpos = uLightPosRad[i].xyz;
    float rad = uLightPosRad[i].w;
    vec3 toL = lpos - vWorldPos;
    float d = length(toL);
    if (d < rad) {
      vec3 L = toL / max(d, 0.001);
      float atten = 1.0 - (d / rad);
      atten = atten * atten;
      float diff = max(dot(N, L), 0.0) * 0.85 + 0.15;
      lighting += uLightColInt[i].rgb * (uLightColInt[i].w * atten * diff);
    }
  }

  vec3 col = albedo * lighting + albedo * uEmissive;

  // Height-enhanced atmospheric fog (thicker down in the 100m valley chasm!)
  float dist = length(uCamPos - vWorldPos);
  float valleyMist = clamp((-vWorldPos.y - 3.0) / 55.0, 0.0, 1.0);
  float fogAmt = 1.0 - exp(-pow(dist * uFogDensity, 1.55));
  fogAmt = clamp(fogAmt + valleyMist * 0.72, 0.0, 0.96);

  vec3 fogCol = uFogColor + vec3(0.22, 0.28, 0.42) * uLightning;
  col = mix(col, fogCol, fogAmt);

  // Filmic tone curve + slight contrast
  col = col / (col + vec3(0.75));
  col = pow(max(col, vec3(0.0)), vec3(0.92));

  fragColor = vec4(col, 1.0);
}
`;

const SKY_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vNDC;
void main() {
  vNDC = aPos;
  gl_Position = vec4(aPos, 0.9999, 1.0);
}
`;

const SKY_FS = `#version 300 es
precision highp float;
in vec2 vNDC;

uniform vec3 uCamForward;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTime;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uFogColor;
uniform vec3 uSunDir;
uniform float uLightning;
uniform float uDawn;

out vec4 fragColor;

// Fast layered noise for dramatic storm clouds
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.05;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(
    uCamForward +
    uCamRight * (vNDC.x * uAspect * uTanHalfFov) +
    uCamUp * (vNDC.y * uTanHalfFov)
  );

  float h = clamp(dir.y, -0.35, 1.0);
  vec3 col = mix(uSkyHorizon, uSkyZenith, pow(max(h, 0.0), 0.65));

  // Below horizon: misty valley void
  if (dir.y < 0.02) {
    col = mix(uFogColor * 0.72, uSkyHorizon, smoothstep(-0.22, 0.02, dir.y));
  } else {
    // Cloud layer
    vec2 cloudUV = dir.xz / (dir.y + 0.22) * 0.85 + vec2(uTime * 0.014, uTime * 0.008);
    float c = fbm(cloudUV * 2.1);
    float cloudMask = smoothstep(0.36, 0.78, c) * smoothstep(0.0, 0.22, dir.y);
    vec3 cloudLit = mix(uSkyZenith * 0.55, uSkyHorizon * 1.15, 0.45 + 0.4 * uDawn);
    cloudLit += vec3(0.6, 0.72, 0.95) * uLightning * 0.9;
    col = mix(col, cloudLit, cloudMask * 0.72);

    // Moon / Dawn sun glow
    float sdot = max(dot(dir, normalize(uSunDir)), 0.0);
    vec3 sunTint = mix(vec3(0.76, 0.86, 1.0), vec3(1.0, 0.68, 0.34), uDawn);
    col += sunTint * pow(sdot, 14.0) * (0.35 + 0.55 * uDawn);
    col += sunTint * smoothstep(0.996, 0.9992, sdot) * 1.4;

    // Sweeping German anti-aircraft / cliff searchlights in distance (during night acts)
    float nightVis = 1.0 - uDawn * 0.85;
    if (nightVis > 0.05) {
      float sweep1 = sin(uTime * 0.38) * 0.45 + 0.55;
      float beam1 = max(dot(normalize(vec2(dir.x, dir.z)), normalize(vec2(cos(sweep1), sin(sweep1)))), 0.0);
      float cone1 = pow(beam1, 140.0) * smoothstep(0.02, 0.35, dir.y) * (1.0 - smoothstep(0.5, 0.9, dir.y));
      float sweep2 = cos(uTime * 0.27 + 1.2) * 0.5 - 2.1;
      float beam2 = max(dot(normalize(vec2(dir.x, dir.z)), normalize(vec2(cos(sweep2), sin(sweep2)))), 0.0);
      float cone2 = pow(beam2, 160.0) * smoothstep(0.02, 0.32, dir.y) * (1.0 - smoothstep(0.55, 0.9, dir.y));
      col += vec3(0.65, 0.76, 0.92) * (cone1 + cone2) * 0.32 * nightVis;
    }
  }

  col += vec3(0.45, 0.56, 0.78) * uLightning * 0.55;
  fragColor = vec4(col, 1.0);
}
`;

const PARTICLE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec4 aColor;
layout(location = 2) in float aSize;

uniform mat4 uViewProj;
uniform float uViewportH;

out vec4 vColor;

void main() {
  vec4 clip = uViewProj * vec4(aPos, 1.0);
  gl_Position = clip;
  float dist = max(clip.w, 0.35);
  gl_PointSize = clamp((aSize * uViewportH) / dist, 1.5, 96.0);
  vColor = aColor;
}
`;

const PARTICLE_FS = `#version 300 es
precision highp float;
in vec4 vColor;
out vec4 fragColor;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float r2 = dot(c, c);
  if (r2 > 0.25) discard;
  float soft = smoothstep(0.25, 0.02, r2);
  fragColor = vec4(vColor.rgb, vColor.a * soft);
}
`;

const LINE_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec4 aColor;
uniform mat4 uViewProj;
out vec4 vColor;
void main() {
  gl_Position = uViewProj * vec4(aPos, 1.0);
  vColor = aColor;
}
`;

const LINE_FS = `#version 300 es
precision highp float;
in vec4 vColor;
out vec4 fragColor;
void main() {
  fragColor = vColor;
}
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile error: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('Program link error: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

// Helper to accumulate boxes into vertex arrays (pos3, norm3, uv2, col3 = 11 floats)
export class MeshBuilder {
  constructor() {
    this.verts = [];
    this.indices = [];
    this.vCount = 0;
  }

  addBox(cx, cy, cz, sx, sy, sz, color = [1, 1, 1], uvScale = 0.28) {
    const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
    const [r, g, b] = color;
    const faces = [
      // +Z front
      { n: [0, 0, 1],  u: sx * uvScale, v: sy * uvScale, pts: [[-hx,-hy,hz], [hx,-hy,hz], [hx,hy,hz], [-hx,hy,hz]] },
      // -Z back
      { n: [0, 0, -1], u: sx * uvScale, v: sy * uvScale, pts: [[hx,-hy,-hz], [-hx,-hy,-hz], [-hx,hy,-hz], [hx,hy,-hz]] },
      // +X right
      { n: [1, 0, 0],  u: sz * uvScale, v: sy * uvScale, pts: [[hx,-hy,hz], [hx,-hy,-hz], [hx,hy,-hz], [hx,hy,hz]] },
      // -X left
      { n: [-1, 0, 0], u: sz * uvScale, v: sy * uvScale, pts: [[-hx,-hy,-hz], [-hx,-hy,hz], [-hx,hy,hz], [-hx,hy,-hz]] },
      // +Y top
      { n: [0, 1, 0],  u: sx * uvScale, v: sz * uvScale, pts: [[-hx,hy,hz], [hx,hy,hz], [hx,hy,-hz], [-hx,hy,-hz]] },
      // -Y bottom
      { n: [0, -1, 0], u: sx * uvScale, v: sz * uvScale, pts: [[-hx,-hy,-hz], [hx,-hy,-hz], [hx,-hy,hz], [-hx,-hy,hz]] },
    ];

    for (const f of faces) {
      const base = this.vCount;
      const uvs = [[0, f.v], [f.u, f.v], [f.u, 0], [0, 0]];
      for (let i = 0; i < 4; i++) {
        const p = f.pts[i];
        // Subtle vertical ambient occlusion baked into vertex color
        const ao = p[1] < 0 ? 0.84 : 1.0;
        this.verts.push(
          cx + p[0], cy + p[1], cz + p[2],
          f.n[0], f.n[1], f.n[2],
          uvs[i][0], uvs[i][1],
          r * ao, g * ao, b * ao
        );
      }
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      this.vCount += 4;
    }
  }

  // Quad with explicit corners (for stained glass windows, ramps, arches, parachutes)
  addQuad(p0, p1, p2, p3, norm, color = [1, 1, 1], uvMax = [1, 1]) {
    const base = this.vCount;
    const pts = [p0, p1, p2, p3];
    const uvs = [[0, uvMax[1]], [uvMax[0], uvMax[1]], [uvMax[0], 0], [0, 0]];
    for (let i = 0; i < 4; i++) {
      this.verts.push(
        pts[i][0], pts[i][1], pts[i][2],
        norm[0], norm[1], norm[2],
        uvs[i][0], uvs[i][1],
        color[0], color[1], color[2]
      );
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.vCount += 4;
  }

  upload(gl) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.STATIC_DRAW);

    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    const useUint32 = this.vCount > 65535;
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      useUint32 ? new Uint32Array(this.indices) : new Uint16Array(this.indices),
      gl.STATIC_DRAW
    );

    const stride = 11 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, 6 * 4);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 8 * 4);

    gl.bindVertexArray(null);
    return {
      vao,
      count: this.indices.length,
      indexType: useUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
    };
  }
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is required to play Abbaye de Mort.');
    this.gl = gl;

    this.textures = createTextureAtlas(gl);
    this.worldProg = linkProgram(gl, WORLD_VS, WORLD_FS);
    this.skyProg = linkProgram(gl, SKY_VS, SKY_FS);
    this.particleProg = linkProgram(gl, PARTICLE_VS, PARTICLE_FS);
    this.lineProg = linkProgram(gl, LINE_VS, LINE_FS);

    this.worldLoc = {
      uViewProj: gl.getUniformLocation(this.worldProg, 'uViewProj'),
      uModel: gl.getUniformLocation(this.worldProg, 'uModel'),
      uTex: gl.getUniformLocation(this.worldProg, 'uTex'),
      uCamPos: gl.getUniformLocation(this.worldProg, 'uCamPos'),
      uTint: gl.getUniformLocation(this.worldProg, 'uTint'),
      uEmissive: gl.getUniformLocation(this.worldProg, 'uEmissive'),
      uSunDir: gl.getUniformLocation(this.worldProg, 'uSunDir'),
      uSunColor: gl.getUniformLocation(this.worldProg, 'uSunColor'),
      uAmbientSky: gl.getUniformLocation(this.worldProg, 'uAmbientSky'),
      uAmbientGround: gl.getUniformLocation(this.worldProg, 'uAmbientGround'),
      uFogColor: gl.getUniformLocation(this.worldProg, 'uFogColor'),
      uFogDensity: gl.getUniformLocation(this.worldProg, 'uFogDensity'),
      uLightning: gl.getUniformLocation(this.worldProg, 'uLightning'),
      uLightCount: gl.getUniformLocation(this.worldProg, 'uLightCount'),
      uLightPosRad: gl.getUniformLocation(this.worldProg, 'uLightPosRad'),
      uLightColInt: gl.getUniformLocation(this.worldProg, 'uLightColInt'),
    };

    this.skyLoc = {
      uCamForward: gl.getUniformLocation(this.skyProg, 'uCamForward'),
      uCamRight: gl.getUniformLocation(this.skyProg, 'uCamRight'),
      uCamUp: gl.getUniformLocation(this.skyProg, 'uCamUp'),
      uTanHalfFov: gl.getUniformLocation(this.skyProg, 'uTanHalfFov'),
      uAspect: gl.getUniformLocation(this.skyProg, 'uAspect'),
      uTime: gl.getUniformLocation(this.skyProg, 'uTime'),
      uSkyZenith: gl.getUniformLocation(this.skyProg, 'uSkyZenith'),
      uSkyHorizon: gl.getUniformLocation(this.skyProg, 'uSkyHorizon'),
      uFogColor: gl.getUniformLocation(this.skyProg, 'uFogColor'),
      uSunDir: gl.getUniformLocation(this.skyProg, 'uSunDir'),
      uLightning: gl.getUniformLocation(this.skyProg, 'uLightning'),
      uDawn: gl.getUniformLocation(this.skyProg, 'uDawn'),
    };

    this.partLoc = {
      uViewProj: gl.getUniformLocation(this.particleProg, 'uViewProj'),
      uViewportH: gl.getUniformLocation(this.particleProg, 'uViewportH'),
    };

    this.lineLoc = {
      uViewProj: gl.getUniformLocation(this.lineProg, 'uViewProj'),
    };

    // Fullscreen sky quad
    this.skyVao = gl.createVertexArray();
    gl.bindVertexArray(this.skyVao);
    const sq = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sq);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Dynamic particle buffer (max 1400 particles)
    this.maxParticles = 1400;
    this.partData = new Float32Array(this.maxParticles * 8);
    this.partVao = gl.createVertexArray();
    gl.bindVertexArray(this.partVao);
    this.partVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.partData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 8 * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 8 * 4, 3 * 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * 4, 7 * 4);
    gl.bindVertexArray(null);

    // Dynamic line buffer (tracers, rain streaks)
    this.maxLineVerts = 1600;
    this.lineData = new Float32Array(this.maxLineVerts * 7);
    this.lineVao = gl.createVertexArray();
    gl.bindVertexArray(this.lineVao);
    this.lineVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.lineData.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 7 * 4, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 7 * 4, 3 * 4);
    gl.bindVertexArray(null);

    // Reusable unit box mesh for articulated dynamic entities
    const ub = new MeshBuilder();
    ub.addBox(0, 0, 0, 1, 1, 1, [1, 1, 1], 1);
    this.unitBox = ub.upload(gl);

    this.identity = mat4Identity();
    this.viewProj = new Float32Array(16);
    this.modelScratch = new Float32Array(16);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    return this.canvas.width / this.canvas.height;
  }

  beginFrame(viewMat, projMat, cam, atmosphere, lights, time) {
    const gl = this.gl;
    mat4Multiply(projMat, viewMat, this.viewProj);

    gl.clearColor(atmosphere.fogColor[0], atmosphere.fogColor[1], atmosphere.fogColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. Render procedural atmospheric sky dome
    gl.depthMask(false);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyProg);
    gl.uniform3fv(this.skyLoc.uCamForward, cam.forward);
    gl.uniform3fv(this.skyLoc.uCamRight, cam.right);
    gl.uniform3fv(this.skyLoc.uCamUp, cam.up);
    gl.uniform1f(this.skyLoc.uTanHalfFov, Math.tan(cam.fov * 0.5));
    gl.uniform1f(this.skyLoc.uAspect, this.canvas.width / this.canvas.height);
    gl.uniform1f(this.skyLoc.uTime, time);
    gl.uniform3fv(this.skyLoc.uSkyZenith, atmosphere.skyZenith);
    gl.uniform3fv(this.skyLoc.uSkyHorizon, atmosphere.skyHorizon);
    gl.uniform3fv(this.skyLoc.uFogColor, atmosphere.fogColor);
    gl.uniform3fv(this.skyLoc.uSunDir, atmosphere.sunDir);
    gl.uniform1f(this.skyLoc.uLightning, atmosphere.lightning);
    gl.uniform1f(this.skyLoc.uDawn, atmosphere.dawn);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 2. Setup world shader uniforms
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    gl.useProgram(this.worldProg);
    gl.uniformMatrix4fv(this.worldLoc.uViewProj, false, this.viewProj);
    gl.uniform3fv(this.worldLoc.uCamPos, cam.pos);
    gl.uniform3fv(this.worldLoc.uSunDir, atmosphere.sunDir);
    gl.uniform3fv(this.worldLoc.uSunColor, atmosphere.sunColor);
    gl.uniform3fv(this.worldLoc.uAmbientSky, atmosphere.ambientSky);
    gl.uniform3fv(this.worldLoc.uAmbientGround, atmosphere.ambientGround);
    gl.uniform3fv(this.worldLoc.uFogColor, atmosphere.fogColor);
    gl.uniform1f(this.worldLoc.uFogDensity, atmosphere.fogDensity);
    gl.uniform1f(this.worldLoc.uLightning, atmosphere.lightning);

    const posRad = new Float32Array(40);
    const colInt = new Float32Array(40);
    const count = Math.min(10, lights.length);
    for (let i = 0; i < count; i++) {
      const L = lights[i];
      posRad[i * 4] = L.x;
      posRad[i * 4 + 1] = L.y;
      posRad[i * 4 + 2] = L.z;
      posRad[i * 4 + 3] = L.radius;
      colInt[i * 4] = L.color[0];
      colInt[i * 4 + 1] = L.color[1];
      colInt[i * 4 + 2] = L.color[2];
      colInt[i * 4 + 3] = L.intensity;
    }
    gl.uniform1i(this.worldLoc.uLightCount, count);
    gl.uniform4fv(this.worldLoc.uLightPosRad, posRad);
    gl.uniform4fv(this.worldLoc.uLightColInt, colInt);
    gl.uniform1i(this.worldLoc.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
  }

  drawMesh(mesh, texName, modelMat = this.identity, tint = [1, 1, 1], emissive = 0) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.textures[texName] || this.textures.white);
    gl.uniformMatrix4fv(this.worldLoc.uModel, false, modelMat);
    gl.uniform3fv(this.worldLoc.uTint, tint);
    gl.uniform1f(this.worldLoc.uEmissive, emissive);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.count, mesh.indexType, 0);
  }

  drawBox(tx, ty, tz, sx, sy, sz, rotY, tint, texName = 'white', emissive = 0, rotX = 0, rotZ = 0) {
    mat4Model(tx, ty, tz, rotY, sx, sy, sz, rotX, rotZ, this.modelScratch);
    this.drawMesh(this.unitBox, texName, this.modelScratch, tint, emissive);
  }

  drawParticles(particles) {
    const gl = this.gl;
    const count = Math.min(particles.length, this.maxParticles);
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const o = i * 8;
      this.partData[o] = p.x;
      this.partData[o + 1] = p.y;
      this.partData[o + 2] = p.z;
      this.partData[o + 3] = p.r;
      this.partData[o + 4] = p.g;
      this.partData[o + 5] = p.b;
      this.partData[o + 6] = p.a;
      this.partData[o + 7] = p.size;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(this.particleProg);
    gl.uniformMatrix4fv(this.partLoc.uViewProj, false, this.viewProj);
    gl.uniform1f(this.partLoc.uViewportH, this.canvas.height);

    gl.bindVertexArray(this.partVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.partVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.partData.subarray(0, count * 8));
    gl.drawArrays(gl.POINTS, 0, count);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  drawLines(segments) {
    const gl = this.gl;
    const maxSegs = Math.floor(this.maxLineVerts / 2);
    const count = Math.min(segments.length, maxSegs);
    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const s = segments[i];
      const o = i * 14;
      this.lineData[o] = s.x1;
      this.lineData[o + 1] = s.y1;
      this.lineData[o + 2] = s.z1;
      this.lineData[o + 3] = s.r;
      this.lineData[o + 4] = s.g;
      this.lineData[o + 5] = s.b;
      this.lineData[o + 6] = s.a;

      this.lineData[o + 7] = s.x2;
      this.lineData[o + 8] = s.y2;
      this.lineData[o + 9] = s.z2;
      this.lineData[o + 10] = s.r;
      this.lineData[o + 11] = s.g;
      this.lineData[o + 12] = s.b;
      this.lineData[o + 13] = s.a * 0.25;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.useProgram(this.lineProg);
    gl.uniformMatrix4fv(this.lineLoc.uViewProj, false, this.viewProj);

    gl.bindVertexArray(this.lineVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineData.subarray(0, count * 14));
    gl.drawArrays(gl.LINES, 0, count * 2);

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
}
