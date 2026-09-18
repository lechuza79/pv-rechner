// The waitlist table. Migration, not a schema copy (same split as the other
// setup routes). RLS on WITHOUT a policy: only the service key reaches it — it
// holds e-mail addresses and is never read in the browser.
export const WARTELISTE_SQL = `
  CREATE TABLE IF NOT EXISTS public.warteliste (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    liste text NOT NULL,
    email text NOT NULL,
    -- ausstehend | bestaetigt | abgemeldet
    status text NOT NULL DEFAULT 'ausstehend',
    -- Proof of consent: WHICH wording (lib/warteliste-einwilligung.ts) and
    -- THAT the confirmation mail left (mail server id, no copy of the mail).
    einwilligung_version text,
    versand_beleg text,
    erstellt_am timestamptz NOT NULL DEFAULT now(),
    bestaetigt_am timestamptz,
    abgemeldet_am timestamptz,
    -- The one promised message ("Nachricht zum Start").
    letzte_mail_am timestamptz
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_warteliste_liste_email ON public.warteliste (liste, email);
  CREATE INDEX IF NOT EXISTS idx_warteliste_status ON public.warteliste (status, erstellt_am);

  ALTER TABLE public.warteliste ENABLE ROW LEVEL SECURITY;
  -- Supabase grants anon/authenticated directly via default privileges; a
  -- revoke from PUBLIC alone does not reach them.
  REVOKE ALL ON public.warteliste FROM PUBLIC;
  REVOKE ALL ON public.warteliste FROM anon;
  REVOKE ALL ON public.warteliste FROM authenticated;
  GRANT ALL ON public.warteliste TO service_role;
`;
