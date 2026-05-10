import type { Metadata } from 'next'
import Link from 'next/link'
import { EB_Garamond, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-var',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'mymaths — Graduate Mathematics Study Plan',
  description: 'A personal curriculum roadmap from NCEA Level 3 to graduate-level mathematics.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header
          className="px-6 py-3 flex items-center justify-between sticky top-0 z-50"
          style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
        >
          <Link
            href="/"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}
          >
            mymaths
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.05em' }}>
            NCEA L3 → Graduate
          </span>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
