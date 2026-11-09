# Three.js filmmaking workflow

Use this reference only when a shot benefits from real perspective, dimensional scale, orbital movement, or a 3D scientific model. Keep the default film style anime illustration; use 3D as an art-directed shot, not as a reason to make every scene a generic game render.

## Skills reviewed

The workflow below distills relevant guidance instead of copying or installing overlapping skill packs into this skill:

- Remotion maintainers: [Remotion Agent Skills](https://github.com/remotion-dev/skills) — use the Remotion Best Practices, Markup, Captions and Render guidance when available.
- Remotion maintainers: [@remotion/three](https://www.remotion.dev/docs/three) — current integration notes for React Three Fiber inside Remotion.
- Three.js community: [Three.js Skills](https://github.com/cesartevisual/threejs-skills) — consult scene/camera, geometry, materials, lighting, animation, R3F, shader, performance and debugging workflows as needed. This is an independent community project, not maintained by Three.js.
- API source of truth: [Three.js documentation](https://threejs.org/docs/) and the installed project package versions. Skills are workflow aids; confirm exact APIs against the project's installed versions.

If one of the optional upstream skills is already installed, read the narrowest relevant skill rather than loading the whole collection. Do not install packages or change renderer architecture just because a reference suggests it.

## 1. Plan the shot before building the scene

For each 3D shot, write a small shot card with: scientific idea, main subject, first and last frame, camera position/target, focal length, motion, key light direction, palette, and what the viewer should notice. Use one focal subject and one clear action. If a simple anime illustration explains it better, use 2D.

Design the frame for the requested aspect ratio first. For a vertical Short, reserve the central safe area for the subject and captions; do not crop a widescreen camera setup after the scene is built. Separate foreground, middle distance and background so camera motion creates controlled parallax and atmospheric depth.

## 2. Build readable, original shapes

- Start from a strong silhouette and camera-facing outline; add depth only where the shot needs it.
- Give buildings and props distinct profiles, rooflines, setbacks, balconies, structural rhythm and surface detail. Avoid rows of identical boxes or repeated window grids.
- Use a small visual model sheet for recurring places and objects. Keep proportions, line weight, edge treatment, palette and scale consistent across cuts.
- Use custom geometry for the few hero forms that hold the frame. Use instances or layered planes for distant repeated detail.
- Match the anime treatment of neighboring 2D scenes with designed contours, cel-shaded values, painted color variation and restrained texture.

## 3. Light and shade for the intended mood

Choose the palette and key-light direction before adding lights. Start with one clear key, a restrained fill and a rim or bounce only when it separates the subject. Use environment lighting for reflections when a material needs them; extra ambient light does not replace a designed reflection.

Choose a material model that fits the art direction: toon/unlit shading for graphic anime forms, or restrained PBR for an intentionally dimensional object. Set color textures to the correct color space, keep data textures linear, and check tone mapping and exposure together. Use shadows only where they improve scale or contact; inspect acne, detached shadows, flicker and shadow-frustum edges.

Use outlines, glow, particles, fog and post-processing selectively. Keep outlines stable at the target output size. Every effect should clarify shape or focus attention, not hide weak modeling or flatten the palette.

## 4. Make motion deterministic in Remotion

- Match the installed versions of `three`, `@react-three/fiber` and `@remotion/three`; do not upgrade them for a single shot.
- Prefer `<ThreeCanvas>` from `@remotion/three` when the installed version supports it. It lets Remotion frame hooks drive the R3F scene. Animate every visible value as a pure function of `useCurrentFrame()` and `useVideoConfig()` so a frame renders identically on a rerun.
- Do not use timers, random values without fixed seeds, or a wall-clock-driven `useFrame()` loop for the film timeline. Use seeded randomness and frame-based interpolation for camera, objects, particles and shader uniforms.
- Inside a ThreeCanvas, use `<Sequence layout="none">` so a DOM wrapper is not inserted into the WebGL tree.
- Use eased camera moves with a clear start, destination and settle. Keep secondary motion small, and hold the important result long enough to read.
- Avoid allocating vectors, geometries or materials on every frame. Reuse memoized resources and give every owned texture, render target, geometry and material a clear disposal owner.

## 5. Keep renders reliable and efficient

- Keep assets local under `public/`; verify every model and texture path before rendering. Check GLTF scale, orientation, animation clip names and materials in a still first.
- Reuse geometry/materials and instance repeated background elements. Reduce texture size, shadow area, particles, transparent overdraw and post-effect resolution when render time grows; measure before changing quality.
- Keep 3D scenes isolated from unrelated React updates. Compute reusable paths, seeded layouts and texture data once, not per frame.
- Follow the installed Remotion renderer requirements. The current `@remotion/three` guidance recommends `--gl=angle` for 3D renders; use the project's configured fallback only when ANGLE fails.

## 6. Review the actual movie frames

1. Type-check the project and render a short reduced-scale preview with sound.
2. Inspect a contact sheet covering every shot, plus full-resolution stills at each 3D shot's beginning, middle and end.
3. Check silhouette readability, vertical crop, horizon and camera framing, light direction, outlines, object intersections, transparent sorting, text-safe areas, motion continuity and scene-to-scene style consistency.
4. Re-render the same selected frames to check for non-deterministic flicker. Confirm the final camera pose and subject remain visible at the cut.
5. Fix defects, render again and review the final export; do not infer final quality from the Studio preview alone.

## Further reading

- [Remotion Three.js integration](https://www.remotion.dev/docs/three)
- [Remotion Best Practices skill](https://github.com/remotion-dev/skills/tree/main/skills/remotion-best-practices)
- [Remotion Markup skill](https://github.com/remotion-dev/skills/tree/main/skills/remotion-markup)
- [Community Three.js skill library](https://github.com/cesartevisual/threejs-skills)
