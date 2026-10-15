-- Persist real content changes across render processes and deployments.
CREATE TABLE IF NOT EXISTS public.page_content_state (
  path text PRIMARY KEY,
  fingerprint text NOT NULL,
  observed_at timestamptz NOT NULL,
  modified_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.page_content_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.page_content_state FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.page_content_state TO service_role;

CREATE OR REPLACE FUNCTION public.record_page_content(p_path text, p_fingerprint text, p_observed_at timestamptz)
RETURNS timestamptz LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result timestamptz;
BEGIN
  IF p_path <> '/atomstrom-import' OR p_fingerprint !~ '^[0-9a-f]{64}$' OR p_observed_at > clock_timestamp() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Invalid page content state';
  END IF;
  INSERT INTO public.page_content_state(path, fingerprint, observed_at)
  VALUES (p_path, p_fingerprint, p_observed_at)
  ON CONFLICT (path) DO UPDATE SET
    fingerprint = EXCLUDED.fingerprint,
    observed_at = EXCLUDED.observed_at,
    modified_at = CASE WHEN page_content_state.fingerprint IS DISTINCT FROM EXCLUDED.fingerprint THEN clock_timestamp() ELSE page_content_state.modified_at END
  WHERE EXCLUDED.observed_at >= page_content_state.observed_at
  RETURNING modified_at INTO result;
  -- An older concurrent response must not claim the newer content's timestamp.
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.record_page_content(text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_page_content(text,text,timestamptz) TO service_role;
