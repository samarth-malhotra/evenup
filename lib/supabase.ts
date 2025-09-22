// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// ⚠️ Using the Supabase project values you provided (do NOT commit these to a public repo)
const SUPABASE_URL = 'https://wrnepxzmmuzcsmjmadli.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybmVweHptbXV6Y3Ntam1hZGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjE0NTYsImV4cCI6MjA3NDAzNzQ1Nn0.NcrD3dr1bxmHzH81ThzGbXxlAnS5qBIAod618CvSSvs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
