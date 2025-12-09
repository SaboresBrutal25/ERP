import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase: faltan VITE_SUPABASE_URL o VITE_SUPABASE_KEY. Añádelos en client/.env");
  throw new Error("Configuración de Supabase incompleta");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
