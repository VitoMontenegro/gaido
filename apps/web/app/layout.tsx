import type { Metadata } from 'next'
import { Roboto, Rubik } from 'next/font/google'
import './globals.css'

const rubik = Rubik({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-rubik',
})

const roboto = Roboto({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://gaido-ua.com'),
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk-UA" className={`${rubik.variable} ${roboto.variable} scroll-smooth`}>
      <body className="bg-page text-ink antialiased">{children}</body>
    </html>
  )
}
