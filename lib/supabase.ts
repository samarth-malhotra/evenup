// lib/supabase.ts
// polyfill MUST come before importing supabase
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// ⚠️ For dev only: replace with env/EAS secrets in production
const SUPABASE_URL = 'https://eefymaxfdcrfudjhtkfu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZnltYXhmZGNyZnVkamh0a2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTExNDQsImV4cCI6MjA3MjgyNzE0NH0.Y4lNHyX5sJ8cgT0XZKDQZ_m5JtJySJL3BJNdClzlpD4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
