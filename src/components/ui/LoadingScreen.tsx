'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface LoadingScreenProps {
  message: string
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9000,
    }}>
      {/* Ambient blobs — same as auth pages */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, left: -160,
        width: 520, height: 520, borderRadius: '50%',
        background: 'radial-gradient(closest-side, #1e1b4b, transparent 70%)',
        filter: 'blur(80px)', opacity: 0.75, pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', bottom: -220, right: -180,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(closest-side, #0c4a6e, transparent 70%)',
        filter: 'blur(80px)', opacity: 0.75, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

        {/* Spinner ring around brand mark */}
        <div style={{ position: 'relative', width: 68, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Outer spinning arc */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '2px solid transparent',
              borderTopColor: 'var(--indigo)',
              borderRightColor: 'rgba(129,140,248,0.2)',
            }}
          />

          {/* Inner slower counter-arc for depth */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 6,
              borderRadius: '50%',
              border: '1.5px solid transparent',
              borderBottomColor: 'var(--cyan)',
              borderLeftColor: 'rgba(34,211,238,0.15)',
            }}
          />

          {/* Brand mark */}
          <div style={{
            width: 38, height: 38, borderRadius: 10, position: 'relative', flexShrink: 0,
            background: 'conic-gradient(from 140deg, var(--indigo), var(--cyan), var(--mint), var(--indigo))',
            boxShadow: '0 6px 24px var(--glow-i), inset 0 0 0 1px rgba(255,255,255,.15)',
          }}>
            <div style={{ position: 'absolute', inset: 7, borderRadius: 4, background: 'var(--bg)' }} />
          </div>
        </div>

        {/* Text block */}
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: 16, fontWeight: 600, color: 'var(--text)',
            marginBottom: 10, letterSpacing: '-0.01em',
          }}>
            PropFlow
          </p>

          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
