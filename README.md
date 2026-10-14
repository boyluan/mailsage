# MailSage 📨 ✨

MailSage is a private, invite-only Gmail companion built with Next.js. It uses OpenAI to summarise individual email messages, identify potential action items and key links, and provide an AI-powered assistant for exploring inbox metadata.


### Live Application (Invite-only): [https://mailsage-desktop.vercel.app](https://mailsage-desktop.vercel.app)


> **Project Status:** MailSage is an independently developed, limited-access internal tool currently used by its creator and a small group of invited users. It is not a publicly-released email service. Access is managed through Google OAuth test-user approval, and Gmail permissions are read-only.


## 🚀 Features

* **Real Gmail Integration**: Securely fetches live emails via the Gmail API (ReadOnly scope).
* **AI Message Summaries**: Generates summaries of individual email messages, highlighting potential action items and key links. Summaries are based on the extracted content of the selected message, rather than automatically retrieving and combining every message in a conversation thread.
* **AI Inbox Assistant**: Ask questions about senders, subjects and dates within the currently loaded inbox. The assistant can help identify and pin matching emails, but does not analyse the contents of email bodies.
* **Smart Search**: Instant, keyboard-driven search filtering.
* **Pinning System**: Pin important emails for quick access during the current application session.
* **Keyboard Shortcuts**: Navigate your inbox without touching the mouse.
* **Appearance Toggle**: Switches the appearance of selected interface controls, while the main application retains its dark-themed design.
* **Temporary View Actions**: Hide emails from the current MailSage view using the Delete or Archive icons. These actions do not modify, delete or archive messages in Gmail. Hidden emails may reappear when the application is reloaded.
* **Inbox Retrieval**: Loads up to 50 messages from the user's Gmail Inbox. Search and date-range filters operate on this retrieved set rather than the user's entire mailbox.

## 🛠️ Tech Stack

* **Framework**: [Next.js 16.0.7](https://nextjs.org/) (App Router)
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


# URL Configuration (Local Development)
NEXTAUTH_URL=http://localhost:3000
```

**Production deployment:** When deploying your own instance to Vercel, configure `NEXTAUTH_URL` in your Vercel project's environment variables using your actual deployment domain (for example, `https://your-app.vercel.app`).

Keep `NEXTAUTH_URL=http://localhost:3000` in your local `.env.local` file when running the application on your computer.


-----

## 🔑 Setup Guide (Crucial Steps)


### 1. Google Cloud Console (OAuth Setup)

MailSage uses Google OAuth 2.0 for authentication and the Gmail API to retrieve emails.

To configure authentication for your own instance:

1. Visit [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services → Library** and enable the **Gmail API**.
4. Configure the Google OAuth consent screen.
   - Select **External** if users will authenticate with personal Google accounts.
   - Keep the application in **Testing** mode if it is intended for a limited group of users.
   - Add the Google email addresses of your intended users under **Test users**.
   - Request the `https://www.googleapis.com/auth/gmail.readonly` scope.
5. Navigate to **Clients** (or **Credentials**, depending on the Google Cloud interface).
6. Create an **OAuth 2.0 Client ID** and select **Web application**.

#### Authorised JavaScript origins

For local development:

```text
http://localhost:3000
```

For a deployed instance (if a JavaScript origin is required):

```text
https://your-app.vercel.app
```

#### Authorised redirect URIs

For local development:

```text
http://localhost:3000/api/auth/callback/google
```

For a deployed instance:

```text
https://your-app.vercel.app/api/auth/callback/google
```

**Important:** Replace `your-app.vercel.app` with the domain assigned to your own deployment. If you use a custom domain, use that instead.

The redirect URI must match the callback URL configured for your application.

For MailSage's server-side NextAuth authentication flow, the authorised redirect URI is required. Authorised JavaScript origins may be unnecessary unless you also use browser-side Google OAuth functionality.


#### Testing access

If your Google OAuth application remains in Testing mode, only Google accounts added to the application's test-user list can authorise access.

Approved testers may see Google's **"Google hasn't verified this app"** warning during authentication. This is expected for an unverified application in Testing mode.

MailSage requests read-only Gmail access and does not require permission to send, delete or modify emails.


### 2\. Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/boyluan/mailsage.git

# 2. Enter the project directory
cd mailsage

# 3. Install dependencies
npm install

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

-----

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd + K` / `Ctrl + K` | Open/Close AI Chat Assistant |
| `/` (Forward Slash) | Focus Search Bar |
| `Esc` | Close open views or overlays; unfocus the search field without clearing the entered text |
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

## Current Limitations

MailSage is a limited-access application developed as an internal tool and currently used by its creator and a small group of invited users.

- **Inbox retrieval:** The application retrieves up to 50 messages from Gmail's Inbox per request. Pagination is not currently implemented.
- **Search and date filters:** Results are limited to messages already retrieved by the application.
- **AI summaries:** Summaries are generated from individual email messages, not independently reconstructed conversation threads. The extracted text is limited to 6,000 characters per summary request.
- **AI assistant:** The assistant uses sender, subject and date metadata from currently loaded messages. It does not analyse full email bodies.
- **Pinning:** Pinned-message state is maintained during the current application session and is not permanently stored.
- **Delete and Archive controls:** These temporarily hide messages from the application view. They do not modify messages in Gmail.
- **Appearance:** The appearance toggle changes selected interface controls rather than providing a complete light theme.

## 🛡️ Security Note

  * **Never commit your `.env` file.** It is included in `.gitignore` by default to protect your API keys.
  * If you accidentally push a key, revoke it immediately in the Google/OpenAI dashboard.
