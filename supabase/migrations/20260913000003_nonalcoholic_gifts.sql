-- Add non-alcoholic gift options so sober guests don't feel left out.
-- Mini category: mocktail and non-alcoholic spirit alternatives on each floor.

insert into public.gift_catalog (slug, name, emoji, floor, token_cost, kind) values
  -- Silver: entry-level mocktails
  ('sparkling_cider', 'Sparkling Cider', '🍎', 'silver',   8,  'mini'),
  ('craft_cola',      'Craft Cola',     '🥤', 'silver',  10,  'mini'),
  ('fresh_seltzer',   'Fresh Seltzer',  '🫧', 'silver',  12,  'mini'),
  -- Gold: mocktail upgrades
  ('mock_mojito',     'Mock Mojito',    '🌿', 'gold',    18,  'mini'),
  ('berry_fizz',      'Berry Fizz',     '🫐', 'gold',    20,  'mini'),
  ('virgin_margarita','Virgin Margarita','🍋', 'gold',    22,  'mini'),
  -- Platinum: premium mocktails
  ('artisan_shrub',   'Artisan Shrub',  '🍯', 'platinum',30,  'mini'),
  ('sparked_wine',    'Sparkling Wine', '🥂', 'platinum',35,  'mini'),
  ('gourmet_coffee',  'Gourmet Coffee', '☕', 'platinum',40,  'mini'),
  -- Diamond: luxury mocktails + the alcohol alternatives
  ('luxury_mocktail', 'Luxury Mocktail','🍹', 'diamond', 45,  'mini'),
  ('non_alc_prosecco','Non-Alc Prosecco','🍾', 'diamond', 50,  'mini'),
  ('craft_kombucha',  'Craft Kombucha', '🧫', 'diamond', 55,  'mini')
on conflict (slug) do nothing;
