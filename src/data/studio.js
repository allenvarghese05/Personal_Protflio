/**
 * The Studio — photography, film and sound.
 *
 *   photos — web versions of src/pictures (processed: rotation baked in,
 *            resized to 2400px + a 900px grid thumbnail, ALL metadata
 *            stripped — including GPS). Captions show the camera. Add a
 *            `title` to any photo to caption it.
 *   films  — embeds. YouTube: https://www.youtube.com/embed/<id>.
 *            Google Drive: https://drive.google.com/file/d/<id>/preview (the
 *            file must be shared "Anyone with the link").
 *   tracks — AAC versions of src/beats (~14 MB total instead of 137 MB).
 */
export const STUDIO = {
  intro: 'Away from the keyboard: photographs, short films and beats.',
  photos: [
    { src: '/studio/photos/01.jpg', thumb: '/studio/photos/01-sm.jpg', w: 1351, h: 2400, meta: "" },
    { src: '/studio/photos/02.jpg', thumb: '/studio/photos/02-sm.jpg', w: 1350, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/03.jpg', thumb: '/studio/photos/03-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/04.jpg', thumb: '/studio/photos/04-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/05.jpg', thumb: '/studio/photos/05-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/06.jpg', thumb: '/studio/photos/06-sm.jpg', w: 2400, h: 1600, meta: "Sony \u03b16400" },
    { src: '/studio/photos/07.jpg', thumb: '/studio/photos/07-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/08.jpg', thumb: '/studio/photos/08-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/09.jpg', thumb: '/studio/photos/09-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/10.jpg', thumb: '/studio/photos/10-sm.jpg', w: 1600, h: 2400, meta: "Sony \u03b16400" },
    { src: '/studio/photos/11.jpg', thumb: '/studio/photos/11-sm.jpg', w: 1352, h: 2400, meta: "Sony HX300" },
    { src: '/studio/photos/12.jpg', thumb: '/studio/photos/12-sm.jpg', w: 1351, h: 2400, meta: "" },
    { src: '/studio/photos/13.jpg', thumb: '/studio/photos/13-sm.jpg', w: 2400, h: 1351, meta: "" },
    { src: '/studio/photos/14.jpg', thumb: '/studio/photos/14-sm.jpg', w: 1118, h: 2400, meta: "" },
    { src: '/studio/photos/15.jpg', thumb: '/studio/photos/15-sm.jpg', w: 2400, h: 1800, meta: "" },
    { src: '/studio/photos/16.jpg', thumb: '/studio/photos/16-sm.jpg', w: 1351, h: 2400, meta: "" },
    { src: '/studio/photos/17.jpg', thumb: '/studio/photos/17-sm.jpg', w: 1600, h: 2400, meta: "Canon EOS 800D" },
    { src: '/studio/photos/18.jpg', thumb: '/studio/photos/18-sm.jpg', w: 1600, h: 2400, meta: "Canon EOS 800D" },
    { src: '/studio/photos/19.jpg', thumb: '/studio/photos/19-sm.jpg', w: 2400, h: 1600, meta: "Canon EOS 800D" },
    { src: '/studio/photos/20.jpg', thumb: '/studio/photos/20-sm.jpg', w: 1350, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/21.jpg', thumb: '/studio/photos/21-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/22.jpg', thumb: '/studio/photos/22-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/23.jpg', thumb: '/studio/photos/23-sm.jpg', w: 1670, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/24.jpg', thumb: '/studio/photos/24-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/25.jpg', thumb: '/studio/photos/25-sm.jpg', w: 2400, h: 1800, meta: "iPhone 6" },
    { src: '/studio/photos/26.jpg', thumb: '/studio/photos/26-sm.jpg', w: 2400, h: 1800, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/27.jpg', thumb: '/studio/photos/27-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/28.jpg', thumb: '/studio/photos/28-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/29.jpg', thumb: '/studio/photos/29-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/30.jpg', thumb: '/studio/photos/30-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/31.jpg', thumb: '/studio/photos/31-sm.jpg', w: 1800, h: 2400, meta: "iPhone 14" },
    { src: '/studio/photos/32.jpg', thumb: '/studio/photos/32-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/33.jpg', thumb: '/studio/photos/33-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/34.jpg', thumb: '/studio/photos/34-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/35.jpg', thumb: '/studio/photos/35-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/36.jpg', thumb: '/studio/photos/36-sm.jpg', w: 1887, h: 2400, meta: "iPhone 16 Pro" },
    { src: '/studio/photos/37.jpg', thumb: '/studio/photos/37-sm.jpg', w: 1800, h: 2400, meta: "iPhone 16 Pro" },
  ],
  films: [
    // TODO(allen): give each film its real title + your role on it
    { title: 'Film 01', embed: 'https://www.youtube.com/embed/RFSHbN9bihI', meta: 'YouTube · worked on' },
    { title: 'Film 02', embed: 'https://drive.google.com/file/d/1Ut1YaweNFZFMH5mKmb5dn2lmDaGH7LKk/preview', meta: 'Worked on' },
  ],
  tracks: [
    { src: '/studio/sound/01.m4a', title: 'Extravegate', meta: 'UK drill · 1:03' },
    { src: '/studio/sound/02.m4a', title: 'Rebel', meta: 'UK drill · 0:42' },
    { src: '/studio/sound/03.m4a', title: 'Revolution', meta: 'Drill · 1:23' },
    { src: '/studio/sound/04.m4a', title: 'Slither', meta: 'Guitar beat · Kid LAROI type · 2:10' },
    { src: '/studio/sound/05.m4a', title: 'Snow', meta: 'Guitar trap · 1:07' },
    { src: '/studio/sound/06.m4a', title: 'Wild Anthem', meta: 'UK drill · 1:29' },
    // TODO(allen): real title/genre for this one (the file was "trytry.mp3")
    { src: '/studio/sound/07.m4a', title: 'Trytry', meta: 'Beat · 2:35' },
  ],
};

// How many placeholder frames to show while a section is empty
export const PLACEHOLDER_COUNT = { photos: 9, films: 2, tracks: 4 };
