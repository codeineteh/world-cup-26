import "./globals.css";

export const metadata = {
  title: "Sheth + Rawitscher World Cup 26'",
  description: "Live scores and standings for the Sheth + Rawitscher World Cup draft pool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
