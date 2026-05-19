import type { Metadata, Viewport } from 'next';
import './globals.css';

// Favicon SVG inline neobrutalista: 💰 con borde tipo cartel.
const FAVICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='6' y='6' width='52' height='52' rx='10' fill='%23A8E6CF' stroke='%230A0A0A' stroke-width='4'/><text x='50%25' y='54%25' font-size='38' text-anchor='middle' dominant-baseline='middle'>💰</text></svg>`;

export const metadata: Metadata = {
  title: 'Platas Casa · Gastos en familia',
  description: 'Registro de gastos familiares — Juan y Ana',
  icons: {
    icon: [{ url: FAVICON, type: 'image/svg+xml' }],
    apple: [{ url: FAVICON }],
  },
  applicationName: 'Platas Casa',
  appleWebApp: { capable: true, title: 'Platas Casa', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#A8E6CF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
