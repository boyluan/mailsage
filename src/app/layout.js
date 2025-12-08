import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
  title: "MailSage",
  description: "AI-powered Email",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}