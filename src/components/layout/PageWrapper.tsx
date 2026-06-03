'use client'

import { motion, type Variants } from 'framer-motion'

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: 'easeOut' as const },
  },
}

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  )
}
