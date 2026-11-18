NEX AI - Groq-only update

Features:
- Groq chat only. No Gemini, image generation, or video generation integration.
- Responsive redesigned Persian RTL interface.
- Top-right hamburger menu with chat history, settings, export, and import.
- Persistent conversation history in the current browser using localStorage.
- Automatic saving of user and assistant messages, conversation titles, model, and timestamps.
- Search, reopen, rename, and delete individual conversations.
- Export all conversations to JSON and import a previous JSON backup.
- Appearance settings: dark/light mode, accent color, text size, compact chat layout.

Render deployment:
1. Replace index.html, server.js, and README.txt in the GitHub repository.
2. Keep Runtime: Node.
3. Build Command: leave blank.
4. Start Command: node server.js
5. Keep only GROQ_API_KEY in Render Environment (GEMINI_API_KEY is not used; it can be removed).
6. Deploy.

Important history note:
Conversation history is stored persistently in the browser/device that is used. It survives page reloads and reopening the site, but it is not cloud-synced between different devices or browsers. Use the Export/Import options in the menu to transfer or back up conversations. For account-based cross-device sync, a database and user authentication would be required.

No npm packages are required. Node.js 18+ is recommended.
