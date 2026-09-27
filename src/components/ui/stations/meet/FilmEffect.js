import * as THREE from 'three';
import { Effect, EffectAttribute } from 'postprocessing';
import { PALETTE } from '@/lib/palette';

/**
 * The finishing pass over the whole composite frame, so the helmet, suit,
 * moon and room read as one photograph:
 *
 *   · tone map (Khronos PBR Neutral — leaves the pre-graded portrait's
 *     colours alone below the highlights, unlike ACES)
 *   · the Mission Control dot grid, drawn where nothing was rendered, aligned
 *     pixel-for-pixel with the DOM grid around the stage
 *   · faint chromatic fringing at the outer edge only
 *   · a gentle vignette
 *   · fine static film grain (static on purpose: the resting frame is still)
 *
 * Grid, vignette and grain work in display (gamma) space so their strengths
 * match what CSS would do.
 */
const frag = /* glsl */ `
  uniform vec4 uStage;   // stage rect in CSS px: left, top, width, height
  uniform vec2 uRoot;    // the Mission Control root size, CSS px
  uniform vec3 uInk;     // grid dot colour (display space)

  vec3 neutralTM(vec3 c) {
    const float start = 0.8 - 0.04;
    const float desat = 0.15;
    float x = min(c.r, min(c.g, c.b));
    float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
    c -= off;
    float peak = max(c.r, max(c.g, c.b));
    if (peak < start) return c;
    const float d = 1.0 - start;
    float np = 1.0 - d * d / (peak + d - start);
    c *= np / peak;
    float g = 1.0 - 1.0 / (desat * (peak - np) + 1.0);
    return mix(c, vec3(np), g);
  }
  vec3 toDisplay(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
  vec3 toLinear(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(2.2)); }
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);

    // chromatic aberration — zero across the middle, a hair at the rim
    float ca = smoothstep(0.1, 0.5, r2) * 0.0025;
    vec3 col = vec3(
      texture2D(inputBuffer, uv - c * ca).r,
      inputColor.g,
      texture2D(inputBuffer, uv + c * ca).b
    );
    col = toDisplay(neutralTM(max(col, 0.0)));

    // the room's dot grid, only on empty background and never over the moon
    vec2 css = vec2(uStage.x + uv.x * uStage.z, uStage.y + (1.0 - uv.y) * uStage.w);
    vec2 cell = mod(css, 26.0) - 13.0;
    float dotA = 1.0 - smoothstep(0.55, 1.35, length(cell));
    float mt = length((css - vec2(0.5, 0.35) * uRoot) / (vec2(0.9, 0.8) * uRoot));
    float mask = clamp((0.85 - mt) / 0.55, 0.0, 1.0);
    float empty = step(0.99999, depth) * (1.0 - smoothstep(0.1, 0.3, max(col.r, max(col.g, col.b))));
    col = mix(col, uInk, dotA * mask * empty * 0.042);

    // vignette: corners only, never noticed on its own
    float v = smoothstep(0.95, 0.35, length(c * vec2(1.0, 0.8)) * 1.35);
    col *= mix(0.74, 1.0, v);

    // grain: fine, low, fixed
    col += (hash(floor(uv * resolution)) - 0.5) * 0.028;

    outputColor = vec4(toLinear(col), inputColor.a);
  }
`;

export class FilmEffect extends Effect {
  constructor() {
    super('FilmEffect', frag, {
      attributes: EffectAttribute.CONVOLUTION | EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uStage', new THREE.Uniform(new THREE.Vector4(0, 0, 1, 1))],
        ['uRoot', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['uInk', new THREE.Uniform(new THREE.Color().setStyle(PALETTE.ink, THREE.LinearSRGBColorSpace))], // raw sRGB: display space
      ]),
    });
  }
}
