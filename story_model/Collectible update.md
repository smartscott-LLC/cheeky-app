Collectible update

\-- Assumes collectibles table exists; add this row via seed/backfill  
INSERT INTO collectibles (id, name, description, icon\_url, tier, unlock\_condition)  
VALUES (  
  'coat-check-ai-unlock',  
  'Coat Check Persona',  
  'You found your dream date at the top. Unlock chat with the Coat Check AI.',  
  '/personas/coat-check.webp',  
  'diamond',  \-- or your naming convention  
  'story\_mode:complete'  
);  
