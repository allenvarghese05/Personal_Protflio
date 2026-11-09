import { ImageResponse } from 'next/og';
import { identity } from '@/data/timeline';

// The card a link to the site unfurls into (LinkedIn, Slack, iMessage): the
// name, the credential, and the three things a recruiter should see first.
export const alt = 'Allen Shaji Varghese, software engineer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PROOF = ['Return offer from Overflow', 'A grant system in production across India', 'NASA Space Apps 2025 Global Nominee'];

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#07080c', color: '#f3eee4', padding: '72px 80px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#b8b2a6' }}>{identity.credential}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.95 }}>Allen Shaji</div>
          <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 0.95 }}>Varghese</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROOF.map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, color: i === 0 ? '#f3eee4' : '#b8b2a6' }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, background: i === 0 ? '#ff9a3c' : '#5e5a55' }} />
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
