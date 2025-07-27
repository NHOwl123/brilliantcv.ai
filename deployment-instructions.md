# Easy Vercel Deployment Instructions

## Method 1: Direct Upload (Easiest)

1. **Download this project as ZIP:**
   - Right-click on the file browser in Replit
   - Select "Download as ZIP" 
   - Save to your computer

2. **Go to Vercel Dashboard:**
   - Visit vercel.com
   - Click "Add New..." → "Project"
   - Click "Browse All Templates" 
   - Look for "Import from ZIP" or drag the ZIP file

3. **Configuration:**
   - Project name: `brilliantcv`
   - Keep all build settings as default

4. **Add Environment Variables:**
   ```
   DATABASE_URL=postgresql://your_db_url
   OPENAI_API_KEY=sk-your_openai_key
   SESSION_SECRET=your_session_secret
   STRIPE_SECRET_KEY=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
   STRIPE_STANDARD_PRICE_ID=price_1Rosb2FVYDwMuD9AgjU8s5mJ
   STRIPE_PREMIUM_PRICE_ID=price_1Rosd3FVYDwMuD9AAxy903gP
   VITE_STRIPE_PUBLIC_KEY=pk_live_51RLOydFVYDwMuD9AdATnCEJD2NMMh1SvNRhU16HgY4dE9QaBgXPA1xNwEyLa4e90O2rbNZbqbOdul4iKBdUyb35G00E2uBem5J
   REPLIT_AUTH_CLIENT_ID=temp_id
   REPLIT_AUTH_CLIENT_SECRET=temp_secret
   ```

5. **Deploy and assign domain brilliantcv.ai**

## Method 2: Manual File Copy

If ZIP doesn't work:
1. Create new project on Vercel from scratch
2. Copy each file manually
3. Configure environment variables
4. Deploy

Your app is 100% ready - just need to get it uploaded!