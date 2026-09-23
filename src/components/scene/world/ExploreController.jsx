'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { worldState } from '@/lib/worldState';
import { useStore } from '@/lib/store';
import { MONOLITHS, MONOLITH_NEAR_R, STATIONS, mesaById } from '@/data/world';
import { resolveStep, isWalkable, walkTo, edgeDistance, mesaAt, causewayAt, WALK_SPEED } from '@/lib/worldNav';

const LOOK_H = 1.3; // the orbit pivots around the astronaut's chest
const DIST_MIN = 4.5;
const DIST_MAX = 24;
const PITCH_MIN = 0.12;
const PITCH_MAX = 1.2;
const FOLLOW_AFTER_MS = 2600; // auto-follow waits this long after a manual look
// Mouse-look sensitivity — slow + cinematic (≈60% slower than the old 0.004).
const LOOK_SENS = 0.0016;
const DAMP = 0.05; // rotation damping factor (cinematic)

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

// keyboard movement — WASD and the arrow keys are equivalent
const KEYMAP = {
  w: 'f', arrowup: 'f',
  s: 'b', arrowdown: 'b',
  a: 'l', arrowleft: 'l',
  d: 'r', arrowright: 'r',
};

/**
 * Astronaut controller + third-person follow camera, on the mesas.
 *  - Click the ground → walk there, routed across causeways (lib/worldNav).
 *  - Click a monolith → it opens its project (the monolith handles that).
 *  - WASD / arrows → camera-relative walking; never off an edge.
 *  - Drag → orbit the camera. Walk up to a monolith → its preview + E opens.
 *  - Idle near a rim → the camera leans out over the cloud sea.
 * Movement state lives in worldState (no re-renders).
 */
export default function ExploreController({ astronautRef, moving }) {
  const { camera, gl } = useThree();
  const setNearZone = useStore((s) => s.setNearZone);
  const setNearProject = useStore((s) => s.setNearProject);
  const setNearStation = useStore((s) => s.setNearStation);

  const focus = useRef(null); // [x,z] of the monolith we're standing at
  const stall = useRef(0); // frames without progress while following a path
  const lookAt = useRef(new THREE.Vector3());
  const lookInit = useRef(false);
  const ray = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hit = useRef(new THREE.Vector3());
  const keys = useRef({ f: false, b: false, l: false, r: false });

  // Pointer: distinguish a click (walk-to) from a drag (orbit camera)
  useEffect(() => {
    const el = gl.domElement;
    let down = null; // { x, y, t, dragging }

    const onDown = (e) => {
      // No control until the landing cinematic hands off
      if (useStore.getState().journeyPhase !== 'world') return;
      down = { x: e.clientX, y: e.clientY, t: performance.now(), drag: 0 };
    };
    const onMove = (e) => {
      if (!down) return;
      down.drag += Math.abs(e.movementX) + Math.abs(e.movementY);
      // Incremental (not cumulative) so it doesn't compound; damped in useFrame
      if (down.drag > 6) {
        worldState.azimuthTarget -= e.movementX * LOOK_SENS;
        worldState.pitchTarget = THREE.MathUtils.clamp(worldState.pitchTarget + e.movementY * LOOK_SENS * 0.8, PITCH_MIN, PITCH_MAX);
        worldState.lastLook = performance.now();
      }
    };
    const onUp = (e) => {
      if (!down) return;
      // Ignore world clicks while inside the Mission Control room
      if (useStore.getState().enteredZone) { down = null; return; }
      const isClick = down.drag < 6 && performance.now() - down.t < 450;
      if (isClick) {
        const r = el.getBoundingClientRect();
        ndc.current.set(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1
        );
        ray.current.setFromCamera(ndc.current, camera);
        // a monolith under the pointer consumes the click (it opens itself)
        const onStone = worldState.interactives.length
          ? ray.current.intersectObjects(worldState.interactives, false).length > 0
          : false;
        if (!onStone && ray.current.ray.intersectPlane(plane.current, hit.current)) {
          // only walkable ground — clicks out over the clouds do nothing
          if (isWalkable(hit.current.x, hit.current.z)) walkTo(hit.current.x, hit.current.z, WALK_SPEED);
        }
      }
      down = null;
    };

    // Press E to open the monolith or enter the station you're standing at
    const onKey = (e) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      const s = useStore.getState();
      if (s.journeyPhase !== 'world' || s.enteredZone) return;
      if (s.nearProject) s.openProject(s.nearProject);
      else if (s.nearStation) s.setEnteredZone(s.nearStation);
    };

    // Hold WASD / arrows to walk (camera-relative). Arrows are captured so
    // they never scroll the page under the canvas.
    const onKeyDown = (e) => {
      const dir = KEYMAP[e.key.toLowerCase()];
      if (!dir) return;
      const s = useStore.getState();
      if (s.journeyPhase !== 'world' || s.enteredZone) return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
      keys.current[dir] = true;
    };
    const onKeyUp = (e) => {
      const dir = KEYMAP[e.key.toLowerCase()];
      if (dir) keys.current[dir] = false;
    };
    const onBlur = () => {
      keys.current.f = keys.current.b = keys.current.l = keys.current.r = false;
    };

    // Scroll to zoom — eased toward the target in useFrame
    const onWheel = (e) => {
      const s = useStore.getState();
      if (s.journeyPhase !== 'world' || s.enteredZone) return;
      e.preventDefault();
      worldState.distTarget = THREE.MathUtils.clamp(worldState.distTarget * Math.exp(e.deltaY * 0.0012), DIST_MIN, DIST_MAX);
      worldState.lastLook = performance.now();
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    // Test hooks — deterministic positioning for screenshots
    window.__walkTo = (x, z) => walkTo(x, z);
    window.__warp = (x, z) => {
      worldState.pos.set(x, 0, z);
      worldState.path = [];
    };
    window.__pos = () => [worldState.pos.x, worldState.pos.z];
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [camera, gl]);

  useFrame((state, delta) => {
    const p = worldState.pos;
    const dt = Math.min(delta, 0.05);

    // Keyboard movement (WASD / arrows) — camera-relative, cancels any
    // routed walk the moment a key is held. resolveStep keeps us on the stone.
    const kk = keys.current;
    const ix = (kk.r ? 1 : 0) - (kk.l ? 1 : 0);
    const iy = (kk.f ? 1 : 0) - (kk.b ? 1 : 0);
    const grounded = worldState.altitude < 0.01;
    const inRoom = !!useStore.getState().enteredZone;
    if ((ix || iy) && grounded && !inRoom) {
      worldState.path = [];
      const az = worldState.azimuth;
      // forward = away from the camera; right = screen right
      let mx = -Math.sin(az) * iy + Math.cos(az) * ix;
      let mz = -Math.cos(az) * iy - Math.sin(az) * ix;
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml;
      mz /= ml;
      const res = resolveStep(p.x, p.z, p.x + mx * WALK_SPEED * dt, p.z + mz * WALK_SPEED * dt);
      worldState.moving = Math.hypot(res.x - p.x, res.z - p.z) > 0.001;
      p.x = res.x;
      p.z = res.z;
      worldState.heading = Math.atan2(mx, mz);
    } else if (worldState.path.length && grounded && !inRoom) {
      // Routed walk: head for the next waypoint; drop it on arrival.
      const [tx, tz] = worldState.path[0];
      const dx = tx - p.x;
      const dz = tz - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.2) {
        worldState.path.shift();
        stall.current = 0;
      } else {
        const step = Math.min(dist, worldState.pathSpeed * dt);
        const res = resolveStep(p.x, p.z, p.x + (dx / dist) * step, p.z + (dz / dist) * step);
        const moved = Math.hypot(res.x - p.x, res.z - p.z);
        p.x = res.x;
        p.z = res.z;
        worldState.heading = Math.atan2(dx, dz);
        worldState.moving = moved > 0.001;
        // give up if something (a stone, an edge) keeps us from progressing
        stall.current = moved < step * 0.2 ? stall.current + 1 : 0;
        if (stall.current > 20) {
          worldState.path = [];
          stall.current = 0;
        }
      }
      if (!worldState.path.length) worldState.moving = false;
    } else {
      worldState.moving = false;
    }
    if (moving) moving.current = worldState.moving;

    // The monolith we're standing at (drives its preview tag + the E key)
    let nearId = null;
    let nearD = MONOLITH_NEAR_R;
    for (const m of MONOLITHS) {
      const d = Math.hypot(p.x - m.position[0], p.z - m.position[1]);
      if (d < nearD) {
        nearD = d;
        nearId = m.id;
        focus.current = m.position;
      }
    }
    // …or the station landmark within reach
    let stationId = null;
    if (!nearId) {
      focus.current = null;
      for (const z of STATIONS) {
        if (Math.hypot(p.x - z.landmark[0], p.z - z.landmark[1]) < z.near) {
          stationId = z.id;
          focus.current = z.landmark;
        }
      }
    }
    setNearProject(nearId);
    setNearStation(stationId);
    // where we are — the dock highlights it
    const here = mesaAt(p.x, p.z) || (causewayAt(p.x, p.z) ? 'causeway' : null);
    if (here) setNearZone(here);

    // __fastcam snaps the rig for deterministic screenshots (SwiftShader is slow
    // enough that the slow lerps never converge in the capture window).
    const fast = typeof window !== 'undefined' && window.__fastcam;
    const camK = fast ? 0.6 : 0.08;
    const azK = fast ? 0.6 : DAMP;

    // Travelling (click-walk or the dock): ease the camera in behind the
    // astronaut so the view turns with the journey — unless you've just
    // looked around yourself.
    const travelling = worldState.path.length > 0 && worldState.moving;
    if (travelling && performance.now() - worldState.lastLook > FOLLOW_AFTER_MS) {
      worldState.azimuthTarget = lerpAngle(worldState.azimuthTarget, worldState.heading + Math.PI, 0.035);
    }

    // Damp the orbit (angle, tilt, distance) toward its targets. Wrap-safe.
    worldState.azimuth = lerpAngle(worldState.azimuth, worldState.azimuthTarget, azK);
    worldState.pitch += (worldState.pitchTarget - worldState.pitch) * 0.08;
    const travelPull = travelling && worldState.pathSpeed > 8 ? 2.2 : 0; // pull back for speed on dock travel
    worldState.dist += (worldState.distTarget + travelPull - worldState.dist) * 0.06;

    // Apply to astronaut (smooth heading). `altitude` is the Act 3 drop —
    // zero in normal play, tweened 50 → 0 by LandingDirector.
    const a = astronautRef.current;
    if (a) {
      a.position.set(p.x, p.y + worldState.altitude, p.z);
      a.rotation.y = lerpAngle(a.rotation.y, worldState.heading, 0.18);
    }

    // Follow camera (orbit by azimuth). During the arrival drop the camera
    // sits low near the ground, craned up at the sky, and follows the
    // astronaut all the way down.
    const dropping = worldState.altitude > 0.01;
    const az = worldState.azimuth;
    // spherical orbit around the astronaut
    const horiz = worldState.dist * Math.cos(worldState.pitch);
    const desiredX = p.x + Math.sin(az) * horiz;
    const desiredZ = p.z + Math.cos(az) * horiz;
    const camY = dropping ? 2.1 : p.y + LOOK_H + worldState.dist * Math.sin(worldState.pitch);
    camera.position.x += (desiredX - camera.position.x) * camK;
    camera.position.y += (camY - camera.position.y) * (dropping ? 0.2 : camK);
    camera.position.z += (desiredZ - camera.position.z) * camK;

    // Look target: the astronaut normally; biased toward the monolith (and up
    // its face) when standing at one. During the drop the camera tilts up to
    // follow the fall.
    let lx = p.x;
    let ly = p.y + 1.3 + worldState.altitude * 0.7;
    let lz = p.z;
    if (focus.current) {
      lx = THREE.MathUtils.lerp(p.x, focus.current[0], 0.5);
      ly = 2.6;
      lz = THREE.MathUtils.lerp(p.z, focus.current[1], 0.5);
    } else if (!worldState.moving && !dropping) {
      // Idle at a rim: lean the view out over the cloud sea
      const edge = edgeDistance(p.x, p.z);
      if (edge < 1.6) {
        const m = mesaById(mesaAt(p.x, p.z));
        const ox = p.x - m.center[0];
        const oz = p.z - m.center[1];
        const ol = Math.hypot(ox, oz) || 1;
        const k = 1 - edge / 1.6;
        lx += (ox / ol) * 5 * k;
        lz += (oz / ol) * 5 * k;
        ly -= 1.6 * k;
      }
    }
    if (!lookInit.current) {
      lookAt.current.set(lx, ly, lz);
      lookInit.current = true;
    }
    const lookK = worldState.altitude > 0.01 ? 0.25 : camK;
    lookAt.current.x += (lx - lookAt.current.x) * lookK;
    lookAt.current.y += (ly - lookAt.current.y) * lookK;
    lookAt.current.z += (lz - lookAt.current.z) * lookK;
    camera.lookAt(lookAt.current);

    // Touchdown shake — a decaying random impulse fired by LandingDirector
    if (worldState.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * 0.14 * worldState.shake;
      camera.position.y += (Math.random() - 0.5) * 0.1 * worldState.shake;
      worldState.shake *= 0.86;
    }

  });

  return null;
}
