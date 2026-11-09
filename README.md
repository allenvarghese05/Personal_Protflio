# allenvarghese.com

The portfolio of **Allen Shaji Varghese**, a software engineering student at Drexel University (class of 2027).

There are two ways in:

- **[/projects](https://allenvarghese.com/projects)**: every project on one fast page, each with a full case study. This is the link to share.
- **[/](https://allenvarghese.com)**: the same work inside a walkable 3D world. You fly through a galaxy into a solar system, land on a planet, and walk between districts: Engineering (a stone for each project), the Observatory (about, experience, skills), the Studio (photography, film, beats) and Comms (contact).

## Stack

- **Next.js 16** (App Router, every page prerendered) and **React 19**
- **react-three-fiber**, **drei** and **postprocessing** for the 3D intro, world and helmet reveal
- **Framer Motion** and **GSAP** for motion, **Tailwind CSS v4** for styling
- **d3** for the architecture graphs, **zustand** for the world's state

Visitors with reduced motion turned on, or without WebGL, get a static page instead of the 3D intro.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

`/?world=1` skips the intro and drops you straight onto the planet.

## Where things live

| What | File |
|---|---|
| Name, tagline, links, résumé | `src/data/timeline.js` (`identity`) |
| Bio, experience, skills, contact | `src/data/about.js` |
| The /projects page: order, covers, short copy | `src/data/showcase.js` |
| One project's card, stack and timeline | `src/data/projects/<id>.js` |
| One project's case study | `src/data/studies/<id>.js` and `src/components/ui/case/<id>/` |
| The world's layout (districts, stones) | `src/data/world.js` |
| Studio photos and beats | `src/data/studio.js` (titles) and `src/data/studioMedia.json` (generated) |

### Adding the résumé

Put the PDF at `public/resume.pdf` and set `resume: '/resume.pdf'` in `src/data/timeline.js`. The résumé buttons on /projects and in Comms show up once it's set; until then they stay hidden.

### Updating Studio media

The original photos and beats are kept out of git. To process new ones:

```bash
python3 scripts/process_studio_media.py <photos_dir> <beats_dir>
```

This resizes the photos, keeps the camera details, rounds each location to about 1 km, removes GPS data from the published files, and writes `src/data/studioMedia.json`.

## Credits

Galaxy model by Loïc Norgeot (CC BY 4.0).
