import "./globals.css";

export const metadata = {
  title: "World Cup Draft",
  description: "Manual standings for an 8-person World Cup draft pool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
