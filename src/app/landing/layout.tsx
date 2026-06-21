import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './landing.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'LetroFlow — Property management done properly',
  description: 'Compliance alerts, rent tracking, maintenance kanban, and multi-property oversight — built for UK buy-to-let landlords and property managers.',
  keywords: ['property management', 'UK landlord', 'buy-to-let', 'compliance', 'rent tracking', 'HMO'],
  openGraph: {
    title: 'LetroFlow — Property management done properly',
    description: 'The dark, fast platform built for UK buy-to-let. Compliance alerts, rent ledger, maintenance kanban — all in one place.',
    type: 'website',
    url: 'https://letroflow.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LetroFlow — Property management done properly',
    description: 'Built for UK landlords. Compliance, rent, maintenance — one platform.',
  },
  icons: {
    icon: [
      { url: '/logo/letroflow-mark.svg', type: 'image/svg+xml' },
      { url: '/logo/png/letroflow-mark-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/png/letroflow-mark-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/logo/png/letroflow-mark-180.png',
  },
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={jakarta.className}
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
      }}
    >
      {children}
    </div>
  )
}
