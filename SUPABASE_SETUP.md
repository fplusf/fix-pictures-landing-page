# Supabase Google Authentication Setup Guide

This guide will help you set up Google OAuth authentication using Supabase for the fix.pictures app.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Google Cloud Platform account

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in your project details:
   - Name: fix-pictures-app (or your preferred name)
   - Database Password: Generate a secure password
   - Region: Choose the closest region to your users
4. Click "Create new project" and wait for it to initialize

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

3. Update your `.env` file with these values:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Set Up Google OAuth Provider

### A. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** > **Credentials**
4. Click **"Create Credentials"** > **"OAuth client ID"**
5. If prompted, configure the OAuth consent screen:
   - User Type: External
   - App name: fix.pictures
   - User support email: your email
   - Developer contact: your email
6. For Application type, select **"Web application"**
7. Add Authorized redirect URIs:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
   Replace `your-project-id` with your actual Supabase project ID (from Step 2)

8. Click **"Create"**
9. Copy the **Client ID** and **Client Secret**

### B. Configure Google Provider in Supabase

1. In your Supabase dashboard, go to **Authentication** > **Providers**
2. Find **Google** in the list and click on it
3. Enable the Google provider by toggling it on
4. Enter your Google OAuth credentials:
   - **Client ID**: Paste the Client ID from Google
   - **Client Secret**: Paste the Client Secret from Google
5. Click **"Save"**

## Step 4: Configure Redirect URLs

1. In Supabase, go to **Authentication** > **URL Configuration**
2. Add your site URL(s):
   - For development: `http://localhost:5173` (or your local dev port)
   - For production: `https://yourdomain.com`
3. Add redirect URLs:
   - `http://localhost:5173/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

## Step 5: Test the Authentication Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:5173`
3. Click on "Start Fixing Images" or any CTA button
4. You should be redirected to Google's OAuth consent screen
5. After authorizing, you should be redirected back to `/app`

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `https://your-project-id.supabase.co/auth/v1/callback`

### Error: "Invalid redirect URL"
- Check that you've added the callback URL in Supabase's URL Configuration
- Ensure the URL matches exactly (including protocol: http/https)

### Environment Variables Not Loading
- Make sure your `.env` file is in the root directory
- Restart your development server after changing `.env`
- Verify variable names start with `VITE_` (required for Vite)

## Security Notes

- Never commit your `.env` file to version control
- The `.env.example` file is provided as a template
- Keep your Supabase anon key and Google client secret secure
- Use environment-specific URLs for development and production

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
