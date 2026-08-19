const { createClient } = require('@supabase/supabase-js');

let supabaseUrl = (process.env.SUPABASE_URL || 'https://bxnstmtmuwaowglxmjjk.supabase.co').trim();
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseUrl.startsWith("'") && supabaseUrl.endsWith("'")) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseUrl.endsWith("/")) supabaseUrl = supabaseUrl.slice(0, -1);

// Intentar usar la Service Role Key (llave maestra) primero. Si no está, usar la pública (fallback)
let supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim(); 
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) supabaseKey = supabaseKey.slice(1, -1);
if (supabaseKey.startsWith("'") && supabaseKey.endsWith("'")) supabaseKey = supabaseKey.slice(1, -1); 

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
