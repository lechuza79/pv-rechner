-- Add electricity price + annual increase to market_prices
-- Run once in Supabase SQL editor. Safe to re-run (IF NOT EXISTS).

ALTER TABLE market_prices
  ADD COLUMN IF NOT EXISTS electricity_price NUMERIC(5, 3),
  ADD COLUMN IF NOT EXISTS electricity_increase NUMERIC(5, 4);

COMMENT ON COLUMN market_prices.electricity_price IS 'Haushaltsstrom Arbeitspreis in €/kWh (z. B. 0.340)';
COMMENT ON COLUMN market_prices.electricity_increase IS 'Erwartete jährliche Steigerung als Dezimal (z. B. 0.03 = 3%/Jahr)';
