/**
 * The Studio — photography, film and sound. Until real media is added, each
 * section shows designed placeholder frames (so the room reads as intentional,
 * not empty). To add your work:
 *
 *   Photos — put images in /public/studio/photos/ and list them:
 *            { src: '/studio/photos/01.jpg', title: 'Schuylkill at dusk', meta: 'Philadelphia · 2025' }
 *   Films  — YouTube or Vimeo embed URLs:
 *            { title: 'Tree', embed: 'https://www.youtube.com/embed/<id>', meta: 'Edit · 2025' }
 *   Tracks — put audio in /public/studio/sound/ and list them:
 *            { src: '/studio/sound/track.mp3', title: 'Some Trail', meta: '130 BPM · D major' }
 */
export const STUDIO = {
  intro: 'Away from the keyboard: photographs, short films and beats.',
  photos: [],
  films: [],
  tracks: [],
};

// How many placeholder frames to show while a section is empty
export const PLACEHOLDER_COUNT = { photos: 9, films: 2, tracks: 4 };
