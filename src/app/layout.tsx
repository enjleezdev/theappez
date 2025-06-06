
import type {Metadata} from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './print.css'; // Import print styles
import { Toaster } from "@/components/ui/toaster";
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'; // Import the registrar

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EZ Inventory - Inventory Management',
  description: 'Efficiently manage your warehouse inventory with EZ Inventory.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ServiceWorkerRegistrar /> {/* Add the registrar here */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
