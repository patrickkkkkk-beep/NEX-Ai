NEX AI - Render deployment
1. Replace index.html and server.js in your GitHub repository with these versions.
2. In Render choose New + > Web Service and connect this repository.
3. Runtime: Node. Build Command: leave blank. Start Command: node server.js
4. In Render Environment add:
   GROQ_API_KEY = your Groq API key
5. Deploy. The app uses Render's PORT and binds to 0.0.0.0.
Do not put the API key in HTML or GitHub. Default model is openai/gpt-oss-120b; confirm model availability in your Groq account.
