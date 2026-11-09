# Candy Rain — 3D visual references

These stills are local look-development references. They are not composited into the video and are not used to copy a particular film's characters or designs.

## Saved images

| File | Reference and license | Applied to this video |
|---|---|---|
| `glass-half-toon-shading.jpg` | Blender Foundation, *Glass Half*, screenshot of the CC BY 3.0 open movie. [Source/license page](https://commons.wikimedia.org/wiki/File:Glass_Half_-_3D_animation_with_OpenGL_cartoon_rendering.webm) | Clean silhouette separation, simple cel shading and expressive shapes. The falling candy is now rendered as rounded 3D forms with dark ink-like contours and bright specular glints. |
| `sintel-character-lighting.jpg` | Blender Foundation, *Sintel*, screenshot by Blender Foundation, CC BY 3.0. [Source/license page](https://commons.wikimedia.org/wiki/File:Sintel-screenshot-3.jpg) | Warm rim light and a readable character/candy silhouette against a softer environment. |
| `tears-of-steel-city-depth.jpg` | Blender Foundation, *Tears of Steel*, still by Project Mango, CC BY 3.0. [Source/license page](https://commons.wikimedia.org/wiki/File:Tears_of_Steel_frame_03_3c.jpg) | Rooftop layering and atmospheric depth; the background city stays illustrated while near candy gains true perspective and parallax. |

The images remain under their stated licenses. If these reference files are redistributed, retain attribution to Blender Foundation / Project Mango, link the source and CC BY 3.0 license, and note any edits. They are development references, not final-video assets.

## Motion and implementation references

- [Remotion ThreeCanvas](https://www.remotion.dev/docs/three-canvas): use the Remotion synchronized canvas and derive animation directly from `useCurrentFrame()` so every rendered frame is deterministic.
- [Remotion Three.js integration](https://www.remotion.dev/docs/three): use `@remotion/three` with the ANGLE renderer for the frame-render pipeline.
- [Three.js: Creating a scene](https://threejs.org/manual/pages/creating-a-scene.html): compose geometry, materials, a perspective camera and lights as an actual scene rather than faking volume with flat candy icons.

These guides inform the 3D candy layer and camera movement in `src/films/candy-rain/`.
