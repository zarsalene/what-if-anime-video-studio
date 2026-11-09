# Anime art direction, camera and editing

## The look

Build a coherent original anime illustration style for the whole video:

- expressive, clean line art with foreground contours stronger than distant outlines;
- simplified but designed shapes, with hand-shaped silhouettes rather than primitive stacks;
- two or three cel-shaded value groups per object, plus controlled highlights;
- intentional palette and atmospheric depth; use color to distinguish heat, cold, danger, scale or calm;
- detailed focal objects and simplified backgrounds, with enough landmarks to establish place;
- consistent texture treatment, line weight, grain and edge softness across shots.

Do not imitate a named studio, franchise or living artist. Avoid generic cubes, identical towers, repeating window grids, random gradients, and mixed photo/vector/3D styles without a deliberate transition.

## Choose the rendering mode

| Mode | Use it for | Visual rules |
|---|---|---|
| Layered 2D | Most explainers, diagrams, character moments and effects | Draw in SVG/canvas/React layers; use foreground, subject and far-background parallax |
| Stylized 3D | A globe, orbit, fluid volume or camera path that needs real perspective | Use custom silhouettes, painted/cel-shaded materials, inked edges and controlled topology |

Default to 2D layers. Use 3D only when it makes the science easier to see. Avoid building every object from box primitives; create a custom profile, bevel, roofline, silhouette or illustration texture first.

## Light and color

Light has a source and direction: sun, moon, screen, streetlamp, fire, lightning or instrument panel. Separate the focal subject from the background with value and color. Preserve dark detail in night scenes; do not crush all shadow into black.

Use a limited palette per scene and carry colors across cuts. Warm/cool shifts can explain temperature or time; do not use red/blue as decoration alone. Use highlights, rim light and bloom sparingly so faces, labels and diagrams stay readable.

## Camera and composition

- Establish scale, move closer to the mechanism, then show the consequence wide.
- Compose for the requested aspect ratio first. Keep captions, faces and key objects inside mobile-safe margins.
- Use 9:16 vertical for Shorts by default. Keep the main subject in the center safe area; avoid placing essential detail under the app interface.
- Use slow pans, push-ins and parallax for explanation. A fast push, shake or snap zoom belongs on a single impact, not every cut.
- Use motion lines, impact flashes, particles and speed ramps only when they clarify motion or force.
- Separate foreground, action and far background. Atmospheric haze should soften distant scenery, not blur the subject.
- Keep each shot to one main visual idea and a readable silhouette.

## Editing

Use a visual sequence such as setup → trigger → reaction → new scale. Cut on action or narration meaning. Hold a reveal long enough to read; shorten repeated cause-effect steps. Transitions should indicate a change of scale, time or location. Avoid random wipes, constant zooms and long blank frames.

## Building design

For cities, make buildings varied and recognizable: change roof shapes, height, setbacks, balconies, signs, antennas and façade rhythm. Use perspective convergence and atmospheric layers. Place detailed windows only where they help establish scale; never cover every surface with a uniform grid.
