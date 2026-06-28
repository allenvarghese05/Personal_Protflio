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
    // Proximity sphere ~4–5× the building cluster: the prompt appears when the
    // astronaut crosses enterRadius, and movement halts at stopRadius (the edge
    // of the zone) so you never walk through the buildings.
    enterRadius: 12,
    stopRadius: 9,
    feature: 'iet', // signature module opened on entry
  },
];

export const zoneById = (id) => zones.find((z) => z.id === id);
