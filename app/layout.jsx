export const metadata = {
  title: 'Glowgift - Sheet Viewer',
  description: 'View data from Google Sheet',
}

import FirebaseInit from './FirebaseInit'

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
        <FirebaseInit />
        {children}
      </body>
    </html>
  )
}
