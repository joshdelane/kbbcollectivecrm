import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KBB Collective CRM',
  description: 'Project and lead management for the kitchen industry',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
