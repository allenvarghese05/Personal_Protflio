import { MESAS, CAUSEWAYS, OBSTACLES, mesaById, zoneById } from '@/data/world';
import { worldState } from '@/lib/worldState';

/**
 * Navigation on the mesas: what's walkable, where the edges are, and how to
 * route between mesas along the causeways. Pure functions over data/world.js.
 */

const EDGE_MARGIN = 0.6; // keep the astronaut this far inside a mesa's rim

// Causeway segments in world space: from rim of A to rim of B.
const SEGMENTS = CAUSEWAYS.map((c) => {
  const A = mesaById(c.a);
  const B = mesaById(c.b);
  const dx = B.center[0] - A.center[0];
  const dz = B.center[1] - A.center[1];
  const len = Math.hypot(dx, dz);
  const ux = dx / len;
  const uz = dz / len;
  return {
    ...c,
    // run a little into each mesa so the joins are seamless
    start: [A.center[0] + ux * (A.r - 1.5), A.center[1] + uz * (A.r - 1.5)],
    end: [B.center[0] - ux * (B.r - 1.5), B.center[1] - uz * (B.r - 1.5)],
  };
});
export const causewaySegments = SEGMENTS;

function distToSegment(x, z, s) {
  const [ax, az] = s.start;
  const [bx, bz] = s.end;
  const vx = bx - ax;
  const vz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}

/** Which mesa (id) a point stands on, or null. */
export function mesaAt(x, z) {
  for (const m of MESAS) {
    if (Math.hypot(x - m.center[0], z - m.center[1]) <= m.r - EDGE_MARGIN) return m.id;
  }
  return null;
}

/** Which causeway a point stands on, or null. */
export function causewayAt(x, z) {
  for (const s of SEGMENTS) {
    if (distToSegment(x, z, s) <= s.w / 2 - 0.25) return s;
  }
  return null;
}

export const isWalkable = (x, z) => !!(mesaAt(x, z) || causewayAt(x, z));

/**
 * Resolve one movement step: stay on walkable ground (sliding along an edge
 * where possible) and never walk into a monolith or a station landmark.
 */
export function resolveStep(px, pz, nx, nz) {
  let x = nx;
  let z = nz;
  let blocked = false;
  if (!isWalkable(x, z)) {
    // slide along the edge: try each axis on its own
    blocked = true;
    if (isWalkable(nx, pz)) z = pz;
    else if (isWalkable(px, nz)) x = px;
    else return { x: px, z: pz, blocked: true, edge: true };
  }
  for (const m of OBSTACLES) {
    let ex = x - m.position[0];
    let ez = z - m.position[1];
    let d = Math.hypot(ex, ez);
    if (d < m.r) {
      // dead centre has no direction — push back the way we came
      if (d < 1e-4) {
        ex = px - m.position[0];
        ez = pz - m.position[1];
        d = Math.hypot(ex, ez) || 1;
      }
      const k = m.r / d;
      x = m.position[0] + ex * k;
      z = m.position[1] + ez * k;
      if (!isWalkable(x, z)) return { x: px, z: pz, blocked: true };
      return { x, z, blocked: true };
    }
  }
  return { x, z, blocked };
}

/** Distance from a point to the nearest mesa rim (Infinity on a causeway). */
export function edgeDistance(x, z) {
  const id = mesaAt(x, z);
  if (!id || causewayAt(x, z)) return Infinity;
  const m = mesaById(id);
  return m.r - EDGE_MARGIN - Math.hypot(x - m.center[0], z - m.center[1]);
}

const nearestMesa = (x, z) => {
  let best = null;
  let bd = Infinity;
  for (const m of MESAS) {
    const d = Math.hypot(x - m.center[0], z - m.center[1]) - m.r;
    if (d < bd) {
      bd = d;
      best = m.id;
    }
  }
  return best;
};

/**
 * Waypoints from (x,z) to a walkable target — straight if the line stays on
 * walkable ground, otherwise across the mesa graph via causeways (BFS).
 */
export function route(x, z, tx, tz) {
  const clear = (() => {
    for (let i = 1; i <= 24; i++) {
      const k = i / 24;
      if (!isWalkable(x + (tx - x) * k, z + (tz - z) * k)) return false;
    }
    return true;
  })();
  if (clear) return [[tx, tz]];

  const from = mesaAt(x, z) || nearestMesa(x, z);
  const to = mesaAt(tx, tz) || nearestMesa(tx, tz);
  if (from === to) return [[tx, tz]];

  // BFS over mesas
  const prev = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) break;
    for (const s of SEGMENTS) {
      const next = s.a === cur ? s.b : s.b === cur ? s.a : null;
      if (next && !(next in prev)) {
        prev[next] = { mesa: cur, seg: s };
        queue.push(next);
      }
    }
  }
  if (!(to in prev)) return [[tx, tz]];

  const hops = [];
  for (let m = to; prev[m]; m = prev[m].mesa) hops.unshift({ from: prev[m].mesa, seg: prev[m].seg });
  const pts = [];
  for (const h of hops) {
    const forward = h.seg.a === h.from;
    pts.push(forward ? h.seg.start : h.seg.end, forward ? h.seg.end : h.seg.start);
  }
  pts.push([tx, tz]);
  return pts;
}

/* ── Click-to-travel ─────────────────────────────────────────────────────── */

export const WALK_SPEED = 7;
export const TRAVEL_SPEED = 13;

/** Walk to a walkable point, routing across causeways if needed. */
export function walkTo(tx, tz, speed = WALK_SPEED) {
  worldState.path = route(worldState.pos.x, worldState.pos.z, tx, tz);
  worldState.pathSpeed = speed;
}

/** Dock travel: glide to a district's arrival point at travel pace. */
export function travelTo(zoneId) {
  const z = zoneById(zoneId);
  if (!z) return;
  walkTo(z.arrive[0], z.arrive[1], TRAVEL_SPEED);
}
