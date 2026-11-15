MedLog — Backend Architecture (Supabase)

This folder contains the PostgreSQL database schema, migrations, and security configuration powering **MedLog**.


Backend Stack
Database: PostgreSQL (managed via Supabase)
Authentication: Supabase Auth (Email/Password & JWT session management)
Data Security: PostgreSQL Row Level Security (RLS) policies ensuring users can only read and modify their own medical records (`auth.uid() = user_id`)

Setup
To replicate this backend locally or in a new Supabase project:
1. Create a new project in [Supabase](https://supabase.com).
2. Run the SQL files in this directory inside the Supabase SQL Editor to create the tables and RLS policies.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the root `.env` file (change `.env_example` to '.env').
