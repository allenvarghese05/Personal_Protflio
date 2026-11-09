import { ImageResponse } from 'next/og';
import { ENGINEERING_PROJECTS, projectById } from '@/data/projects';
import { LAYOUT, SHOWCASE } from '@/data/showcase';

// The card a link to /projects unfurls into (LinkedIn, Slack, iMessage).
export const alt = 'Allen Shaji Varghese: Projects';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  // four pills fit the 1040px row; six ran off the card
  const featured = LAYOUT.featured.slice(0, 4).map((id) => ({ id, label: projectById(id).label, show: SHOWCASE[id] }));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#07080c', color: '#f3eee4', padding: '72px 80px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: '#f3eee4', color: '#07080c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>AV</div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>Allen Shaji Varghese</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.9 }}>Projects</div>
          <div style={{ fontSize: 32, color: '#b8b2a6' }}>{`${ENGINEERING_PROJECTS.length} projects, each with a full case study.`}</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {featured.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: f.show.ground, borderRadius: 999, padding: '14px 24px', fontSize: 24, color: '#ffffff' }}>
              {f.id === 'aircast' && <div style={{ width: 10, height: 10, borderRadius: 5, background: '#ff9a3c' }} />}
              {f.id === 'iet' ? 'Church Building System' : f.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
