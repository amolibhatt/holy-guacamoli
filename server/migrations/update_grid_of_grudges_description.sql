-- Migration: Update Buzzkill description
-- This updates the description for the buzzkill game type
-- Also renames old grid_of_grudges slug to buzzkill

UPDATE game_types 
SET slug = 'buzzkill'
WHERE slug = 'grid_of_grudges';

UPDATE game_types 
SET description = 'Race the clock, decode the clues, and claim the grid.'
WHERE slug = 'buzzkill';