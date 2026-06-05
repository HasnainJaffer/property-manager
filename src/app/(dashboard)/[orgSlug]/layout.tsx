import { OrgDataProvider } from '@/lib/org-data-context'

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <OrgDataProvider>{children}</OrgDataProvider>
}
