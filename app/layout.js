import "./globals.css";
import ScrollToTopOnLoad from "./components/ScrollToTopOnLoad";

export const metadata = {
  title: "La Familia World Cup 26'",
  description: "Live scores and standings for the Sheth + Rawitscher World Cup draft pool",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ScrollToTopOnLoad />
        {children}
      </body>
    </html>
  );
}
