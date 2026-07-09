'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { worldState } from '@/lib/worldState';
import { useStore } from '@/lib/store';
import { zones } from '@/data/world';
import { CAMERA_PIVOT_S } from '@/lib/motion';

const SPEED = 7; // units / second
const CAM_DIST = 9;
const CAM_HEIGHT = 5.2;
const WORLD_R = 70;
// Mouse-look sensitivity — slow + cinematic (≈60% slower than the old 0.004).
const LOOK_SENS = 0.0016;
const DAMP = 0.05; // rotation damping factor (cinematic)

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Clamp a step so it can't cross into any district's trigger sphere. */
function resolveStep(px, pz, nx, nz) {
  let blocked = false;
  for (const z of zones) {
    const r = z.stopRadius || z.enterRadius;
    let ex = nx - z.position[0];
    let ez = nz - z.position[2];
    let ed = Math.hypot(ex, ez);
    if (ed < r) {
      // walking into the sphere — clamp to its edge along the approach
      if (ed < 0.0001) {
        ex = px - z.position[0];
        ez = pz - z.position[2];
        ed = Math.hypot(ex, ez) || 1;
      }
      nx = z.position[0] + (ex / ed) * r;
      nz = z.position[2] + (ez / ed) * r;
      blocked = true;
    }
  }
  return { x: nx, z: nz, blocked };
}

// keyboard movement — WASD and the arrow keys are equivalent
const KEYMAP = {
  w: 'f', arrowup: 'f',
  s: 'b', arrowdown: 'b',
  a: 'l', arrowleft: 'l',
  d: 'r', arrowright: 'r',
};

/**
 * Click-to-move astronaut controller with a third-person follow camera.
 *  - Tap/click the ground → walk there (raycast the y=0 plane).
 *  - Drag → orbit the camera around the astronaut.
 *  - Walk within a district's radius → store.nearZone updates (drives the
 *    "ENTER" prompt). Movement state is shared via worldState (no re-renders).
 */
export default function ExploreController({ astronautRef, moving }) {
  const { camera, gl } = useThree();
  const setNearZone = useStore((s) => s.setNearZone);

  const insideZone = useRef(null); // id of the trigger sphere we're inside
  const insidePos = useRef(null); // [x,z] of that zone (for camera framing)
  const pivoting = useRef(false); // true while the GSAP camera pivot runs
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
      if (down.drag > 6) worldState.azimuthTarget -= e.movementX * LOOK_SENS;
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
        if (ray.current.ray.intersectPlane(plane.current, hit.current)) {
          const d = Math.hypot(hit.current.x, hit.current.z);
          const k = d > WORLD_R ? WORLD_R / d : 1;
          worldState.target.set(hit.current.x * k, 0, hit.current.z * k);
          worldState.hasTarget = true;
        }
      }
      down = null;
    };

    // Press E to enter the district you're standing in
    const onKey = (e) => {
      if (e.key !== 'e' && e.key !== 'E') return;
      const s = useStore.getState();
      if (s.journeyPhase !== 'world') return;
      if (s.nearZone && !s.enteredZone) s.setEnteredZone(s.nearZone);
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

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    // Test hooks — deterministic positioning for screenshots
    window.__walkTo = (x, z) => {
      worldState.target.set(x, 0, z);
      worldState.hasTarget = true;
    };
    window.__warp = (x, z) => {
      worldState.pos.set(x, 0, z);
      worldState.target.set(x, 0, z);
      worldState.hasTarget = false;
    };
    window.__pos = () => [worldState.pos.x, worldState.pos.z];
    return () => {
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

    // Keyboard movement (WASD / arrows) — camera-relative, overrides any
    // click target the moment a key is held.
    const kk = keys.current;
    const ix = (kk.r ? 1 : 0) - (kk.l ? 1 : 0);
    const iy = (kk.f ? 1 : 0) - (kk.b ? 1 : 0);
    const grounded = worldState.altitude < 0.01;
    if ((ix || iy) && grounded && !useStore.getState().enteredZone) {
      worldState.hasTarget = false;
      const az = worldState.azimuth;
      // forward = away from the camera; right = screen right
      let mx = -Math.sin(az) * iy + Math.cos(az) * ix;
      let mz = -Math.cos(az) * iy - Math.sin(az) * ix;
      const ml = Math.hypot(mx, mz) || 1;
      mx /= ml;
      mz /= ml;
      let nx = p.x + mx * SPEED * dt;
      let nz = p.z + mz * SPEED * dt;
      const dw = Math.hypot(nx, nz);
      if (dw > WORLD_R) {
        nx *= WORLD_R / dw;
        nz *= WORLD_R / dw;
      }
      const res = resolveStep(p.x, p.z, nx, nz);
      worldState.moving = Math.hypot(res.x - p.x, res.z - p.z) > 0.001;
      p.x = res.x;
      p.z = res.z;
      worldState.heading = Math.atan2(mx, mz);
    } else if (worldState.hasTarget) {
      // Click-to-move: walk toward the target, halting at the edge of any
      // trigger sphere so the astronaut never walks through the buildings.
      const dx = worldState.target.x - p.x;
      const dz = worldState.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.18) {
        const step = Math.min(dist, SPEED * dt);
        const res = resolveStep(p.x, p.z, p.x + (dx / dist) * step, p.z + (dz / dist) * step);
        p.x = res.x;
        p.z = res.z;
        worldState.heading = Math.atan2(dx, dz);
        worldState.moving = !res.blocked;
        if (res.blocked) worldState.hasTarget = false;
      } else {
        worldState.moving = false;
        worldState.hasTarget = false;
      }
    } else {
      worldState.moving = false;
    }
    if (moving) moving.current = worldState.moving;

    // Trigger sphere: detect the moment we cross inside a district's radius.
    let nearZ = null;
    let nearD = Infinity;
    for (const z of zones) {
      const d = Math.hypot(p.x - z.position[0], p.z - z.position[2]);
      if (d < z.enterRadius && d < nearD) {
        nearD = d;
        nearZ = z;
      }
    }
    const insideId = nearZ ? nearZ.id : null;
    insidePos.current = nearZ ? nearZ.position : null;
    if (insideId !== insideZone.current) {
      insideZone.current = insideId;
      // Entering a sphere → GSAP-pivot the camera to frame the buildings (0.8s).
      if (nearZ && !useStore.getState().enteredZone) {
        const dirX = nearZ.position[0] - p.x;
        const dirZ = nearZ.position[2] - p.z;
        const face = Math.atan2(-dirX, -dirZ); // camera ends up opposite buildings
        let dd = ((face - worldState.azimuth + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (dd < -Math.PI) dd += Math.PI * 2;
        const targetA = worldState.azimuth + dd;
        const proxy = { a: worldState.azimuth };
        pivoting.current = true;
        gsap.to(proxy, {
          a: targetA,
          duration: CAMERA_PIVOT_S,
          ease: 'power2.inOut',
          overwrite: true,
          onUpdate() {
            worldState.azimuth = proxy.a;
            worldState.azimuthTarget = proxy.a;
          },
          onComplete() {
            pivoting.current = false;
          },
        });
      }
    }

    // __fastcam snaps the rig for deterministic screenshots (SwiftShader is slow
    // enough that the slow lerps never converge in the capture window).
    const fast = typeof window !== 'undefined' && window.__fastcam;
    const camK = fast ? 0.6 : 0.08;
    const azK = fast ? 0.6 : DAMP;

    // Damp the camera orbit toward its drag target (skipped while GSAP owns the
    // azimuth during a pivot). Wrap-safe.
    if (!pivoting.current)
      worldState.azimuth = lerpAngle(worldState.azimuth, worldState.azimuthTarget, azK);

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
    const desiredX = p.x + Math.sin(az) * CAM_DIST;
    const desiredZ = p.z + Math.cos(az) * CAM_DIST;
    const camY = dropping ? 2.1 : CAM_HEIGHT;
    camera.position.x += (desiredX - camera.position.x) * camK;
    camera.position.y += (camY - camera.position.y) * (dropping ? 0.2 : camK);
    camera.position.z += (desiredZ - camera.position.z) * camK;

    // Look target: the astronaut normally; biased toward the district (and up
    // toward the prompt) once inside the trigger so the cluster is framed.
    // During the Act 3 drop the camera tilts up to follow the fall.
    let lx = p.x;
    let ly = p.y + 1.3 + worldState.altitude * 0.7;
    let lz = p.z;
    if (insidePos.current) {
      lx = THREE.MathUtils.lerp(p.x, insidePos.current[0], 0.45);
      ly = THREE.MathUtils.lerp(p.y + 1.3, 3.2, 0.55);
      lz = THREE.MathUtils.lerp(p.z, insidePos.current[2], 0.45);
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

    // Zone proximity → drives the ENTER prompt
    let near = null;
    for (const z of zones) {
      const d = Math.hypot(p.x - z.position[0], p.z - z.position[2]);
      if (d < z.enterRadius) near = z.id;
    }
    setNearZone(near);
  });

  return null;
}
