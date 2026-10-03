-- Dedicated write capability. The worker never receives a Supabase service key.
BEGIN;
CREATE TABLE IF NOT EXISTS public.park_weather_upload_key (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 key_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.park_weather_snapshot (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 payload jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.park_weather_upload_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.park_weather_snapshot ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.park_weather_upload_key, public.park_weather_snapshot FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.park_weather_snapshot TO service_role;
CREATE OR REPLACE FUNCTION public.upload_park_weather(p_key text, p_payload jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE stored_hash text;
BEGIN
 SELECT key_hash INTO stored_hash FROM public.park_weather_upload_key WHERE singleton;
 IF p_key IS NULL OR length(p_key) <> 64 OR stored_hash IS NULL OR encode(sha256(convert_to(p_key,'UTF8')),'hex') <> stored_hash THEN
  RAISE EXCEPTION 'Invalid weather upload credential' USING ERRCODE = '42501';
 END IF;
 IF p_payload IS NULL OR octet_length(p_payload::text) > 2097152
 OR (p_payload->>'version') IS DISTINCT FROM '1'
 OR (p_payload->>'model') IS DISTINCT FROM 'dwd_icon_d2'
 OR jsonb_typeof(p_payload->'points') IS DISTINCT FROM 'object'
 OR p_payload->'points' = '{}'::jsonb
 OR (p_payload->>'generatedAt') IS NULL OR (p_payload->>'runInit') IS NULL
 OR (p_payload->>'generatedAt')::timestamptz NOT BETWEEN now()-interval '2 hours' AND now()+interval '1 minute'
 OR (p_payload->>'runInit')::timestamptz NOT BETWEEN now()-interval '12 hours' AND now()+interval '1 minute' THEN
  RAISE EXCEPTION 'Invalid weather snapshot';
 END IF;
 INSERT INTO public.park_weather_snapshot(singleton,payload) VALUES(true,p_payload)
 ON CONFLICT(singleton) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()
 WHERE (public.park_weather_snapshot.payload->>'runInit')::timestamptz <= (EXCLUDED.payload->>'runInit')::timestamptz
 AND (public.park_weather_snapshot.payload->>'generatedAt')::timestamptz <= (EXCLUDED.payload->>'generatedAt')::timestamptz;
END;
$$;
REVOKE ALL ON FUNCTION public.upload_park_weather(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upload_park_weather(text,jsonb) TO anon;
NOTIFY pgrst, 'reload schema';
COMMIT;
