/**
 * Surface zones for "Allen's World" (Act 4). Each is a physical district the
 * astronaut walks up to. `feature` points at the timeline memory opened when
 * the visitor enters (reuses the existing MemoryCard). More zones land here as
 * they're built (Mission Log, Observatory, Comms, Hall of Flags).
 */
export const zones = [
  {
    id: 'engineering',
    label: 'ENGINEERING DISTRICT',
    blurb: 'Work experience · the things I’ve shipped',
    position: [10, 0, -2],
    color: '#ff8a3d',
    accent: '#ffd27a',
    // Invisible trigger sphere: the astronaut halts and the ENTER prompt /
    // camera pivot fire when it crosses enterRadius. The floating name label is
    // visible from much further out (labelRadius).
    enterRadius: 5,
    stopRadius: 4.5,
    labelRadius: 30,
    feature: 'iet', // signature module opened on entry
  },
];

export const zoneById = (id) => zones.find((z) => z.id === id);
