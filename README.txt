NEX AI - package for Render

Included:
- server.js
- index.html

Render:
- Runtime: Node
- Build Command: leave empty
- Start Command: node server.js

Environment variables (Render > Environment):
- GROQ_API_KEY = your existing Groq key
- GEMINI_API_KEY = your Google AI Studio key

Do not paste API keys into source files, GitHub, screenshots, or chat.

Features:
- Groq text chat
- Gemini chat with up to 3 attached images
- Nano Banana 2.1 image generation
- Veo 3.1 video generation with operation polling
- Local conversation history
- Browser speech input/output where supported
- Code blocks with copy, download, and HTML preview

IMPORTANT:
1. This package contains a rebuilt NEX AI interface and server. The original uploaded source files were not readable by the file system in this run, so this package cannot guarantee pixel-for-pixel preservation of the old interface or every old feature.
2. Google documents Nano Banana 2.1 as model `gemini-nano-banana-2.1` and Veo 3.1 video generation as `veo-3.1-generate-preview`. Video generation is asynchronous and this server polls for the result.
3. The video endpoint returns the finished MP4 through the server; large videos may exceed Render request or response limits.
4. API access, model availability, quotas, and charges depend on the Google account and region. Do not assume image/video generation is free.
5. This implementation uses Veo 3.1 for video because its REST long-running operation is documented. It does not claim Gemini Omni Flash is wired into this build.
6. Replace server.js and index.html in the connected GitHub repository, commit, and let Render deploy. Keep the existing environment variables.
