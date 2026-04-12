const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let supabaseAdmin = null;
let supabaseAnon = null;

function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required in .env');
    process.exit(1);
  }

  // Admin client — uses service_role key (bypasses RLS)
  // Falls back to anon key if service key not set yet
  supabaseAdmin = createClient(url, serviceKey || anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Anon client — for public frontend operations
  supabaseAnon = createClient(url, anonKey);

  console.log('✅ Supabase connected to:', url);
  return { supabaseAdmin, supabaseAnon };
}

const getDb = () => {
  if (!supabaseAdmin) initSupabase();
  return supabaseAdmin;
};

const getAnonDb = () => {
  if (!supabaseAnon) initSupabase();
  return supabaseAnon;
};

module.exports = { initSupabase, getDb, getAnonDb };
