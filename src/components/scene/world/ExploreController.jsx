'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { worldState } from '@/lib/worldState';
import { useStore } from '@/lib/store';
import { zones } from '@/data/world';

const SPEED = 7; // units / second
const CAM_DIST = 9;
const CAM_HEIGHT = 5.2;
const WORLD_R = 70;

const lerpAngle = (a, b, t) => {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
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

  const ray = useRef(new THREE.Raycaster());
  const ndc = useRef(new THREE.Vector2());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const hit = useRef(new THREE.Vector3());

  // Pointer: distinguish a click (walk-to) from a drag (orbit camera)
  useEffect(() => {
    const el = gl.domElement;
    let down = null; // { x, y, t, dragging }

    const onDown = (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), drag: 0 };
    };
    const onMove = (e) => {
      if (!down) return;
      down.drag += Math.abs(e.movementX) + Math.abs(e.movementY);
      // Incremental (not cumulative) so it doesn't compound; damped in useFrame
      if (down.drag > 6) worldState.azimuthTarget -= e.movementX * 0.004;
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
      if (s.nearZone && !s.enteredZone) s.setEnteredZone(s.nearZone);
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
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
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [camera, gl]);

  useFrame((state, delta) => {
    const p = worldState.pos;
    const dt = Math.min(delta, 0.05);

    // Move toward target
    if (worldState.hasTarget) {
      const dx = worldState.target.x - p.x;
      const dz = worldState.target.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.18) {
        const step = Math.min(dist, SPEED * dt);
        p.x += (dx / dist) * step;
        p.z += (dz / dist) * step;
        worldState.heading = Math.atan2(dx, dz);
        worldState.moving = true;
      } else {
        worldState.moving = false;
        worldState.hasTarget = false;
      }
    } else {
      worldState.moving = false;
    }
    if (moving) moving.current = worldState.moving;

    // Damp the camera orbit toward its drag target (smooth, not jumpy)
    worldState.azimuth += (worldState.azimuthTarget - worldState.azimuth) * 0.12;

    // Apply to astronaut (smooth heading)
    const a = astronautRef.current;
    if (a) {
      a.position.copy(p);
      a.rotation.y = lerpAngle(a.rotation.y, worldState.heading, 0.18);
    }

    // Follow camera (orbit by azimuth)
    const az = worldState.azimuth;
    const desiredX = p.x + Math.sin(az) * CAM_DIST;
    const desiredZ = p.z + Math.cos(az) * CAM_DIST;
    camera.position.x += (desiredX - camera.position.x) * 0.08;
    camera.position.y += (CAM_HEIGHT - camera.position.y) * 0.08;
    camera.position.z += (desiredZ - camera.position.z) * 0.08;
    camera.lookAt(p.x, p.y + 1.3, p.z);

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
