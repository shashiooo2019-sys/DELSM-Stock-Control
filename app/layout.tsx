import type {Metadata} from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Delhi Station Inventory & Reordering System',
  description: 'Multi-tier packaging stock tracker, barcode scanning, multi-location lookup, and smart reorder dashboard for Delhi Station.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="font-sans antialiased text-slate-800 bg-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
