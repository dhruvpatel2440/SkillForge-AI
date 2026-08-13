interface LoadingScreenProps {
  label?: string
  fullPage?: boolean
}

export default function LoadingScreen({ label = 'Loading', fullPage = true }: LoadingScreenProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
        height: fullPage ? '100vh' : '100%',
        minHeight: fullPage ? undefined : 320,
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 26,
          letterSpacing: '-0.01em',
          color: 'var(--color-text)',
          animation: 'sf-load-breathe 2.2s ease-in-out infinite',
        }}
      >
        SkillForge<span style={{ color: 'var(--color-accent)' }}> AI</span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              animation: `sf-load-dot 1.1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-neutral-600)',
        }}
      >
        {label}
      </div>

      <style>{`
        @keyframes sf-load-breathe {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes sf-load-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
