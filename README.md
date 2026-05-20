# MTG Testing Annotator

A private-link review tool for Magic: The Gathering teams to annotate gameplay videos and compare decisions.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Optional: create `.env.local` from `.env.example` and fill in Supabase values.

3. Optional: apply `supabase/migrations/0001_initial_schema.sql` to the Supabase project.

4. Start the app:

   ```bash
   npm run dev
   ```

If Supabase variables are missing, the app uses local development storage at `.data/dev-db.json`; production deployments require Supabase environment variables.

## MVP behavior

- Session creators become the presenter for that session.
- Reviewers join with email only.
- Video is embedded from YouTube.
- Decklists are stored and shown as plain text.
- Annotation play details lock when the reviewer commits and continues.
- The reviewer records the same, different, or unclear verdict at the next pause.
- Presenter mode groups choices anonymously by default and can reveal emails.
