'use client'

import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'

export default function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Organisation and account settings" action={{ label: 'Save Changes' }}>
      <PageWrapper>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-1">Settings</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">This page is coming soon.</p>
          </div>
        </div>
      </PageWrapper>
    </AppShell>
  )
}
