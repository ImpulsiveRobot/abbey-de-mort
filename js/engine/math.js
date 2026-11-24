// Lightweight 3D Math & Collision utilities for Abbaye de Mort

export function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function len(v) {
  return Math.hypot(v.x, v.y, v.z);
}

export function distXZ(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function normalize(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function mat4Identity(out = new Float32Array(16)) {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function mat4Perspective(fovRad, aspect, near, far, out = new Float32Array(16)) {
  const f = 1.0 / Math.tan(fovRad * 0.5);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function mat4Multiply(a, b, out = new Float32Array(16)) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  for (let i = 0; i < 4; i++) {
    const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
    out[i * 4]     = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
  return out;
}

// Camera view matrix from position, yaw (0 = -Z), pitch (positive = up)
export function mat4FPSView(px, py, pz, yaw, pitch, roll = 0, out = new Float32Array(16)) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);

  // Forward vector in world space: (-sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch))
  const fx = -sy * cp;
  const fy = sp;
  const fz = -cy * cp;

  // Base right vector: (cos(yaw), 0, -sin(yaw))
  let rx = cy, ry = 0, rz = -sy;
  // Base up = cross(right, forward)
  let ux = ry * fz - rz * fy;
  let uy = rz * fx - rx * fz;
  let uz = rx * fy - ry * fx;

  if (roll !== 0) {
    const nrx = rx * cr + ux * sr;
    const nry = ry * cr + uy * sr;
    const nrz = rz * cr + uz * sr;
    const nux = -rx * sr + ux * cr;
    const nuy = -ry * sr + uy * cr;
    const nuz = -rz * sr + uz * cr;
    rx = nrx; ry = nry; rz = nrz;
    ux = nux; uy = nuy; uz = nuz;
  }

  out[0] = rx;  out[4] = ry;  out[8]  = rz;  out[12] = -(rx * px + ry * py + rz * pz);
  out[1] = ux;  out[5] = uy;  out[9]  = uz;  out[13] = -(ux * px + uy * py + uz * pz);
  out[2] = -fx; out[6] = -fy; out[10] = -fz; out[14] = (fx * px + fy * py + fz * pz);
  out[3] = 0;   out[7] = 0;   out[11] = 0;   out[15] = 1;
  return out;
}

export function mat4Model(tx, ty, tz, rotY = 0, sx = 1, sy = 1, sz = 1, rotX = 0, rotZ = 0, out = new Float32Array(16)) {
  const cy = Math.cos(rotY), sy_ = Math.sin(rotY);
  const cx = Math.cos(rotX), sx_ = Math.sin(rotX);
  const cz = Math.cos(rotZ), sz_ = Math.sin(rotZ);

  // R = Ry * Rx * Rz
  const m00 = cy * cz + sy_ * sx_ * sz_;
  const m01 = cx * sz_;
  const m02 = -sy_ * cz + cy * sx_ * sz_;

  const m10 = -cy * sz_ + sy_ * sx_ * cz;
  const m11 = cx * cz;
  const m12 = sy_ * sz_ + cy * sx_ * cz;

  const m20 = sy_ * cx;
  const m21 = -sx_;
  const m22 = cy * cx;

  out[0] = m00 * sx; out[1] = m01 * sx; out[2] = m02 * sx; out[3] = 0;
  out[4] = m10 * sy; out[5] = m11 * sy; out[6] = m12 * sy; out[7] = 0;
  out[8] = m20 * sz; out[9] = m21 * sz; out[10] = m22 * sz; out[11] = 0;
  out[12] = tx;      out[13] = ty;      out[14] = tz;      out[15] = 1;
  return out;
}

// Ray vs AABB intersection, returns distance t >= 0 or -1
export function rayAABB(ox, oy, oz, dx, dy, dz, box, maxDist = 200) {
  let tmin = 0;
  let tmax = maxDist;

  if (Math.abs(dx) < 1e-7) {
    if (ox < box.minX || ox > box.maxX) return -1;
  } else {
    const inv = 1 / dx;
    let t1 = (box.minX - ox) * inv;
    let t2 = (box.maxX - ox) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }

  if (Math.abs(dy) < 1e-7) {
    if (oy < box.minY || oy > box.maxY) return -1;
  } else {
    const inv = 1 / dy;
    let t1 = (box.minY - oy) * inv;
    let t2 = (box.maxY - oy) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }

  if (Math.abs(dz) < 1e-7) {
    if (oz < box.minZ || oz > box.maxZ) return -1;
  } else {
    const inv = 1 / dz;
    let t1 = (box.minZ - oz) * inv;
    let t2 = (box.maxZ - oz) * inv;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }

  return tmin >= 0 ? tmin : -1;
}

// Circle (XZ) vs AABB push-out resolution
export function resolveCircleAABB(pos, radius, footY, headY, box) {
  if (headY <= box.minY + 0.05 || footY >= box.maxY - 0.05) return false;
  const cx = clamp(pos.x, box.minX, box.maxX);
  const cz = clamp(pos.z, box.minZ, box.maxZ);
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return false;

  if (d2 > 1e-8) {
    const d = Math.sqrt(d2);
    const push = radius - d;
    pos.x += (dx / d) * push;
    pos.z += (dz / d) * push;
  } else {
    // Center inside box: push out along nearest face
    const left = Math.abs(pos.x - box.minX);
    const right = Math.abs(box.maxX - pos.x);
    const back = Math.abs(pos.z - box.minZ);
    const front = Math.abs(box.maxZ - pos.z);
    const m = Math.min(left, right, back, front);
    if (m === left) pos.x = box.minX - radius;
    else if (m === right) pos.x = box.maxX + radius;
    else if (m === back) pos.z = box.minZ - radius;
    else pos.z = box.maxZ + radius;
  }
  return true;
}

export function hasLineOfSight(ax, ay, az, bx, by, bz, colliders) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.01) return true;
  const ndx = dx / dist, ndy = dy / dist, ndz = dz / dist;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.bulletsPass) continue;
    const t = rayAABB(ax, ay, az, ndx, ndy, ndz, c, dist - 0.2);
    if (t > 0.05 && t < dist - 0.2) return false;
  }
  return true;
}
