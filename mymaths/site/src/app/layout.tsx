import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'mymaths — Graduate Mathematics Study Plan',
  description: 'A personal curriculum roadmap from NCEA Level 3 to graduate-level mathematics.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <header style={{ borderBottom: '1px solid #1e293b' }} className="px-6 py-4 flex items-center justify-between sticky top-0 z-50" suppressHydrationWarning>
          <div style={{ backgroundColor: 'var(--bg-primary)' }} className="absolute inset-0 -z-10" />
          <Link href="/" className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            mymaths
          </Link>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            NCEA L3 → Graduate
          </span>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
