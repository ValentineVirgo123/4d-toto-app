/**
 * Mascot — "Fú" the Lucky Lion Cub  (web version)
 *
 * CSS-keyframe animations — zero extra dependencies.
 * Five states:
 *   idle        → gentle float   (default)
 *   celebrating → bounce + glow  (win reveal)
 *   thinking    → pulse          (OCR / loading)
 *   sleeping    → slow breathe   (empty state)
 *   sad         → droop          (error / loss)
 *
 * To swap to Lottie:
 *   1. npm install @lottiefiles/dotlottie-react
 *   2. Drop .lottie files in public/animations/
 *   3. Replace <div> below with <DotLottieReact src={ANIM[state]} />
 */

const EMOJI = {
  idle:        '🦁',
  celebrating: '🦁',
  thinking:    '🦁',
  sleeping:    '😴',
  sad:         '🥺',
};

const BG = {
  idle:        'rgba(36,72,141,0.12)',
  celebrating: 'rgba(251,198,60,0.14)',
  thinking:    'rgba(251,198,60,0.10)',
  sleeping:    '#021e38',
  sad:         '#010e1f',
};

const BORDER = {
  idle:        '#24488D',
  celebrating: '#4a8fff',
  thinking:    '#4a8fff',
  sleeping:    '#163360',
  sad:         'rgba(36,72,141,0.3)',
};

const ANIMATION = {
  idle:        'mascot-float 2.4s ease-in-out infinite',
  celebrating: 'mascot-bounce 0.55s ease-in-out infinite',
  thinking:    'mascot-pulse 1.7s ease-in-out infinite',
  sleeping:    'mascot-breathe 5s ease-in-out infinite',
  sad:         'mascot-droop 0.4s ease-out forwards',
};

export function Mascot({ state = 'idle', size = 100 }) {
  const radius = Math.round(size * 0.28);

  return (
    <>
      <style>{`
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-9px); }
        }
        @keyframes mascot-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          40%       { transform: translateY(-18px) scale(1.16); }
          70%       { transform: translateY(2px)   scale(0.96); }
        }
        @keyframes mascot-pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        @keyframes mascot-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.04); }
        }
        @keyframes mascot-droop {
          from { transform: translateY(0)  scale(1); }
          to   { transform: translateY(5px) scale(0.88); }
        }
      `}</style>

      <div style={{
        width:           size,
        height:          size,
        borderRadius:    radius,
        backgroundColor: BG[state],
        border:          `2px solid ${BORDER[state]}`,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        fontSize:        Math.round(size * 0.5),
        animation:       ANIMATION[state],
        boxShadow:       '0 4px 14px rgba(0,0,0,0.35)',
        position:        'relative',
        userSelect:      'none',
        flexShrink:      0,
      }}>
        {EMOJI[state]}
        {state === 'sleeping' && (
          <span style={{ position: 'absolute', top: -6, right: -6, fontSize: Math.round(size * 0.22) }}>💤</span>
        )}
        {state === 'celebrating' && (
          <span style={{ position: 'absolute', top: -8, right: -8, fontSize: Math.round(size * 0.24) }}>✨</span>
        )}
      </div>
    </>
  );
}
