import type { Metadata, Viewport } from 'next'
import './globals.css'
import SwRegister from './components/sw-register'

export const metadata: Metadata = {
  title: 'Foodmad',
  description: 'The street food discovery platform India never had.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Foodmad',
  },
}

export const viewport: Viewport = {
  themeColor: '#F9F9F9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  )
}
