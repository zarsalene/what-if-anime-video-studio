# Stylized 3D anime scenes

Use Three.js when real perspective clarifies the scale or movement of the science. Keep the result illustrated: cel-shaded materials, designed silhouettes, inked contours, simplified painted detail and art-directed light. The studio helpers in `studio/src/lib3d/` are rendering utilities, not a mandatory shape language.

For the shot-to-render workflow, also read `threejs-filmmaking.md`. It covers the Remotion/R3F frame contract, camera and scene design, lighting, render performance and 3D review.

## Build shapes with a silhouette

- Start from the side/front silhouette and add volume only where the camera needs it.
- Vary profiles, taper and rooflines. Create custom meshes or layered planes for cities, landscapes and vehicles.
- Use boxes for simple props or architectural cores, then add setbacks, roofs, frames, trim, windows and outline edges so they do not read as bare blocks.
- Use painted textures sparingly; keep outline thickness and shading consistent with the 2D shots.
- Use one dominant key light and a softer fill. Separate near, middle and far layers with color and atmospheric perspective.

## Camera and animation

- Use long focal lengths for scale and compressed distance; use wider lenses only when the perspective itself is part of the explanation.
- Favor steady moves that explain motion: orbit, dolly, tracking move, tilt or pullback.
- Animate with deterministic frame-based values, not elapsed wall-clock time.
- Keep the subject in frame and avoid clipping important anatomy, labels or consequences.
- Add a small amount of secondary motion, then hold the result so viewers can process it.

## Rendering

Render previews at reduced scale first. For every 3D Remotion render or still, add `--gl=angle`; use `--gl=swangle` if WebGL fails. Review a still from every shot before full export. Check outlines for z-fighting, materials for flat white highlights, and transparent layers for sorting artifacts.
