import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  random,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FilmLook } from "../../lib/Stage";
import { SANS } from "../../lib/fonts";

/*
  WHAT IF EARTH SUDDENLY STOPPED SPINNING? — 60 s vertical science Short.
  Everything is procedural (the image provider had no credits):
  an equirect Earth texture, city lights, clouds, low-poly city, animated
  ocean — all generated in code. Narration: Windows TTS, deepened.
*/

const FPS = 30;
// scene grid (frames)
const F1a = 0; // city aerial        0–72
const F1b = 240; // clock and equator speed graphic, 8s
const FREEZE = 315; // thought-experiment stop, 10.5s
const F2 = 360; // momentum in the atmosphere, 12s
const F3a = 660; // ocean response, 22s
const F3b = 930; // coastal response, 31s
const F4a = 1170; // year-long solar day, 39s
const F5 = 1710; // takeaway, 57s
const DUR = 1800;

const AC = "films/earth-stopped/audio";
const AC_TTS = "films/earth-stopped/tts";
const SPEECH_WINDOWS: [number, number][] = [[0, 1505]];
const speechDuck = (frame: number) => SPEECH_WINDOWS.some(([start, end]) => frame >= start - 8 && frame <= end + 10) ? 0.32 : 1;

/* ------------------------------------------------------------------ */
/*  deterministic value noise (textures)                               */
/* ------------------------------------------------------------------ */
const fract = (x: number) => x - Math.floor(x);
const hash3 = (i: number, j: number, k: number) =>
  fract(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453);
const sm = (t: number) => t * t * (3 - 2 * t);
const lerp = THREE.MathUtils.lerp;

function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
  const c = (a: number, b: number, d: number) => hash3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf);
  const x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf);
  const x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);
  return lerp(lerp(x00, x01, zf), lerp(x10, x11, zf), yf);
}

function fbm3(x: number, y: number, z: number, oct = 4): number {
  let a = 0.5, f = 1, s = 0;
  for (let o = 0; o < oct; o++) {
    s += a * noise3(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s / (1 - Math.pow(0.5, oct));
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------ */
/*  earth textures (module singletons, built once)                     */
/* ------------------------------------------------------------------ */
type Tex = { day: HTMLCanvasElement; night: HTMLCanvasElement; clouds: HTMLCanvasElement };
let _earth: Tex | null = null;

function buildEarthTextures(): Tex {
  // The planet fills most of the vertical frame, so a 512px map visibly
  // smears coastlines and cloud edges. Keep the procedural map crisp at 2K.
  const W = 1024, Hh = 512;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = Hh;
    return c;
  };
  const dayC = mk(), nightC = mk(), cloudsC = mk();

  const day = dayC.getContext("2d")!;
  const night = nightC.getContext("2d")!;
  const clouds = cloudsC.getContext("2d")!;

  day.fillStyle = "#06254a";
  day.fillRect(0, 0, W, Hh);
  night.fillStyle = "#000208";
  night.fillRect(0, 0, W, Hh);

  const img = day.getImageData(0, 0, W, Hh);
  const px = img.data;

  const landVal = new Float32Array(W * Hh);
  for (let j = 0; j < Hh; j++) {
    const lat = ((j + 0.5) / Hh) * Math.PI - Math.PI / 2;
    const cl = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W) * Math.PI * 2;
      const x = cl * Math.cos(lon), z = cl * Math.sin(lon);
      const e = fbm3(x * 1.7 + 3.2, y * 1.7 + 1.1, z * 1.7 - 2.6, 5);
      landVal[j * W + i] = e;
      const idx = (j * W + i) * 4;
      let r: number, g: number, b: number;
      const ice = Math.abs(lat) > 1.24 + 0.25 * (noise3(x * 5, y * 5, z * 5) - 0.5);
      if (ice) {
        r = 226; g = 238; b = 245;
      } else if (e > 0.532) {
        const h = clamp01((e - 0.532) / 0.16);
        const dry = noise3(x * 2.4 + 21, y * 2.4 + 8, z * 2.4);
        let gr: number, gg: number, gb: number;
        if (dry > 0.62 && Math.abs(lat) < 0.55) {
          gr = 172; gg = 138; gb = 84; // desert
        } else {
          gr = 62; gg = 106; gb = 52; // green
        }
        if (e > 0.66) { gr = 118; gg = 105; gb = 88; } // highlands
        r = gr * (0.85 + 0.3 * h); g = gg * (0.85 + 0.3 * h); b = gb * (0.85 + 0.3 * h);
      } else {
        const shore = clamp01(1 - (0.532 - e) / 0.05);
        r = 8 + 26 * shore; g = 34 + 60 * shore; b = 78 + 60 * shore;
      }
      // subtle polar sea-ice haze on ocean
      px[idx] = r; px[idx + 1] = g; px[idx + 2] = b;
    }
  }
  day.putImageData(img, 0, 0);

  // night city lights on land
  night.globalCompositeOperation = "source-over";
  for (let n = 0; n < 2600; n++) {
    const i = Math.floor(hash3(n, 1, 2) * W);
    const j = Math.floor(hash3(n, 7, 9) * Hh);
    const e = landVal[j * W + i];
    const lat = ((j + 0.5) / Hh) * Math.PI - Math.PI / 2;
    if (e <= 0.535 || Math.abs(lat) > 1.05) continue;
    const city = hash3(n, 3, 5);
    const rad = city > 0.985 ? 2.6 : city > 0.9 ? 1.6 : 0.9;
    const a = 0.55 + 0.45 * hash3(n, 11, 13);
    const grd = night.createRadialGradient(i, j, 0, i, j, rad);
    grd.addColorStop(0, `rgba(255,214,150,${a})`);
    grd.addColorStop(1, "rgba(255,214,150,0)");
    night.fillStyle = grd;
    night.fillRect(i - rad, j - rad, rad * 2, rad * 2);
  }

  // clouds — RGBA canvas
  const cimg = clouds.createImageData(W, Hh);
  for (let j = 0; j < Hh; j++) {
    const lat = ((j + 0.5) / Hh) * Math.PI - Math.PI / 2;
    const cl = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W) * Math.PI * 2;
      const x = cl * Math.cos(lon), z = cl * Math.sin(lon);
      const c = fbm3(x * 3.1 + 17, y * 3.6 + 5, z * 3.1 - 7, 5) * 0.72
        + fbm3(x * 6.5 - 4, y * 6.5, z * 6.5 + 9, 3) * 0.28;
      const a = clamp01((c - 0.52) / 0.16);
      const idx = (j * W + i) * 4;
      cimg.data[idx] = 255; cimg.data[idx + 1] = 255; cimg.data[idx + 2] = 255;
      cimg.data[idx + 3] = Math.round(a * 235);
    }
  }
  clouds.putImageData(cimg, 0, 0);
  return { day: dayC, night: nightC, clouds: cloudsC };
}

const getEarth = () => _earth ??= buildEarthTextures();

/* ------------------------------------------------------------------ */
/*  camera rig                                                         */
/* ------------------------------------------------------------------ */
type Cam = { from: [number, number, number]; to?: [number, number, number]; look: [number, number, number]; lookTo?: [number, number, number]; fov?: number };
const SpaceRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(f, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const p = cam.to ? cam.from.map((v, i) => lerp(v, cam.to![i], t)) as [number, number, number] : cam.from;
  const l = cam.lookTo ? cam.look.map((v, i) => lerp(v, cam.lookTo![i], t)) as [number, number, number] : cam.look;
  camera.position.set(...p);
  const persp = camera as THREE.PerspectiveCamera;
  persp.fov = cam.fov ?? 42;
  persp.updateProjectionMatrix();
  camera.lookAt(...l);
  return null;
};

/* ------------------------------------------------------------------ */
/*  space scene (the globe)                                            */
/* ------------------------------------------------------------------ */
const Globe: React.FC<{ spin?: number; extraSpin?: number }> = ({ spin = 0, extraSpin = 0 }) => {
  const tex = getEarth();
  const { day, night, clouds } = useMemo(() => {
    const d = new THREE.CanvasTexture(tex.day);
    const n = new THREE.CanvasTexture(tex.night);
    const c = new THREE.CanvasTexture(tex.clouds);
    for (const t of [d, n, c]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.RepeatWrapping;
    }
    return { day: d, night: n, clouds: c };
  }, [tex]);

  const f = useCurrentFrame();
  const earth = React.useRef<THREE.Mesh>(null);
  const cloud = React.useRef<THREE.Mesh>(null);
  if (earth.current) earth.current.rotation.y = spin + extraSpin * (f / FPS) * 0.14;
  if (cloud.current) cloud.current.rotation.y = spin + extraSpin * (f / FPS) * 0.2 + 3;
  return (
    <>
      <mesh ref={earth}>
        <sphereGeometry args={[1, 128, 96]} />
        <meshStandardMaterial map={day} emissiveMap={night} emissive={new THREE.Color("#ffcf9e")} emissiveIntensity={1.1} roughness={0.92} metalness={0} />
      </mesh>
      <mesh ref={cloud} scale={1.018}>
        <sphereGeometry args={[1.012, 96, 64]} />
        <meshStandardMaterial map={clouds} transparent depthWrite={false} opacity={0.85} roughness={1} />
      </mesh>
      {/* Thin Fresnel atmosphere: a back-side solid shell reads as a thick ring. */}
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vNormalView;
            varying vec3 vViewPosition;
            void main() {
              vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
              vNormalView = normalize(normalMatrix * normal);
              vViewPosition = -viewPosition.xyz;
              gl_Position = projectionMatrix * viewPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vNormalView;
            varying vec3 vViewPosition;
            void main() {
              float facing = max(dot(normalize(vNormalView), normalize(vViewPosition)), 0.0);
              float rim = pow(1.0 - facing, 3.0);
              gl_FragColor = vec4(0.18, 0.48, 1.0, rim * 0.7);
            }
          `}
        />
      </mesh>
    </>
  );
};

const gnp = (seed: string, n: number, rmin: number, rmax: number) =>
  Array.from({ length: n }, (_, i) => {
    const u = random(`${seed}x${i}`), v = random(`${seed}y${i}`), w = random(`${seed}z${i}`);
    const r = rmin + (rmax - rmin) * Math.cbrt(w);
    const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1);
    return [r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)] as [number, number, number];
  });

const Stars: React.FC = () => {
  const pos = useMemo(() => Float32Array.from(gnp("stars", 900, 26, 60).flat()), []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#dfe8ff" size={1.7} sizeAttenuation={false} depthWrite={false} />
    </points>
  );
};

const SpaceScene: React.FC<{
  cam: Cam; spin: number; extraSpin?: number; sunDir: [number, number, number];
}> = ({ cam, spin, extraSpin = 0, sunDir }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#010208" }}>
      <ThreeCanvas width={1080} height={1920} linear={false} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: cam.fov ?? 42, near: 0.1, far: 200 }}>
        <SpaceRig cam={cam} />
        <ambientLight intensity={0.22} color="#8fb4ff" />
        <directionalLight position={sunDir} intensity={3.1} color="#fff3e0" />
        <Stars />
        <sprite position={[sunDir[0] * 22, sunDir[1] * 22, sunDir[2] * 22]} scale={[14, 14, 14]}>
          <spriteMaterial color="#fff8e8" transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <Globe spin={spin} extraSpin={extraSpin} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const YearSpaceScene: React.FC = () => {
  const f = useCurrentFrame();
  const angle = (f / 540) * Math.PI * 2;
  const sunDir: [number, number, number] = [14 * Math.cos(angle), 3.4, 14 * Math.sin(angle)];
  return <SpaceScene cam={{ from: [-3.4, 1.4, 5.4], to: [-1.7, 0.9, 4.4], look: [0, 0, 0], fov: 40 }} spin={0} sunDir={sunDir} />;
};

/* ------------------------------------------------------------------ */
/*  the city (low-poly night metropolis)                               */
/* ------------------------------------------------------------------ */
/* Facade atlas — clustered lit windows. Technique follows
   "Procedural Window Lighting Effects for Real-Time City Rendering"
   (Lei & Mars): a per-room hash beats a threshold, and a per-floor bias
   makes whole floors dark (empty after hours) or dense (overtime) —
   speckled random windows read fake, clusters read real. Also drawn:
   spandrel bands between floors, vertical mullions, half-drawn blinds,
   occasional wide bright "conference" windows, and a dark mechanical top
   floor. Each building gets its own pattern + warm/cool tint blend. */
const _facadeCache = new Map<string, HTMLCanvasElement>();
const facadeTex = (seed: string, floors = 14) => {
  const key = `${seed}x${floors}`;
  const hit = _facadeCache.get(key);
  if (hit) return hit;
  const BAY = 16, FL = 16, W = 128, H = FL * floors, WW = 11, WH = 10;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#151b27");
  bg.addColorStop(1, "#0b0e15");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const warmBias = 0.55 + random(`${seed}_wb`) * 0.35; // real dusk cities skew warm-white
  const litBase = 0.2 + random(`${seed}_lb`) * 0.26; // 20–46% lit, like real towers
  for (let fl = 0; fl < floors; fl++) {
    g.fillStyle = "#070a10"; // spandrel band between floors
    g.fillRect(0, fl * FL, W, 4);
    const mech = fl === floors - 1; // mechanical level: near-dark louvers
    const fb = mech ? -0.3 : (random(`${seed}_f${fl}`) - 0.5) * 0.36;
    for (let bay = 0; bay < 8; bay++) {
      const x = bay * BAY + 2, y = fl * FL + 6;
      g.fillStyle = "#0d131f"; // unlit glass
      g.fillRect(x, y, WW, WH);
      g.fillStyle = "rgba(140,170,220,0.09)"; // sky reflection sliver
      g.fillRect(x, y, WW, 2);
      const room = random(`${seed}_r${fl}_${bay}`); // room hash vs threshold
      if (room < litBase + fb) {
        const warm = random(`${seed}_w${fl}_${bay}`) > 1 - warmBias;
        const blind = random(`${seed}_h${fl}_${bay}`) > 0.74;
        g.globalAlpha = blind ? 0.28 : 0.55 + 0.45 * random(`${seed}_a${fl}_${bay}`);
        g.fillStyle = warm ? "#ffd9a0" : "#c7dcf5";
        g.fillRect(x, y, WW, WH);
        if (warm && random(`${seed}_c${fl}_${bay}`) > 0.9) {
          g.globalAlpha = 0.9; // conference room light spill
          g.fillRect(x - 2, y - 2, WW + 4, WH + 4);
        }
        g.globalAlpha = 1;
      }
      g.fillStyle = "#060911"; // vertical mullion
      g.fillRect(bay * BAY, y, 1, WH);
    }
  }
  _facadeCache.set(key, c);
  return c;
};

const City: React.FC<{ moving: boolean; speed?: number }> = ({ moving, speed = 1 }) => {
  const f = useCurrentFrame();
  const u = moving ? f / FPS : FREEZE / FPS;
  const blds = useMemo(() => {
    const arr: { x: number; z: number; w: number; d: number; h: number; seed: string }[] = [];
    for (let i = 0; i < 4; i++) {
      // two rows each side of a street along z
      for (const side of [-1, 1]) {
        arr.push({ x: side * (5 + i * 4.4), z: -14 + i * 9 + random(`bx${i}${side}`) * 3, w: 4 + random(`bw${i}${side}`) * 2.5, h: 7 + random(`bh${i}${side}`) * 12, d: 4 + random(`bd${i}${side}`) * 2, seed: `A${i}${side}` });
        arr.push({ x: -22 + i * 13 + random(`bx2${i}${side}`) * 4, z: side * (16 + i * 7), w: 4 + random(`bw2${i}${side}`) * 2.5, h: 6 + random(`bh2${i}${side}`) * 9, d: 4, seed: `B${i}${side}` });
      }
    }
    return arr;
  }, []);
  // one facade pattern + tint per building — neighbours never share windows
  const texes = useMemo(() => {
    const m = new Map<string, THREE.CanvasTexture>();
    for (const b of blds) {
      const t = new THREE.CanvasTexture(facadeTex(b.seed));
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      m.set(b.seed, t);
    }
    return m;
  }, [blds]);

  const cars = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ off: random(`co${i}`), lane: [-1.7, -0.8, 0.8, 1.7][i % 4], sp: 0.55 + random(`cs${i}`) * 0.5, dir: i % 2 ? 1 : -1 })),
    []
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#101319" roughness={1} />
      </mesh>
      {/* street strip with headlights */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[5.6, 80]} />
        <meshStandardMaterial color="#1a1e26" roughness={0.85} />
      </mesh>
      {/* glowing lane dashes */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={`d${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -18 + i * 3]}>
          <planeGeometry args={[0.14, 1.3]} />
          <meshStandardMaterial color="#4a4632" emissive="#e8d79a" emissiveIntensity={0.55} />
        </mesh>
      ))}
      {/* street lamps with warm halos */}
      {[-1, 1].map((side) =>
        Array.from({ length: 5 }, (_, i) => (
          <group key={`l${side}${i}`} position={[side * 3.4, 0, -14 + i * 8]}>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[0.09, 3.2, 0.09]} />
              <meshStandardMaterial color="#0c0f14" roughness={1} />
            </mesh>
            <sprite position={[-side * 0.4, 3.1, 0]} scale={[1.3, 1.3, 1.3]}>
              <spriteMaterial map={moonTex()} color="#ffca80" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </group>
        ))
      )}
      {cars.map((c, i) => {
        // cars roll along z; distance travelled freezes the moment f >= FREEZE
        const z = ((c.off + u * c.sp * (c.dir > 0 ? 1 : -1) * 18) % 36 + 36) % 36 - 18;
        return (
          <React.Fragment key={i}>
            <sprite position={[c.lane, 0.28, c.dir > 0 ? z : -z]} scale={[0.34, c.dir > 0 ? 0.1 : 0.34, 0.34]}>
              <spriteMaterial color={c.dir > 0 ? "#fff3d0" : "#ff5a3c"} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            {/* soft halo around each light */}
            <sprite position={[c.lane, 0.3, c.dir > 0 ? z : -z]} scale={[1.1, 0.7, 1.1]}>
              <spriteMaterial map={moonTex()} color={c.dir > 0 ? "#ffd9a0" : "#ff6a4a"} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </React.Fragment>
        );
      })}
      {blds.map((b) => {
        const base = texes.get(b.seed);
        if (!base) return null;
        // NYC-style wedding-cake setbacks: tall towers stack 2–3 shrinking tiers
        const nTier = b.h > 9 ? 3 : b.h > 5.5 ? 2 : 1;
        const parts = nTier === 3 ? [[0.52, 1], [0.31, 0.74], [0.17, 0.5]] : nTier === 2 ? [[0.68, 1], [0.32, 0.66]] : [[1, 1]];
        const lit = 0.7 + 0.5 * random(`bi${b.seed}`);
        const crown = b.h > 7.5 && random(`cr${b.seed}`) > 0.45;
        const nodes: React.ReactNode[] = [];
        let y0 = 0;
        let topW = b.w, topD = b.d, topY = 0;
        parts.forEach(([hf, sf], k) => {
          const th = b.h * hf;
          const tw = b.w * sf, td = b.d * sf;
          const t = base.clone();
          t.needsUpdate = true;
          t.repeat.set(Math.max(1, tw / 2.6), Math.max(1.5, th / 2.9));
          nodes.push(
            <mesh key={`t${k}`} position={[b.x, y0 + th / 2, b.z]}>
              <boxGeometry args={[tw, th, td]} />
              <meshStandardMaterial color="#141a24" map={t} emissiveMap={t} emissive={new THREE.Color("#ffb96a")} emissiveIntensity={lit} roughness={0.9} />
            </mesh>,
            // parapet lip shading every setback edge
            <mesh key={`p${k}`} position={[b.x, y0 + th + 0.08, b.z]}>
              <boxGeometry args={[tw + 0.34, 0.16, td + 0.34]} />
              <meshStandardMaterial color="#0d1119" roughness={1} />
            </mesh>
          );
          topW = tw; topD = td; topY = y0 + th;
          y0 += th;
        });
        // rooftop plant room
        const pw = Math.max(0.5, topW * 0.22);
        nodes.push(
          <mesh key="plant" position={[b.x + (random(`px${b.seed}`) - 0.5) * topW * 0.3, topY + 0.25, b.z + (random(`pz${b.seed}`) - 0.5) * topD * 0.3]}>
            <boxGeometry args={[pw, 0.5, pw]} />
            <meshStandardMaterial color="#0b0f16" roughness={1} />
          </mesh>
        );
        if (crown) {
          // glowing crown ring around the top edge
          nodes.push(
            <mesh key="crown" position={[b.x, topY - 0.05, b.z]}>
              <boxGeometry args={[topW + 0.1, 0.12, topD + 0.1]} />
              <meshStandardMaterial color="#050505" emissive="#ffc985" emissiveIntensity={1.9} roughness={0.6} />
            </mesh>
          );
        }
        if (b.h > 8.5) {
          // antenna mast + slow-blinking red beacon on the tallest towers
          const ah = 1.3 + random(`ah${b.seed}`) * 2.1;
          const on = Math.sin(u * Math.PI * 2 * 0.75 + random(`bp${b.seed}`) * 6) > 0.25;
          nodes.push(
            <mesh key="mast" position={[b.x, topY + ah / 2, b.z]}>
              <boxGeometry args={[0.07, ah, 0.07]} />
              <meshStandardMaterial color="#0a0d13" roughness={1} />
            </mesh>,
            <sprite key="beacon" position={[b.x, topY + ah + 0.05, b.z]} scale={[0.3, 0.3, 0.3]}>
              <spriteMaterial color="#ff2f24" opacity={on ? 0.95 : 0.08} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          );
        }
        return <React.Fragment key={b.seed}>{nodes}</React.Fragment>;
      })}
    </>
  );
};

const shakeOf = (f: number, amp: number) => ({
  x: (random(`sx${f}`) - 0.5) * amp,
  y: (random(`sy${f}`) - 0.5) * amp,
  r: (random(`sr${f}`) - 0.5) * amp * 0.05,
});

/* Original anime-background city art. Irregular rooflines, inked contours,
   perspective streets and individually placed lit windows replace the cube city. */
const AnimeCity: React.FC<{ moving?: boolean; storm?: boolean }> = ({ moving = false, storm = false }) => {
  const f = useCurrentFrame();
  const zoom = 1.015 + 0.012 * interpolate(f, [0, 80], [0, 1], { extrapolateRight: "clamp" });
  const buildings = useMemo(() => Array.from({ length: 19 }, (_, i) => ({
    x: i * 61 - 36 + random(`anime-city-x${i}`) * 38,
    w: 38 + random(`anime-city-w${i}`) * 52,
    h: 175 + random(`anime-city-h${i}`) * 390,
    roof: Math.floor(random(`anime-city-r${i}`) * 8),
    color: ["#23324e", "#293651", "#1c2a45", "#31405b"][i % 4],
    seed: i,
  })), []);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: storm ? "#101a2b" : "#10172c" }}>
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ transform: `scale(${zoom})`, transformOrigin: "50% 54%" }}>
        <defs>
          <linearGradient id="anime-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={storm ? "#111b2d" : "#111a35"} />
            <stop offset="52%" stopColor={storm ? "#263752" : "#4c4768"} />
            <stop offset="76%" stopColor={storm ? "#46536c" : "#d17c81"} />
            <stop offset="100%" stopColor={storm ? "#19283d" : "#e7a07e"} />
          </linearGradient>
          <linearGradient id="anime-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#303650" /><stop offset="100%" stopColor="#090e1c" /></linearGradient>
          <linearGradient id="anime-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#42526c" /><stop offset="45%" stopColor="#1b2943" /><stop offset="100%" stopColor="#101a2c" /></linearGradient>
          <radialGradient id="anime-sun"><stop offset="0%" stopColor="#fff1cb" stopOpacity="0.8" /><stop offset="100%" stopColor="#f39b92" stopOpacity="0" /></radialGradient>
          <filter id="anime-soft"><feGaussianBlur stdDeviation="28" /></filter>
        </defs>
        <rect width="1080" height="1920" fill="url(#anime-sky)" />
        <ellipse cx="546" cy="820" rx="540" ry="220" fill="url(#anime-sun)" opacity={storm ? 0.25 : 0.95} />
        <circle cx="790" cy="730" r="86" fill="#ffd2ae" opacity={storm ? 0.16 : 0.48} />
        <path d={`M-50 ${690 + Math.sin(f * 0.018) * 8} Q250 600 480 690 T1120 650`} fill="none" stroke="#d9a2a3" strokeOpacity="0.16" strokeWidth="36" filter="url(#anime-soft)" />
        {/* distant, soft skyline */}
        {Array.from({ length: 25 }, (_, i) => {
          const x = i * 48 - 28;
          const h = 120 + random(`anime-far-h${i}`) * 210;
          const w = 32 + random(`anime-far-w${i}`) * 28;
          const top = 1040 - h;
          return <path key={`far${i}`} d={`M${x} 1050 L${x} ${top + 22} L${x + w * 0.42} ${top} L${x + w} ${top + 16} L${x + w} 1050 Z`} fill="#424764" opacity="0.55" />;
        })}
        {/* main skyline with varied roof silhouettes and hand-inked edge highlights */}
        {buildings.map((b) => {
          const top = 1080 - b.h;
          const d = b.roof === 0
            ? `M${b.x} 1090 L${b.x} ${top + 42} Q${b.x + b.w * 0.5} ${top + 28} ${b.x + b.w} ${top + 42} L${b.x + b.w} 1090 Z`
            : b.roof === 1
              ? `M${b.x} 1090 L${b.x} ${top + 68} L${b.x + b.w * 0.22} ${top + 68} L${b.x + b.w * 0.42} ${top + 20} L${b.x + b.w * 0.58} ${top + 34} L${b.x + b.w} ${top + 48} L${b.x + b.w} 1090 Z`
              : b.roof === 2
                ? `M${b.x} 1090 L${b.x} ${top + 50} L${b.x + b.w * 0.28} ${top + 50} L${b.x + b.w * 0.28} ${top + 12} L${b.x + b.w * 0.7} ${top + 12} L${b.x + b.w * 0.7} ${top + 34} L${b.x + b.w} ${top + 34} L${b.x + b.w} 1090 Z`
              : b.roof === 3
                ? `M${b.x} 1090 L${b.x} ${top + 40} L${b.x + b.w * 0.34} ${top + 4} L${b.x + b.w * 0.72} ${top + 22} L${b.x + b.w} ${top + 40} L${b.x + b.w} 1090 Z`
                : b.roof === 4
                  ? `M${b.x} 1090 L${b.x} ${top + 56} L${b.x + 10} ${top + 44} L${b.x + 5} ${top + 26} Q${b.x + b.w * 0.5} ${top - 8} ${b.x + b.w - 5} ${top + 26} L${b.x + b.w - 10} ${top + 44} L${b.x + b.w} ${top + 56} L${b.x + b.w} 1090 Z`
                  : b.roof === 5
                    ? `M${b.x} 1090 L${b.x} ${top + 72} L${b.x + b.w * 0.18} ${top + 72} L${b.x + b.w * 0.18} ${top + 40} L${b.x + b.w * 0.36} ${top + 40} L${b.x + b.w * 0.36} ${top + 14} L${b.x + b.w * 0.74} ${top + 14} L${b.x + b.w * 0.74} ${top + 50} L${b.x + b.w} ${top + 50} L${b.x + b.w} 1090 Z`
                    : b.roof === 6
                      ? `M${b.x} 1090 L${b.x} ${top + 46} Q${b.x + b.w * 0.12} ${top + 42} ${b.x + b.w * 0.2} ${top + 18} Q${b.x + b.w * 0.5} ${top - 12} ${b.x + b.w * 0.78} ${top + 18} Q${b.x + b.w * 0.9} ${top + 42} ${b.x + b.w} ${top + 46} L${b.x + b.w} 1090 Z`
                      : `M${b.x} 1090 L${b.x} ${top + 54} L${b.x + b.w * 0.12} ${top + 54} L${b.x + b.w * 0.12} ${top + 28} L${b.x + b.w * 0.78} ${top + 2} L${b.x + b.w} ${top + 16} L${b.x + b.w} 1090 Z`;
          return (
            <g key={`building${b.seed}`}>
              <path d={d} fill={b.color} stroke="#10192c" strokeWidth="8" strokeLinejoin="round" />
              <path d={`M${b.x + b.w * 0.74} ${top + 48} L${b.x + b.w} ${top + 42} L${b.x + b.w} 1080 L${b.x + b.w * 0.74} 1080 Z`} fill="#101a30" opacity="0.62" />
              <path d={`M${b.x + 11} ${top + 74} Q${b.x + b.w * 0.24} ${top + 68} ${b.x + b.w * 0.45} ${top + 74} L${b.x + b.w * 0.45} 1074`} fill="none" stroke="#c0b1a7" strokeOpacity="0.34" strokeWidth="4" />
              <path d={`M${b.x + 6} ${top + 54} L${b.x + 6} 1072`} stroke="#8792aa" strokeOpacity="0.3" strokeWidth="3" />
              {Array.from({ length: Math.floor(b.h / 38) }, (_, row) => Array.from({ length: Math.max(2, Math.floor(b.w / 16)) }, (_, col) => {
                const lit = random(`anime-window${b.seed}-${row}-${col}`) > 0.48;
                const wx = b.x + 8 + col * 15;
                const wy = top + 64 + row * 34;
                return <g key={`${row}-${col}`}>
                  <rect x={wx} y={wy} width={7} height={13} rx={2} fill={lit ? (col % 3 === 0 ? "#ffd49a" : "#a7d4eb") : "#101b30"} opacity={lit ? 0.7 : 0.8} />
                  {row % 5 === 2 && col % 3 === 1 && <path d={`M${wx - 3} ${wy + 16} L${wx + 10} ${wy + 16} L${wx + 8} ${wy + 21} L${wx - 1} ${wy + 21} Z`} fill="#b58278" opacity="0.52" />}
                </g>;
              }))}
              {b.roof === 3 && <path d={`M${b.x + b.w * 0.5} ${top + 4} L${b.x + b.w * 0.5} ${top - 45} M${b.x + b.w * 0.5 - 13} ${top - 18} L${b.x + b.w * 0.5 + 13} ${top - 18}`} stroke="#141e32" strokeWidth="5" />}
              <path d={`M${b.x + 5} ${top + 50} Q${b.x + b.w * 0.45} ${top + 44} ${b.x + b.w - 4} ${top + 52}`} fill="none" stroke="#d8a58b" strokeOpacity="0.42" strokeWidth="3" />
            </g>
          );
        })}
        {/* perspective avenue and flowing traffic */}
        <path d="M418 1010 L662 1010 L1110 1920 L-30 1920 Z" fill="url(#anime-road)" stroke="#111728" strokeWidth="14" />
        <path d="M534 1030 L543 1030 L568 1920 L514 1920 Z" fill="#d9b68d" opacity="0.34" />
        <path d="M546 1040 L549 1040 L554 1920 L542 1920 Z" fill="#f0d2a6" opacity="0.7" />
        {Array.from({ length: 15 }, (_, i) => {
          const y = 1110 + i * 62;
          const width = 15 + i * 13;
          const dashOffset = moving ? -(f * (2 + i * 0.2)) % 180 : 0;
          return <g key={`traffic${i}`} opacity={0.72 - i * 0.018}>
            <path d={`M${540 - width * 1.8} ${y} L${540 - width * 0.55} ${y + 2}`} stroke="#ffc28b" strokeWidth={Math.max(2, i * 1.1)} strokeDasharray={`${width * 0.45} ${width * 0.22}`} strokeDashoffset={dashOffset} />
            <path d={`M${540 + width * 0.55} ${y} L${540 + width * 1.8} ${y + 2}`} stroke="#ff6e7e" strokeWidth={Math.max(2, i * 1.05)} strokeDasharray={`${width * 0.42} ${width * 0.28}`} strokeDashoffset={-dashOffset} />
          </g>;
        })}
        <path d="M0 1080 Q540 1025 1080 1080" fill="none" stroke="#ffca9e" strokeOpacity="0.58" strokeWidth="5" />
        {storm && <rect width="1080" height="1920" fill="#071426" opacity="0.36" />}
      </svg>
      {storm && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(7,14,26,0.46), rgba(16,26,43,0.08) 50%, rgba(4,9,18,0.62))" }} />}
    </AbsoluteFill>
  );
};

/* S1a — anime-style dusk city with moving traffic */
const S1City: React.FC = () => <AnimeCity moving />;

/* S1b — the giant clock freezes */
const S1Clock: React.FC = () => {
  // useCurrentFrame() inside <Sequence> is ALREADY sequence-local: first frame here = 0
  const f = useCurrentFrame();
  const zoom = 1 + interpolate(f, [0, 44], [0, 0.3], { extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const freezeAt = FREEZE - F1b;
  const frozen = f >= freezeAt;
  const FULL = Math.PI * 2 * 4.1;
  const ang = frozen ? FULL : interpolate(f, [0, freezeAt], [0, FULL], { extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const hand = (a: number, L: number, tail: number, w: number, color: string) => {
    const sx = Math.sin(a), cy = -Math.cos(a);
    return <line x1={-sx * tail} y1={-cy * tail} x2={sx * L} y2={cy * L} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  };
  const flash = frozen && f < 4;
  return (
    <AbsoluteFill style={{ backgroundColor: "#07090f", background: "radial-gradient(circle at 50% 42%, #2b2417 0%, #0a0a10 70%)" }}>
      <svg
        style={{
          width: 1300, height: 1300, position: "absolute",
          left: (1080 - 1300) / 2, top: 300,
          transform: `scale(${zoom})`, transformOrigin: "50% 46%",
        }}
        viewBox="-100 -100 200 200"
      >
          <circle r={92} fill="#cfcabf" />
          <ellipse cx={-14} cy={-28} rx={62} ry={50} fill="#ffffff" opacity={0.10} />
          <circle r={80} fill="#b6b1a7" opacity={0.5} />
          <circle r={86} fill="none" stroke="#8a857a" strokeWidth={1.4} />
          <circle r={92} fill="none" stroke="#1d1a15" strokeWidth={5} />
          {/* roman numerals */}
          {["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"].map((num, i) => {
            const a = (i / 12) * Math.PI * 2;
            const x = Math.sin(a) * 57;
            const y = -Math.cos(a) * 57;
            return (
              <text key={num} x={x} y={y} fill="#2f2820" fontSize={i % 3 === 0 ? 17 : 13} fontFamily="Georgia, 'Times New Roman', serif" fontWeight="bold" textAnchor="middle" dominantBaseline="central" letterSpacing={0.5}>
                {num}
              </text>
            );
          })}
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = i % 5 === 0 ? 72 : 78;
            const r2 = 82;
            return (
              <line
                key={i}
                x1={Math.sin(a) * r1}
                y1={-Math.cos(a) * r1}
                x2={Math.sin(a) * r2}
                y2={-Math.cos(a) * r2}
                stroke="#2c2620"
                strokeWidth={i % 5 === 0 ? 2.6 : 1}
              />
            );
          })}
          {hand(38 * (Math.PI / 180) + Math.min(1, Math.max(0, (f - 12) / 8)) * 0.12, 40, 8, 6, "#211c16")}
          {hand(175 * (Math.PI / 180) + ang * 0.06, 64, 12, 4, "#211c16")}
          {hand(ang, 74, 16, 2, "#c33b2c")}
          <circle r={4.5} fill="#171310" />
      </svg>
      {flash && <AbsoluteFill style={{ backgroundColor: "#fff", opacity: 0.75 }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.78) 100%)" }} />
    </AbsoluteFill>
  );
};

/* S2 — the first disaster: the west wind */
const S2Wind: React.FC = () => {
  const f = useCurrentFrame(); // sequence-local
  const u = f / FPS;
  const amp = 9 * Math.min(1, u * 2.5);
  const s = shakeOf(f, amp);
  const debris = useMemo(
    () => Array.from({ length: 26 }, (_, i) => ({
      y: 0.6 + random(`dy${i}`) * 5.5,
      z: -9 + random(`dz${i}`) * 10,
      off: random(`do${i}`) * 70,
      sp: 16 + random(`ds${i}`) * 14,
      rot: 2 + random(`dr${i}`) * 7,
      big: random(`db${i}`) > 0.6,
    })),
    []
  );
  const papers = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({ y: 0.4 + random(`py${i}`) * 6, z: -10 + random(`pz${i}`) * 12, off: random(`po${i}`) * 70, sp: 26 + random(`ps${i}`) * 18, flip: 4 + random(`pf${i}`) * 8 })),
    []
  );
  return (
    <>
      <AbsoluteFill style={{ transform: `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)`, backgroundColor: "#04060b" }}>
        <AnimeCity storm />
      </AbsoluteFill>
      {/* debris + paper streaks (2D overlays for speed) */}
      {debris.map((d, i) => {
        const x = 1.4 - (((u * d.sp + d.off) % 70) / 70) * 2.8;
        return <div key={i} style={{ position: "absolute", width: d.big ? 26 : 12, height: d.big ? 18 : 8, background: "#0d1016", opacity: 0.85, filter: `blur(${d.big ? 1 : 2}px)`, transform: `translate(${((x + 1) / 2.8) * 1400 - 200}px, ${d.y * 95}px) rotate(${u * d.rot * 60}deg)` }} />;
      })}
      {papers.map((p, i) => {
        const x = 1.5 - (((u * p.sp + p.off) % 80) / 80) * 3;
        return <div key={i} style={{ position: "absolute", width: 42, height: 3, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)", transform: `translate(${((x + 1.5) / 3) * 1500 - 250}px, ${p.y * 105}px)`, opacity: 0.75 }} />;
      })}
      {/* wind skews the whole frame slightly */}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(10,14,22,0.5), transparent 30%)", transform: `skewY(${(random(`skew${Math.floor(f / 3)}`) - 0.5) * 0.7}deg)` }} />
    </>
  );
};

let _glowTex: HTMLCanvasElement | null = null;
const glowTex = () => {
  if (_glowTex) { return _glowTex; }
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.28, "rgba(230,240,255,0.95)");
  grd.addColorStop(0.5, "rgba(190,215,255,0.35)");
  grd.addColorStop(1, "rgba(180,210,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  _glowTex = c;
  return c;
};

let _moonTex: THREE.CanvasTexture | null = null;
const moonTex = () => { _moonTex ??= new THREE.CanvasTexture(glowTex()); return _moonTex; };

/* S3 — the oceans */
const OceanScene: React.FC<{ mode: "wave" | "coast" }> = ({ mode }) => {
  const f = useCurrentFrame();
  const cam = mode === "wave"
    ? { from: [0, 3.1, 8.5] as [number, number, number], to: [0, 3.6, 7.2] as [number, number, number], look: [0, 3.2, -8] as [number, number, number], fov: 54 }
    : { from: [4.5, 6.8, 11.5] as [number, number, number], to: [3.8, 6.0, 9.8] as [number, number, number], look: [0, 0.8, -6] as [number, number, number], fov: 44 };
  // lit-window texture: one facade pattern per flooded tower (they differ like real towers do)
  const coastTex = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => {
        const t = new THREE.CanvasTexture(facadeTex(`cs${i}`, 6));
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
      }),
    []
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "#081422" }}>
      <ThreeCanvas width={1080} height={1920} linear={false} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: cam.fov, near: 0.1, far: 200 }}>
        <color attach="background" args={["#0d2036"]} />
        <SpaceRig cam={cam} />
        <ambientLight intensity={0.55} color="#9fb8d8" />
        <hemisphereLight args={["#3d5a7e", "#0a1420", 0.6]} />
        <directionalLight position={[-8, 12, -6]} intensity={1.7} color="#cfe0ff" />
        <directionalLight position={[6, 5, -14]} intensity={1.1} color="#b9d4ff" />
        <fog attach="fog" args={["#0d2036", 20, 75]} />
        {/* cold moon in the sky */}
        <sprite position={[5.5, 7.5, -18]} scale={[3.8, 3.8, 3.8]}>
          <spriteMaterial map={moonTex()} color="#a9c9ef" opacity={0.58} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <OceanGroup mode={mode} />
        {/* distant skyline for the coast mode */}
        {mode === "coast" && (
          <group position={[-13, 0, -14]}>
            {Array.from({ length: 13 }, (_, i) => {
              const h = 1.3 + random(`cb${i}`) * 2.4;
              const w = 1.5 + random(`cw${i}`) * 0.9;
              const x = i * 2.15;
              const twoT = h > 2.7;
              const h1 = twoT ? h * 0.66 : h;
              const h2 = twoT ? h * 0.34 : 0;
              const w2 = twoT ? w * 0.62 : 0;
              const base = coastTex[i];
              const lit = 0.7 + 0.5 * random(`cl${i}`);
              const mkTier = (th: number, tw: number, y0: number, k: number) => {
                const t = base.clone();
                t.needsUpdate = true;
                t.repeat.set(1.2, Math.max(1, th / 1.7));
                return (
                  <mesh key={`b${k}`} position={[x, y0 + th / 2, 0]}>
                    <boxGeometry args={[tw, th, 1.6]} />
                    <meshStandardMaterial color="#141a24" map={t} emissiveMap={t} emissive={new THREE.Color("#ffb96a")} emissiveIntensity={lit} roughness={0.9} />
                  </mesh>
                );
              };
              const topY = h1 + h2;
              const blink = Math.sin((f / FPS) * Math.PI * 2 * 0.75 + random(`cp${i}`) * 6) > 0.25;
              return (
                <React.Fragment key={i}>
                  {mkTier(h1, w, 0, 1)}
                  {twoT && mkTier(h2, w2, h1, 2)}
                  {twoT && (
                    <mesh position={[x, topY + 0.07, 0]}>
                      <boxGeometry args={[w2 + 0.22, 0.12, 1.7]} />
                      <meshStandardMaterial color="#0d1119" roughness={1} />
                    </mesh>
                  )}
                  {h > 3.1 && (
                    <>
                      <mesh position={[x, topY + 0.45, 0]}>
                        <boxGeometry args={[0.05, 0.9, 0.05]} />
                        <meshStandardMaterial color="#0a0d13" roughness={1} />
                      </mesh>
                      <sprite position={[x, topY + 0.95, 0]} scale={[0.22, 0.22, 0.22]}>
                        <spriteMaterial color="#ff2f24" opacity={blink ? 0.9 : 0.08} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
                      </sprite>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </group>
        )}
      </ThreeCanvas>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 42% 28%, transparent 58%, rgba(4,10,20,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

/* The original low-poly wave read as a flat wall. This layered illustration
   keeps the crest legible at phone size and lets the water fill the portrait. */
const WaveScene: React.FC = () => {
  const f = useCurrentFrame();
  const r = f / FPS;
  const progress = interpolate(r, [0, 2.7], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const baseY = 1660 - progress * 520;
  const drift = Math.sin(r * 1.2) * 22;
  const crest = baseY - 385;
  const surf = `M0 ${baseY + 120} C160 ${baseY + 40} 230 ${baseY + 105} 365 ${baseY + 70} C500 ${baseY + 32} 590 ${crest + 20} 700 ${crest} C790 ${crest - 22} 806 ${crest + 72} 860 ${crest + 110} C920 ${crest + 147} 972 ${crest + 126} 1080 ${crest + 190} L1080 1920 L0 1920 Z`;
  const foam = `M0 ${baseY + 120} C160 ${baseY + 40} 230 ${baseY + 105} 365 ${baseY + 70} C500 ${baseY + 32} 590 ${crest + 20} 700 ${crest} C790 ${crest - 22} 806 ${crest + 72} 860 ${crest + 110} C920 ${crest + 147} 972 ${crest + 126} 1080 ${crest + 190}`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "linear-gradient(180deg, #050c16 0%, #101e31 34%, #1d3853 58%, #07111e 100%)" }}>
      {/* distant storm haze and a small, soft moon */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 76% 27%, rgba(154,190,222,0.28), transparent 22%), linear-gradient(180deg, transparent 44%, rgba(113,155,188,0.15) 50%, transparent 60%)" }} />
      <div style={{ position: "absolute", left: "75%", top: "23%", width: 82, height: 82, borderRadius: "50%", background: "radial-gradient(circle at 38% 35%, #e3edf4 0%, #9eb8cf 38%, rgba(128,163,192,0.18) 72%, transparent 74%)", boxShadow: "0 0 60px 18px rgba(150,190,222,0.12)" }} />
      <svg viewBox="0 0 1080 1920" preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="waveBody" x1="0" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="#9bc3dc" />
            <stop offset="9%" stopColor="#347ca7" />
            <stop offset="38%" stopColor="#15527e" />
            <stop offset="100%" stopColor="#071d35" />
          </linearGradient>
          <linearGradient id="waveFace" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#6ca6c8" stopOpacity="0.78" />
            <stop offset="52%" stopColor="#164e78" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#07182a" stopOpacity="0.08" />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>
        {/* layered swell gives the water depth before the main crest arrives */}
        <path d={`M0 ${1420 + drift} C180 ${1280 - drift} 330 ${1450 + drift} 520 ${1330} C730 ${1200 - drift} 850 ${1390} 1080 ${1240} L1080 1920 L0 1920 Z`} fill="#102f4c" opacity="0.78" />
        <path d={surf} fill="url(#waveBody)" />
        <path d={`M0 ${baseY + 210} C200 ${baseY + 130} 330 ${baseY + 190} 475 ${baseY + 125} C640 ${baseY + 55} 718 ${crest + 130} 826 ${crest + 170} C940 ${crest + 220} 1000 ${crest + 205} 1080 ${crest + 250} L1080 1920 L0 1920 Z`} fill="url(#waveFace)" />
        <path d={foam} fill="none" stroke="#c5e3ef" strokeOpacity="0.56" strokeWidth="28" filter="url(#waveGlow)" />
        <path d={foam} fill="none" stroke="#d9edf5" strokeOpacity="0.88" strokeWidth="7" strokeLinecap="round" />
        <path d={`M0 ${baseY + 135} C180 ${baseY + 58} 270 ${baseY + 125} 390 ${baseY + 92} C540 ${baseY + 45} 610 ${crest + 62} 706 ${crest + 54}`} fill="none" stroke="#f0f7fa" strokeOpacity="0.58" strokeWidth="3" />
        {/* spray arcs off the curling lip */}
        {Array.from({ length: 22 }, (_, i) => {
          const x = 770 + random(`wave-spray-x${i}`) * 265;
          const y = crest + 28 + random(`wave-spray-y${i}`) * 168;
          const size = 2 + random(`wave-spray-size${i}`) * 7;
          const sway = Math.sin(r * 3 + i) * 12;
          const opacity = 0.32 + 0.5 * Math.abs(Math.sin(r * 1.7 + i * 1.4));
          return <circle key={i} cx={x + sway} cy={y - progress * 28} r={size} fill="#e7f5fb" opacity={opacity} />;
        })}
      </svg>
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(1,5,10,0.24), transparent 34%, transparent 74%, rgba(0,5,11,0.38))" }} />
    </AbsoluteFill>
  );
};

const CoastScene: React.FC = () => {
  const f = useCurrentFrame();
  const r = f / FPS;
  const rise = interpolate(r, [0, 3], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const waterY = 1510 - rise * 500;
  const city = useMemo(() => Array.from({ length: 19 }, (_, i) => ({
    x: i * 61 - 26 + random(`coast-x${i}`) * 20,
    w: 42 + random(`coast-w${i}`) * 34,
    h: 130 + random(`coast-h${i}`) * 280,
    seed: i,
  })), []);
  const shoreline = `M0 ${waterY + 80} C145 ${waterY + 38} 240 ${waterY + 120} 360 ${waterY + 65} C480 ${waterY + 12} 575 ${waterY + 44} 690 ${waterY - 20} C830 ${waterY - 90} 925 ${waterY + 50} 1080 ${waterY - 15} L1080 1920 L0 1920 Z`;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "linear-gradient(180deg, #050b15 0%, #111f31 43%, #25415a 67%, #07121f 100%)" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 28%, rgba(165,196,220,0.2), transparent 20%), linear-gradient(180deg, transparent 42%, rgba(101,144,174,0.16) 53%, transparent 65%)" }} />
      <div style={{ position: "absolute", left: "74%", top: "25%", width: 74, height: 74, borderRadius: "50%", background: "radial-gradient(circle at 38% 35%, #d9e7f1 0%, #8daac2 42%, rgba(120,158,189,0.1) 72%, transparent 74%)", boxShadow: "0 0 48px 16px rgba(147,187,216,0.12)" }} />
      {/* distant shore and layered towers */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: `calc(100% - 1000px)`, height: 165, background: "linear-gradient(180deg, #0c1725, #08111d)" }} />
      {city.map((b) => {
        const top = 1000 - b.h;
        const roofStyle = b.seed % 3;
        const roofPath = roofStyle === 0
          ? `M0 300 L0 45 Q40 30 80 45 L80 300 Z`
          : roofStyle === 1
            ? `M0 300 L0 82 L22 82 L36 28 L54 44 L80 44 L80 300 Z`
            : `M0 300 L0 70 L23 70 L23 18 L59 18 L59 52 L80 52 L80 300 Z`;
        return (
          <svg key={b.seed} viewBox="0 0 80 300" preserveAspectRatio="none" style={{ position: "absolute", left: b.x, top, width: b.w, height: b.h, overflow: "visible", filter: "drop-shadow(0 0 18px rgba(0,0,0,0.28))" }}>
            <path d={roofPath} fill="#111d2d" stroke="#050b15" strokeWidth="7" strokeLinejoin="round" />
            <path d={`M8 54 Q40 47 72 54 M11 62 L11 292 M70 62 L70 292`} fill="none" stroke="#96a9bb" strokeOpacity="0.34" strokeWidth="3" />
            {Array.from({ length: 7 }, (_, row) => Array.from({ length: 3 }, (_, col) => {
              const lit = random(`coast-window${b.seed}-${row}-${col}`) > 0.35;
              return <rect key={`${row}-${col}`} x={13 + col * 20} y={78 + row * 29} width={10} height={15} rx={3} fill={lit ? (col === 1 ? "#ffd6a0" : "#9ec9e0") : "#1d2b3c"} opacity={lit ? 0.72 : 0.82} />;
            }))}
            <path d={`M4 112 Q40 104 76 112 M4 198 Q40 190 76 198`} fill="none" stroke="#8497aa" strokeOpacity="0.42" strokeWidth="4" />
          </svg>
        );
      })}
      <svg viewBox="0 0 1080 1920" preserveAspectRatio="none" width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="surgeWater" x1="0" y1="0" x2="0.1" y2="1"><stop offset="0%" stopColor="#a3cfdf" /><stop offset="8%" stopColor="#347da2" /><stop offset="38%" stopColor="#145577" /><stop offset="100%" stopColor="#071a2c" /></linearGradient>
          <filter id="surgeSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
        </defs>
        <path d={`M0 ${waterY + 175} C240 ${waterY + 80} 430 ${waterY + 150} 585 ${waterY + 78} C760 ${waterY + 2} 900 ${waterY + 95} 1080 ${waterY + 40} L1080 1920 L0 1920 Z`} fill="#0d3554" opacity="0.78" />
        <path d={shoreline} fill="url(#surgeWater)" />
        <path d={shoreline.slice(0, shoreline.indexOf(" L1080"))} fill="none" stroke="#d7edf4" strokeWidth="10" strokeOpacity="0.7" filter="url(#surgeSoft)" />
        <path d={shoreline.slice(0, shoreline.indexOf(" L1080"))} fill="none" stroke="#d8edf4" strokeWidth="4" strokeOpacity="0.8" />
        {Array.from({ length: 18 }, (_, i) => {
          const x = random(`coast-spray-x${i}`) * 1080;
          const y = waterY + 15 + random(`coast-spray-y${i}`) * 155;
          const size = 2 + random(`coast-spray-size${i}`) * 5;
          return <circle key={i} cx={x + Math.sin(r * 2 + i) * 10} cy={y - rise * 20} r={size} fill="#e2f3f8" opacity={0.35 + 0.45 * Math.abs(Math.sin(r * 2.3 + i))} />;
        })}
      </svg>
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(180deg, rgba(1,5,10,0.18), transparent 35%, transparent 70%, rgba(0,4,9,0.34))" }} />
    </AbsoluteFill>
  );
};

const OceanGroup: React.FC<{ mode: "wave" | "coast" }> = ({ mode }) => {
  // animated ocean surface
  const f = useCurrentFrame();
  const geo = useMemo(() => new THREE.PlaneGeometry(200, 180, 112, 72), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo]);
  const waveGeo = useMemo(() => new THREE.PlaneGeometry(72, 6, 112, 36), []);
  const waveBase = useMemo(() => Float32Array.from(waveGeo.attributes.position.array), [waveGeo]);
  const r = f / FPS;
  // f is sequence-local: drive surge straight off it (rise modestly so the city stays in shot)
  const surgeRise = mode === "coast" ? interpolate(r, [0, 3.0], [-1.4, 0.45], { extrapolateRight: "clamp" }) : 0;
  const surgePush = mode === "coast" ? interpolate(r, [0, 3.0], [-6, 1.8], { extrapolateRight: "clamp" }) : 0;
  const amp = mode === "wave" ? interpolate(r, [0, 2.7], [0.6, 1.9], { extrapolateRight: "clamp" }) : 0.8;
  const posArr = geo.attributes.position.array as Float32Array;
  for (let i = 0; i < posArr.length; i += 3) {
    const x = base[i], y = base[i + 1], z = base[i + 2];
    void y;
    posArr[i + 2] = amp * (0.26 * Math.sin(x * 0.72 + r * 2.4) + 0.16 * Math.sin(z * 0.84 - r * 1.8) + 0.1 * Math.sin((x + z) * 0.42 + r * 3.2));
  }
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();
  // A segmented, curling water face keeps the tsunami from reading as a box.
  const tEnd = mode === "wave" ? 2.7 : 3.0;
  const wallH = mode === "wave" ? interpolate(r, [0, tEnd], [1.2, 9.5], { extrapolateRight: "clamp" }) : interpolate(r, [0, tEnd], [0.6, 6.2], { extrapolateRight: "clamp" });
  const wallZ = mode === "wave" ? interpolate(r, [0, tEnd], [-34, -12], { extrapolateRight: "clamp" }) : interpolate(r, [0, tEnd], [-19, -4.5], { extrapolateRight: "clamp" });
  const wavePos = waveGeo.attributes.position.array as Float32Array;
  for (let i = 0; i < wavePos.length; i += 3) {
    const x = waveBase[i];
    const v = (waveBase[i + 1] + 3) / 6;
    const curl = Math.max(0, v - 0.68) / 0.32;
    wavePos[i] = x;
    wavePos[i + 1] = -0.35 + v * wallH + Math.sin(x * 0.3 + r * 1.5) * (0.12 + v * 0.12);
    wavePos[i + 2] = waveBase[i + 2] + Math.sin(v * Math.PI) * 0.72 + curl * curl * 1.35 + Math.sin(x * 0.2 + v * 7 + r) * 0.16;
  }
  waveGeo.attributes.position.needsUpdate = true;
  waveGeo.computeVertexNormals();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, surgeRise, surgePush]}>
        <primitive object={geo} attach="geometry" />
        <meshStandardMaterial color="#24688f" roughness={0.24} metalness={0.12} />
      </mesh>
      <mesh geometry={waveGeo} position={[0, 0, wallZ]}>
        <meshStandardMaterial color="#1974a6" roughness={0.24} metalness={0.08} side={THREE.DoubleSide} />
      </mesh>
      {mode === "wave" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
          <planeGeometry args={[120, 80]} />
          <meshStandardMaterial color="#0a2540" roughness={0.85} />
        </mesh>
      )}
    </group>
  );
};

/* S4b — scorched lands */
const S4Scorched: React.FC = () => {
  const f = useCurrentFrame(); // sequence-local
  const u = f / FPS;
  // procedural mud-crack network on the ground
  const cracks = useMemo(() => {
    const paths: { d: string; w: number }[] = [];
    for (let k = 0; k < 16; k++) {
      let x = 40 + random(`ck${k}`) * 1000;
      let y = 1935;
      let d = `M${x.toFixed(0)},${y}`;
      for (let s = 0; s < 5; s++) {
        x += (random(`ckx${k}_${s}`) - 0.5) * 250;
        y -= 65 + random(`cky${k}_${s}`) * 85;
        d += ` L${x.toFixed(0)},${y.toFixed(0)}`;
        if (random(`ckb${k}_${s}`) > 0.55) {
          const bx = x + (random(`ckbx${k}_${s}`) - 0.5) * 190;
          paths.push({ d: `M${x.toFixed(0)},${y.toFixed(0)} L${bx.toFixed(0)},${(y + 55).toFixed(0)}`, w: 2.5 });
        }
      }
      paths.push({ d, w: k % 3 === 0 ? 6 : 3.5 });
    }
    return paths;
  }, []);
  const shimmerSeed = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #ffd9a0 0%, #ff9d4d 16%, #f0722a 36%, #b8451c 58%, #5a1e0c 78%, #24100a 100%)" }}>
      {/* sun: hot core + halo */}
      <div style={{ position: "absolute", top: "6%", left: "54%", width: 210, height: 210, borderRadius: "50%", background: "radial-gradient(circle, #ffffff 0%, #fff6da 38%, rgba(255,238,190,0) 72%)", boxShadow: "0 0 170px 90px rgba(255,214,150,0.5)" }} />
      <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        {/* slow-rotating god rays */}
        <g transform={`translate(648 230) rotate(${u * 5})`} opacity={0.5}>
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} transform={`rotate(${(i * 360) / 14})`} d="M0,0 L16,-560 L-16,-560 Z" fill="rgba(255,224,170,0.13)" />
          ))}
        </g>
        {/* ground with animated heat shimmer */}
        <defs>
          <filter id="heatshim" x="-8%" y="-6%" width="116%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed={shimmerSeed} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter="url(#heatshim)">
          <path d="M0,1250 Q260,1140 540,1230 T1080,1180 L1080,1920 L0,1920 Z" fill="#2c1208" opacity={0.95} />
          <path d="M0,1330 Q300,1240 620,1320 T1080,1290 L1080,1920 L0,1920 Z" fill="#180806" />
          {/* cracked earth */}
          <g stroke="#0d0402" fill="none" opacity={0.85} strokeLinecap="round">
            {cracks.map((c, i) => (
              <path key={i} d={c.d} strokeWidth={c.w} />
            ))}
          </g>
          <g stroke="#c86a2a" fill="none" opacity={0.35} strokeLinecap="round" transform="translate(0,-2)">
            {cracks.map((c, i) => (
              <path key={i} d={c.d} strokeWidth={1} />
            ))}
          </g>
        </g>
      </svg>
      {/* rising heat columns */}
      {Array.from({ length: 5 }, (_, i) => {
        const drift = Math.sin(u * 1.4 + i * 1.9) * 34;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${8 + i * 19}%`,
              top: `${58 + (i % 2) * 7}%`,
              width: 150,
              height: 360,
              background: "linear-gradient(180deg, rgba(255,150,70,0.18), transparent)",
              filter: "blur(20px)",
              transform: `translateX(${drift}px)`,
            }}
          />
        );
      })}
      {Array.from({ length: 40 }, (_, i) => {
        const rise = ((u * (14 + random(`em${i}`) * 26) + random(`eoff${i}`)) % 1);
        return <div key={i} style={{ position: "absolute", left: `${random(`ex${i}`) * 100}%`, top: `${88 - rise * 55}%`, width: 4, height: 4, borderRadius: 8, background: "#ffb35c", opacity: 0.85 * (1 - rise), boxShadow: "0 0 8px 2px rgba(255,150,70,0.7)" }} />;
      })}
      <AbsoluteFill style={{ background: "linear-gradient(20deg, rgba(255,120,40,0.14), transparent 45%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 55%, rgba(40,8,2,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};

/* S4c — frozen side */
const S4Frozen: React.FC = () => {
  const f = useCurrentFrame(); // sequence-local
  const u = f / FPS;
  const auroraOp = 0.75 + 0.25 * Math.sin(f * 0.07);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #01040e 0%, #061428 40%, #2a5580 72%, #8fc4e4 96%)" }}>
      {/* stars with twinkle */}
      {Array.from({ length: 64 }, (_, i) => {
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f * 0.11 + i * 1.7));
        const s = 2 + (i % 3);
        return (
          <div
            key={`st${i}`}
            style={{
              position: "absolute",
              left: `${random(`stx${i}`) * 100}%`,
              top: `${random(`sty${i}`) * 50}%`,
              width: s,
              height: s,
              borderRadius: 4,
              background: "#eaf6ff",
              opacity: tw * 0.9,
              boxShadow: "0 0 6px 1px rgba(200,235,255,0.7)",
            }}
          />
        );
      })}
      {/* aurora curtains */}
      <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, filter: "blur(14px)", opacity: auroraOp }}>
        <path d="M-60,540 C240,330 620,590 1140,390" stroke="rgba(110,230,190,0.40)" strokeWidth={110} fill="none" strokeLinecap="round" />
        <path d="M-60,740 C300,540 700,770 1140,600" stroke="rgba(120,200,255,0.28)" strokeWidth={80} fill="none" strokeLinecap="round" />
        <path d="M-60,650 C360,470 640,690 1140,500" stroke="rgba(170,140,255,0.18)" strokeWidth={60} fill="none" strokeLinecap="round" />
        <path d={`M-60,${880 + Math.sin(f * 0.05) * 30} C300,760 760,940 1140,800`} stroke="rgba(90,220,180,0.16)" strokeWidth={90} fill="none" strokeLinecap="round" />
      </svg>
      {/* frozen skyline with lit windows + snow caps */}
      {Array.from({ length: 14 }, (_, i) => {
        const h = 120 + random(`fh${i}`) * 210;
        const base = 8 + random(`fb${i}`) * 6;
        const roof = i % 3;
        const silhouette = roof === 0
          ? "M8 360 L8 54 Q50 36 92 54 L92 360 Z"
          : roof === 1
            ? "M8 360 L8 86 L28 86 L39 35 L57 49 L92 49 L92 360 Z"
            : "M8 360 L8 72 L34 72 L34 22 L72 22 L72 53 L92 53 L92 360 Z";
        return (
          <svg key={`b${i}`} viewBox="0 0 100 360" preserveAspectRatio="none" style={{ position: "absolute", bottom: `${base}%`, left: `${(i / 14) * 100 - 2}%`, width: `${100 / 15}%`, height: h, overflow: "visible", filter: "drop-shadow(0 0 12px rgba(91,164,210,0.16))" }}>
            <path d={silhouette} fill="#12263a" stroke="#071322" strokeWidth="7" strokeLinejoin="round" />
            <path d={roof === 0 ? "M8 58 Q50 42 92 58" : roof === 1 ? "M8 86 L28 86 L39 35 L57 49 L92 49" : "M8 72 L34 72 L34 22 L72 22 L72 53 L92 53"} fill="none" stroke="#e7f5fc" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            {Array.from({ length: 7 }, (_, row) => Array.from({ length: 3 }, (_, col) => {
              const lit = random(`frozen-window${i}-${row}-${col}`) > 0.24;
              return <rect key={`${row}-${col}`} x={19 + col * 23} y={94 + row * 34} width={10} height={16} rx={3} fill={lit ? (col === 1 ? "#ffd994" : "#a6d9f1") : "#0a1828"} opacity={lit ? 0.76 : 0.85} />;
            }))}
            <path d="M14 150 Q50 144 86 150 M14 245 Q50 239 86 245" fill="none" stroke="#90c5e3" strokeOpacity="0.44" strokeWidth="4" />
          </svg>
        );
      })}
      {/* snow drift ground */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "7%", background: "linear-gradient(180deg, #cfe4f4 0%, #f2f9ff 60%)" }} />
      {/* snowfall */}
      {Array.from({ length: 70 }, (_, i) => {
        const fall = ((u * (0.3 + random(`sn${i}`) * 0.5) + random(`soff${i}`)) % 1);
        return <div key={`sn${i}`} style={{ position: "absolute", left: `${((random(`sx${i}`) + u * 0.05) % 1) * 100}%`, top: `${fall * 100}%`, width: 3, height: 3, borderRadius: 4, background: "#eaf6ff", opacity: 0.7 }} />;
      })}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(2,6,14,0.7) 100%)" }} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  captions                                                           */
/* ------------------------------------------------------------------ */
const Cap: React.FC<{ from: number; to: number; children: React.ReactNode; size: number; y: number; color?: string; glow?: string; tracking?: number }> = ({ from, to, children, size, y, color = "#ffffff", glow = "rgba(0,0,0,0.85)", tracking = 6 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from || f >= to) return null;
  const pop = spring({ frame: f - from, fps, config: { damping: 14, stiffness: 130 } });
  const out = interpolate(f, [to - 4, to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", transform: `scale(${0.82 + 0.18 * pop})`, opacity: Math.min(pop, out), padding: "0 60px" }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: size, letterSpacing: tracking, color, textTransform: "uppercase", textAlign: "center", lineHeight: 1.18, textShadow: `0 3px 18px ${glow}, 0 1px 4px rgba(0,0,0,0.9)` }}>
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  the film                                                           */
/* ------------------------------------------------------------------ */
export const EarthStopped: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ---------------- picture ---------------- */}
      <Sequence from={F1a} durationInFrames={F1b - F1a}><S1City /></Sequence>
      <Sequence from={F1b} durationInFrames={F2 - F1b}><S1Clock /></Sequence>
      <Sequence from={F2} durationInFrames={F3a - F2}><S2Wind /></Sequence>
      <Sequence from={F3a} durationInFrames={F3b - F3a}><WaveScene /></Sequence>
      <Sequence from={F3b} durationInFrames={F4a - F3b}><CoastScene /></Sequence>
      <Sequence from={F4a} durationInFrames={F5 - F4a}>
        <YearSpaceScene />
      </Sequence>
      <Sequence from={F5} durationInFrames={DUR - F5}>
        <SpaceScene cam={{ from: [1.3, 0.8, 4.6], to: [0.2, 0.5, 14.5], look: [0, 0, 0], fov: 40 }} spin={0} sunDir={[14, 4, 6]} />
      </Sequence>

      <Sequence from={DUR - 18} durationInFrames={18}>
        <FadeBlack />
      </Sequence>

      {/* ---------------- captions ---------------- */}
      <Cap from={12} to={171} size={66} y={300}>What if Earth<br />stopped spinning?</Cap>
      <Cap from={190} to={352} size={72} y={1420} color="#ffd24d" glow="rgba(60,20,0,0.85)" tracking={2}>1,670 km/h</Cap>
      <Cap from={370} to={645} size={52} y={260} color="#ffe1ad" tracking={2}>A thought experiment</Cap>
      <Cap from={684} to={922} size={54} y={300} color="#d8efff" tracking={1}>The air keeps moving</Cap>
      <Cap from={943} to={1155} size={52} y={300} color="#d8efff" tracking={1}>Oceans carry momentum</Cap>
      <Cap from={1185} to={1390} size={62} y={265} color="#fff3c4" tracking={2}>ONE SOLAR DAY ≈ ONE YEAR</Cap>
      <Cap from={1420} to={1615} size={52} y={1510} color="#fff3c4" tracking={1}>Months of day. Months of night.</Cap>
      <Cap from={1640} to={1785} size={48} y={260} tracking={1}>Earth&apos;s spin shapes our days, winds &amp; seas</Cap>

      {/* ---------------- sound ---------------- */}
      <Sequence from={0} durationInFrames={DUR} layout="none">
        <Audio src={staticFile(`${AC}/music-bed.wav`)} volume={(f) => 0.13 * speechDuck(f)} />
      </Sequence>
      {/* city atmosphere stops dead at the freeze */}
      <Sequence from={0} durationInFrames={FREEZE} layout="none">
        <Audio src={staticFile("sfx/amb-city.mp3")} loop volume={(f) => 0.12 * speechDuck(f)} />
        <Audio src={staticFile("sfx/clock-tick.mp3")} loop playbackRate={2.3} volume={(f) => 0.08 * speechDuck(f)} />
      </Sequence>
      <Sequence from={FREEZE} durationInFrames={40} layout="none">
        <Audio src={staticFile(`${AC}/freeze-sweep.wav`)} volume={(f) => 0.10 * speechDuck(FREEZE + f)} />
      </Sequence>
      <Sequence from={F2} durationInFrames={F3a - F2} layout="none">
        <Audio src={staticFile("sfx/amb-wind.mp3")} loop volume={(f) => 0.09 * speechDuck(F2 + f)} />
        <Audio src={staticFile(`${AC}/wind-roar.wav`)} volume={(f) => 0.025 * speechDuck(F2 + f)} />
        {["sfx/whoosh.mp3"].map((s, i) => (
          <Audio key={i} src={staticFile(s)} volume={(f) => 0.045 * speechDuck(F2 + f)} playbackRate={0.9} />
        ))}
      </Sequence>
      {/* narration */}
      <Sequence from={0} durationInFrames={DUR} layout="none">
        <Audio src={staticFile(`${AC_TTS}/elevenlabs-narration.wav`)} volume={0.95} />
      </Sequence>
      {/* oceans */}
      <Sequence from={F3a} durationInFrames={F4a - F3a} layout="none">
        <Audio src={staticFile(`${AC}/ocean-rumble.wav`)} loop volume={(f) => 0.06 * speechDuck(F3a + f)} />
        <Audio src={staticFile(`${AC}/wave-crash.wav`)} volume={(f) => 0.055 * speechDuck(F3a + f)} />
      </Sequence>
      <Sequence from={F4a - 10} durationInFrames={130} layout="none">
        <Audio src={staticFile(`${AC}/space-riser.wav`)} volume={(f) => 0.055 * speechDuck(F4a - 10 + f)} />
      </Sequence>

      <FilmLook />
    </AbsoluteFill>
  );
};

const FadeBlack: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(f, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity: o }} />;
};

/* ------------------------------------------------------------------ */
/* Thumbnail — 1-frame still composition "earth-thumb"                 */
/* ------------------------------------------------------------------ */
const ThumbLine: React.FC<{ children: React.ReactNode; c?: string; s: number }> = ({ children, c = "#fff", s }) => (
  <div
    style={{
      fontSize: s,
      lineHeight: 1.02,
      fontWeight: 900,
      color: c,
      fontFamily: "Impact, 'Arial Black', sans-serif",
      letterSpacing: 2,
      WebkitTextStroke: `12px #000`,
      paintOrder: "stroke fill",
      textShadow: "0 10px 34px rgba(0,0,0,0.9)",
    }}
  >
    {children}
  </div>
);

export const EarthThumb: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Img src={staticFile("films/earth-stopped/thumb-frame.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.12) 34%, transparent 58%, rgba(0,0,0,0.72) 100%)" }} />
    {/* WHAT IF chip */}
    <div style={{ position: "absolute", top: 132, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#e2262c", color: "#fff", fontWeight: 900, fontSize: 66, letterSpacing: 10, padding: "14px 42px", borderRadius: 14, boxShadow: "0 10px 30px rgba(0,0,0,0.55)", transform: "rotate(-2deg)", fontFamily: SANS }}>
        WHAT IF
      </div>
    </div>
    {/* headline */}
    <div style={{ position: "absolute", top: 290, left: 0, right: 0, textAlign: "center" }}>
      <ThumbLine s={236}>EARTH</ThumbLine>
      <ThumbLine s={236} c="#ffb020">STOPS</ThumbLine>
      <ThumbLine s={196}>SPINNING</ThumbLine>
    </div>
    {/* bottom stat chip */}
    <div style={{ position: "absolute", bottom: 560, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "rgba(6,10,18,0.78)", border: "4px solid #ffb020", color: "#fff", fontWeight: 900, fontSize: 72, letterSpacing: 3, padding: "16px 40px", borderRadius: 18, fontFamily: SANS }}>
        🌍 1,670 KM/H
      </div>
    </div>
  </AbsoluteFill>
);
