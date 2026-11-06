// Optional "pixel art" render mode: the 3D scene is drawn into a low-resolution target, then scaled up with
// nearest filtering, with a thin depth-based outline, a palette-style colour posterise and a light ordered dither.
// Purely a view setting (toggle at runtime or ?px=2); nothing in the sim or the models changes.
import * as THREE from 'three';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D tColor, tDepth;
  uniform vec2 uTexel;
  uniform float uLevels, uOutline, uThresh;
  float depthAt(vec2 o){ return texture2D(tDepth, vUv + o * uTexel).x; }
  void main(){
    vec3 col = texture2D(tColor, vUv).rgb;
    float c = depthAt(vec2(0.0));
    // a pixel is outlined when it is clearly nearer than one of its neighbours (1px line inside the silhouette)
    float e = max(max(depthAt(vec2(1.,0.)) - c, depthAt(vec2(-1.,0.)) - c), max(depthAt(vec2(0.,1.)) - c, depthAt(vec2(0.,-1.)) - c));
    float edge = step(uThresh, e);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb *= 1.0 - edge * uOutline;
    vec2 p = floor(vUv / uTexel);
    float b = (mod(p.x, 2.0) + 2.0 * mod(p.y, 2.0) + 0.5) / 4.0 - 0.5;  // 2x2 ordered dither
    gl_FragColor.rgb = floor(gl_FragColor.rgb * uLevels + b * 0.3 + 0.5) / uLevels;
  }`;

export function createPixelPass(renderer, { size = 2, levels = 24, outline = 0.62 } = {}) {
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter, depthTexture: new THREE.DepthTexture(4, 4) });
  target.depthTexture.magFilter = target.depthTexture.minFilter = THREE.NearestFilter;
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: target.texture }, tDepth: { value: target.depthTexture }, uTexel: { value: new THREE.Vector2() },
      uLevels: { value: levels }, uOutline: { value: outline }, uThresh: { value: 0.0009 } } });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const pass = {
    enabled: false, size,
    resize(w, h) { // w,h: CSS pixels of the canvas
      const tw = Math.max(64, Math.round(w / pass.size)), th = Math.max(64, Math.round(h / pass.size));
      target.setSize(tw, th); mat.uniforms.uTexel.value.set(1 / tw, 1 / th);
    },
    render(sc, camera) {
      renderer.setRenderTarget(target); renderer.render(sc, camera);
      renderer.setRenderTarget(null); renderer.render(scene, cam);
    },
  };
  return pass;
}
