import { supabase } from "./lib/supabaseClient";

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message || "Credenciales inválidas");
  return data;
};

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message || "Error al cerrar sesión");
};

const handle = (result) => {
  if (result.error) throw new Error(result.error.message || "Error en Supabase");
  return result.data;
};

export const moduleApi = (table) => ({
  list: async (locale) =>
    handle(
      await supabase
        .from(table)
        .select("*")
        .eq("locale", locale)
        .order("created_at", { ascending: false })
    ),
  create: async (data, locale) =>
    handle(
      await supabase
        .from(table)
        .insert({ ...data, locale })
        .select()
        .single()
    ),
  update: async (id, data) => handle(await supabase.from(table).update(data).eq("id", id).select().single()),
  remove: async (id) => handle(await supabase.from(table).delete().eq("id", id))
});
