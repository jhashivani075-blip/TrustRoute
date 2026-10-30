import './globals.css';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'TrustRoute - AI Disaster Information Verification & Community Safety',
  description: 'AI-assisted disaster information verification, duplicate clustering, and human-in-the-loop review priority platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
