# Readify Extension - Supabase & Stripe Setup Guide

This guide will help you configure Supabase authentication, database, and Stripe payments for the Readify extension.

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- A [Stripe](https://stripe.com) account (test mode for development)
- Node.js installed locally

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project credentials:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **Anon Key**: Found in Settings > API > Project API keys

## Step 2: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Copy and paste the entire contents into the SQL Editor
4. Click **Run** to execute the SQL and create all tables

This will create:
- `user_profiles` - User account info and subscription status
- `user_sites` - Saved websites and changes for premium users
- `subscriptions` - Subscription details
- `payment_history` - Payment records
- All necessary RLS policies and triggers

## Step 3: Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email templates if desired (optional)
4. In **Authentication** > **URL Configuration**, set:
   - Site URL: `chrome-extension://YOUR_EXTENSION_ID`

## Step 4: Set Up Stripe

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your API keys from **Developers** > **API keys**:
   - **Publishable key**: `pk_test_...` (safe to include in extension)
   - **Secret key**: `sk_test_...` (ONLY for Edge Functions)

3. Create a subscription product:
   - Go to **Products** > **Add Product**
   - Name: "Readify Premium"
   - Add a recurring price (e.g., $4.99/month)
   - Note the **Price ID**: `price_...`

## Step 5: Deploy Supabase Edge Functions

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd path/to/readify
   supabase link --project-ref YOUR_PROJECT_ID
   ```

4. Set up Edge Function secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
   ```

5. Deploy the Edge Functions:
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   supabase functions deploy stripe-webhook
   ```

## Step 6: Configure Stripe Webhooks

1. In Stripe dashboard, go to **Developers** > **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (`whsec_...`) and add it to Supabase secrets

## Step 7: Configure the Extension

1. Open `config.js` and update with your credentials:

```javascript
const READIFY_CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    
    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY',
    STRIPE_PRICE_ID: 'price_YOUR_PRICE_ID',
    
    // Subscription price display
    SUBSCRIPTION_PRICE: '$4.99/month',
    
    // Feature limits
    FREE_WEBSITE_LIMIT: 5,
    PREMIUM_WEBSITE_LIMIT: Infinity
};
```

## Step 8: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the Readify folder
4. Note your extension ID from the extensions page

## Step 9: Update Supabase Site URL

1. Go to Supabase **Authentication** > **URL Configuration**
2. Add your extension URL to **Redirect URLs**:
   - `chrome-extension://YOUR_EXTENSION_ID/sidepanel.html`

## Testing

### Test Free User Flow
1. Don't sign in
2. Enable Study Mode
3. Save highlights/notes on 5 websites
4. Try to save on a 6th website - should show upgrade prompt

### Test Sign Up
1. Click the account button in sidepanel
2. Create a new account
3. Check your email for verification (if enabled)

### Test Premium Subscription
1. Sign in
2. Click "Upgrade to Premium"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Should now have unlimited sites and AI features

### Test Payment Failure
1. In Stripe, cancel the subscription
2. Refresh the extension
3. Premium features should be disabled

## Troubleshooting

### "Authentication service not available"
- Make sure `lib/supabase.min.js` exists
- Check that `config.js` has correct credentials
- Check browser console for errors

### Edge Functions not working
- Run `supabase functions list` to verify deployment
- Check function logs: `supabase functions logs create-checkout-session`
- Verify secrets are set: `supabase secrets list`

### Webhooks not updating subscription
- Check Stripe webhook logs in dashboard
- Verify the webhook secret is correct
- Check Supabase function logs

## Production Checklist

- [ ] Replace test Stripe keys with live keys
- [ ] Update Supabase URL Configuration for production
- [ ] Test all payment flows with real cards
- [ ] Set up error monitoring
- [ ] Configure email templates in Supabase
- [ ] Review RLS policies for security



