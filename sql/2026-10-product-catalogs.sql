-- Atomic replacement: readers see either the previous or the complete new catalogue.
CREATE TABLE IF NOT EXISTS public.product_catalogs (
  id text PRIMARY KEY CHECK (id IN ('wp', 'bkw')),
  fetched_at timestamptz NOT NULL,
  source_at timestamptz,
  item_count integer NOT NULL CHECK (item_count > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'array')
);
ALTER TABLE public.product_catalogs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_catalogs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_catalogs TO service_role;
ALTER TABLE public.wp_geraete ADD COLUMN IF NOT EXISTS haendlerstand_am timestamptz;

CREATE OR REPLACE FUNCTION public.replace_product_catalog(
  p_catalog text, p_payload jsonb, p_fetched_at timestamptz, p_source_at timestamptz DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF p_catalog NOT IN ('wp','bkw') OR p_catalog IS NULL OR jsonb_typeof(p_payload) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid catalogue';
  END IF;
  n := jsonb_array_length(p_payload);
  IF n = 0 OR p_fetched_at IS NULL OR p_fetched_at > now() + interval '5 minutes' OR p_fetched_at < now() - interval '1 hour' THEN
    RAISE EXCEPTION 'Empty or invalid catalogue timestamp';
  END IF;
  IF (SELECT count(DISTINCT item->>'id') FROM jsonb_array_elements(p_payload) item) <> n THEN
    RAISE EXCEPTION 'Missing or duplicate catalogue identifiers';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('product-catalog-' || p_catalog));
  IF EXISTS (SELECT 1 FROM product_catalogs WHERE id=p_catalog AND fetched_at > p_fetched_at) THEN
    RAISE EXCEPTION 'Newer catalogue already stored';
  END IF;
  IF p_catalog = 'wp' THEN
    IF p_source_at IS NULL OR p_source_at < now() - interval '3 days' OR p_source_at > now() + interval '5 minutes' THEN
      RAISE EXCEPTION 'Merchant feed is stale or has no valid timestamp';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload) item WHERE coalesce((item->>'preis_eur')::numeric,0) <= 0) THEN
      RAISE EXCEPTION 'Invalid device price';
    END IF;
    DELETE FROM wp_geraete WHERE id IS NOT NULL;
    INSERT INTO wp_geraete SELECT * FROM jsonb_populate_recordset(NULL::wp_geraete, p_payload);
    UPDATE wp_geraete SET abgerufen_am=p_fetched_at, haendlerstand_am=p_source_at WHERE id IS NOT NULL;
  ELSE
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload) item WHERE coalesce((item->>'preis')::numeric,0) <= 0) THEN
      RAISE EXCEPTION 'Invalid offer price';
    END IF;
  END IF;
  INSERT INTO product_catalogs(id,fetched_at,source_at,item_count,payload)
    VALUES(p_catalog,p_fetched_at,p_source_at,n,CASE WHEN p_catalog='wp' THEN '[]'::jsonb ELSE p_payload END)
    ON CONFLICT(id) DO UPDATE SET fetched_at=excluded.fetched_at, source_at=excluded.source_at,
      item_count=excluded.item_count,payload=excluded.payload;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.replace_product_catalog(text,jsonb,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_product_catalog(text,jsonb,timestamptz,timestamptz) TO service_role;
NOTIFY pgrst, 'reload schema';
