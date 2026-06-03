export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient blob — top left */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, left: -160,
        width: 560, height: 560, borderRadius: '50%',
        background: 'radial-gradient(closest-side, #1e1b4b, transparent 70%)',
        filter: 'blur(80px)', opacity: 0.9,
        pointerEvents: 'none',
      }} />
      {/* Ambient blob — bottom right */}
      <div aria-hidden style={{
        position: 'absolute', bottom: -220, right: -180,
        width: 640, height: 640, borderRadius: '50%',
        background: 'radial-gradient(closest-side, #0c4a6e, transparent 70%)',
        filter: 'blur(80px)', opacity: 0.9,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        {children}
      </div>
    </div>
  )
}
