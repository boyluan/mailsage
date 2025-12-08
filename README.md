# MailSage 📨 ✨

MailSage is an intelligent email interface built with Next.js that connects directly to your Gmail. It uses OpenAI to summarize threads, extract action items, and allow you to "chat" with your inbox contextually.

![Project Preview](https://via.placeholder.com/800x400?text=MailSage+Interface)

## 🚀 Features

* **Real Gmail Integration**: Securely fetches live emails via the Gmail API (ReadOnly scope).
* **AI Summaries**: Instantly summarizes long email threads and highlights **Action Items** in green.
* **Contextual Chat**: Ask questions like *"What did Sarah say about the design?"* and get answers based on your current inbox view.
* **Smart Search**: Instant, keyboard-driven search filtering.
* **Pinning System**: Pin important emails for quick access (persists across sessions).
* **Keyboard Shortcuts**: Navigate your inbox without touching the mouse.
* **Dark Mode**: Built-in dark/light mode toggle with smooth transitions.

## 🛠️ Tech Stack

* **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Auth**: [NextAuth.js](https://next-auth.js.org/) (Google Provider)
* **AI**: [OpenAI API](https://openai.com/) (`gpt-4o`)
* **Animations**: [Framer Motion](https://www.framer.com/motion/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Fonts**: [Google Fonts](https://fonts.google.com/) (Jua)

---

## ⚙️ Environment Variables

To run this project, you need to create a `.env` (or `.env.local`) file in the root directory with the following keys:

```bash
# Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OpenAI Platform -> API Keys
OPENAI_API_KEY=sk-your_openai_key

# NextAuth Configuration
# Generate a random string: `openssl rand -base64 32` in terminal
NEXTAUTH_SECRET=random_secure_string

# URL Configuration
# Local: http://localhost:3000
# Production: [https://your-project.vercel.app](https://your-project.vercel.app)
NEXTAUTH_URL=http://localhost:3000
````

-----

## 🔑 Setup Guide (Crucial Steps)

### 1\. Google Cloud Console

To allow users to log in via Gmail, you must configure a Google Cloud Project.

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a **New Project**.
3.  **Enable Gmail API**:
      * Go to "APIs & Services" \> "Library".
      * Search for "Gmail API" and enable it.
4.  **Configure OAuth Consent Screen**:
      * Select **External**.
      * Add Scopes: `.../auth/gmail.readonly`, `openid`, `email`, `profile`.
      * **Test Users**: Add your own email address (required while in "Testing" mode).
5.  **Create Credentials**:
      * Go to "Credentials" \> "Create Credentials" \> "OAuth Client ID".
      * Type: **Web Application**.
      * **Authorized Javascript Origins**:
          * `http://localhost:3000`
          * `https://your-production-app.vercel.app` (Add after deploying).
      * **Authorized Redirect URIs**:
          * `http://localhost:3000/api/auth/callback/google`
          * `https://your-production-app.vercel.app/api/auth/callback/google` (Add after deploying).

### 2\. Local Installation

```bash
# 1. Clone the repository
git clone [https://github.com/yourusername/mailsage.git](https://github.com/yourusername/mailsage.git)

# 2. Install dependencies
npm install

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) in your browser.

-----

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Open/Close AI Chat Assistant |
| `/` (Forward Slash) | Focus Search Bar |
| `Esc` | Close Chat / Close Email / Clear Search |
| `↑` / `↓` | Navigate Email List |
| `Enter` | Open Selected Email |

-----

## 🚀 Deployment (Vercel)

1.  Push your code to **GitHub**.
2.  Go to **Vercel** and "Add New Project".
3.  Import your `mailsage` repository.
4.  **IMPORTANT**: Copy all your `.env` variables into the Vercel **Environment Variables** section.
5.  Click **Deploy**.

**Post-Deployment Checklist:**

1.  Copy your new Vercel domain (e.g., `https://mailsage.vercel.app`).
2.  Go back to **Google Cloud Console**.
3.  Update **Authorized Redirect URIs** to include your new production URL.
4.  Update the `NEXTAUTH_URL` variable in Vercel settings if needed.

## 🛡️ Security Note

  * **Never commit your `.env` file.** It is included in `.gitignore` by default to protect your API keys.
  * If you accidentally push a key, revoke it immediately in the Google/OpenAI dashboard.

<!-- end list -->

```
```

# Next.js (Default Setup)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
