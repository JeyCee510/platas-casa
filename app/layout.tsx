import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platas Casa',
  description: 'Registro de gastos familiares',
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
