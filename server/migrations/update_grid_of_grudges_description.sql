-- Migration: Update Grid of Grudges description
-- This updates the description for the grid_of_grudges game type

UPDATE game_types 
SET description = 'Race the clock, decode the clues, and claim the grid.'
WHERE slug = 'grid_of_grudges';