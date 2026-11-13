/* L'Âme de Honaine — configuration Supabase.
   Clé publishable = publique ; sécurité assurée par RLS (schéma « amehonaine »).
   Le schéma n'est pas encore dans la liste Exposed schemas : lecture / écriture
   via les vues et RPC publics (amehonaine_site_content, amehonaine_is_admin). */
window.AME_CONFIG = {
  SUPABASE_URL: 'https://rvreusugrtiubqtafgbk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_rTrEZB4mivU7kr9IwabvBQ_Q31CFt_1',
  SCHEMA: 'amehonaine',
  CONTENT_TABLE: 'amehonaine_site_content',
  HISTORY_TABLE: 'amehonaine_site_content_history',
  IS_ADMIN_RPC: 'amehonaine_is_admin'
};
