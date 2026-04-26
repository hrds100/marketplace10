-- Fix Pembroke Place rent_cost: legacy shows first month's rent = 3,500 GBP
-- Current value (4,400) is the bills amount, not the rent cost displayed on the card
UPDATE inv_properties
SET rent_cost = 3500
WHERE blockchain_property_id = 1
  AND rent_cost = 4400;
