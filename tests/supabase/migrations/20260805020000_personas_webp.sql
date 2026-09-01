-- The crew's art is WebP now (round two of the asset pass): every served
-- persona PNG became a .webp twin (94% smaller). The characters table stored
-- the .png paths — point them at the new files. Data-only update; no schema
-- change.
update public.characters
set portrait_path = replace(portrait_path, '.png', '.webp'),
    fullbody_path = replace(fullbody_path, '.png', '.webp');
