--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: board_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.board_categories VALUES (3652, 1578, 6101, 0);
INSERT INTO public.board_categories VALUES (3653, 1578, 6102, 1);
INSERT INTO public.board_categories VALUES (3654, 1578, 6103, 2);
INSERT INTO public.board_categories VALUES (3655, 1578, 6104, 3);
INSERT INTO public.board_categories VALUES (3656, 1578, 6105, 4);
INSERT INTO public.board_categories VALUES (3657, 1579, 6106, 0);
INSERT INTO public.board_categories VALUES (3658, 1579, 6107, 1);
INSERT INTO public.board_categories VALUES (3659, 1579, 6108, 2);
INSERT INTO public.board_categories VALUES (3660, 1579, 6109, 3);
INSERT INTO public.board_categories VALUES (3661, 1579, 6110, 4);
INSERT INTO public.board_categories VALUES (3662, 1580, 6111, 0);
INSERT INTO public.board_categories VALUES (3663, 1580, 6112, 1);
INSERT INTO public.board_categories VALUES (3664, 1580, 6113, 2);
INSERT INTO public.board_categories VALUES (3665, 1580, 6114, 3);
INSERT INTO public.board_categories VALUES (3666, 1580, 6115, 4);
INSERT INTO public.board_categories VALUES (3667, 1581, 6116, 0);
INSERT INTO public.board_categories VALUES (3668, 1581, 6117, 1);
INSERT INTO public.board_categories VALUES (3669, 1581, 6118, 2);
INSERT INTO public.board_categories VALUES (3670, 1582, 6119, 0);
INSERT INTO public.board_categories VALUES (3671, 1582, 6120, 1);
INSERT INTO public.board_categories VALUES (3672, 1582, 6121, 2);
INSERT INTO public.board_categories VALUES (3673, 1581, 6122, 3);
INSERT INTO public.board_categories VALUES (3674, 1581, 6123, 4);
INSERT INTO public.board_categories VALUES (3675, 1582, 6124, 3);
INSERT INTO public.board_categories VALUES (3676, 1582, 6125, 4);
INSERT INTO public.board_categories VALUES (3677, 1583, 6126, 0);
INSERT INTO public.board_categories VALUES (3678, 1583, 6127, 1);
INSERT INTO public.board_categories VALUES (3679, 1583, 6128, 2);
INSERT INTO public.board_categories VALUES (3680, 1583, 6129, 3);
INSERT INTO public.board_categories VALUES (3681, 1583, 6130, 4);


--
-- Data for Name: boards; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.boards VALUES (1578, 'FBX TRIVIA', NULL, '[10, 20, 30, 40, 50]', 'd5458342-e771-4812-8174-2428a2b3efeb', 'blitzgrid:sports', 'private', false, '#6366f1', 0, false);
INSERT INTO public.boards VALUES (1583, 'Bollywood', 'Blitzgrid', '[10, 20, 30, 40, 50]', 'd5458342-e771-4812-8174-2428a2b3efeb', 'blitzgrid:beach', 'private', false, '#6366f1', 0, true);
INSERT INTO public.boards VALUES (1582, 'Brain Buffer', NULL, '[10, 20, 30, 40, 50]', 'd5458342-e771-4812-8174-2428a2b3efeb', 'blitzgrid:music', 'private', false, '#6366f1', 0, true);
INSERT INTO public.boards VALUES (1581, 'Warped World', 'Pop culture & movies', '[10, 20, 30, 40, 50]', 'd5458342-e771-4812-8174-2428a2b3efeb', 'blitzgrid:space', 'private', false, '#6366f1', 0, false);
INSERT INTO public.boards VALUES (1579, 'The Inner Circle', NULL, '[10, 20, 30, 40, 50]', 'd5458342-e771-4812-8174-2428a2b3efeb', 'blitzgrid:birthday', 'private', false, '#6366f1', 0, false);
INSERT INTO public.boards VALUES (1580, 'Mashed Matrix', NULL, '[10, 20, 30, 40, 50]', 'd5458342-e771-4812-8174-2428a2b3efeb', 'blitzgrid:beach', 'private', false, '#6366f1', 0, false);


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories VALUES (6072, 'fvv', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6073, 'vedf', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6074, 'dsbhs', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6075, 'hbsev', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6076, 'hcsdbh', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6077, 'Ex-Communication', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6078, 'This and That', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6079, 'Goal-Standard', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6080, 'Ref-erendum', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6081, 'Brawl-Street', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6082, 'The Downward Spiral', 'Answer contains ''DOWN''', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6083, 'Typo Tourism', 'Identify the country', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6084, 'Feline Overloads', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6085, 'Badly Explained Plots', 'Identify the movie', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6086, 'Source Code', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6087, 'Ex-Communication', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6088, 'This and That', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6089, 'Goal-Standard', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6090, 'Ref-erendum', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6091, 'Brawl-Street', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6092, 'Tax Havens', 'Rich hideouts', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6093, 'Typo Tourism', 'Identify the country', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6094, 'Feline Overloads', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6095, 'Badly Explained Plots', 'Identify the movie', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6096, 'Source Code', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6098, 'The Flip-Flop', 'Reverse spelling for 2nd word', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6099, 'Hello World', 'Identify the language', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6100, 'F.U.', 'Answer starts with ''FU''', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6097, 'The Downward Spiral', 'Answer contains ''DOWN''', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6102, 'This and That', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6103, 'Goal-Standard', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6104, 'Ref-erendum', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6105, 'Brawl-Street', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6106, 'Tax Havens', 'Identify the rich hideout', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6107, 'Typo Tourism', 'Identify the country', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6108, 'Feline Overloads', 'Identify the feline logic', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6109, 'Badly Explained Plots', 'Identify the movie', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6110, 'Precious Intel', 'Identify the data', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6111, 'The Downward Spiral', 'Answer contains ''DOWN''', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6112, 'The Flip-Flop', 'Reverse spelling for 2nd word', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6113, 'Hello World', 'Identify the language', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6114, 'Side-Eye POV', 'Identify the movie', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6115, 'Relic Roasts', 'Identify the landmark', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6116, 'Venn Diagram Vibes', '3 clues, 1 answer', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6117, 'Global Cuisine', 'Identify the food', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6118, 'Hot Mess Express', 'Identify the business disaster', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6119, 'Corporate Confessions', 'Identify the brand', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6120, 'Vowel Movement', 'Swap one vowel for 2 words', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6121, 'F.U.', 'Answer starts with ''FU''', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6122, 'Vacuum Reviews', 'Identify the space object', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6123, 'Frozen Fiction', 'Identify the movie', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6124, 'TBT', 'Identify the pop song', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6125, 'Dummy', 'Dummy', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6126, 'Clinical Dialogues', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6127, 'Co-starring at the Altar', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6128, 'Lyrical Logic', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6129, 'Material Evidence', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6130, 'The Corporate Grindset', '', '', NULL, false, NULL);
INSERT INTO public.categories VALUES (6101, 'Ex-Communication', '', '', NULL, false, NULL);


--
-- Data for Name: game_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.game_types VALUES (5, 'blitzgrid', 'Blitzgrid', 'Race the clock, decode the clues, and claim the grid.', 'grid', true, true, 1, '2026-01-22 12:20:29.347735', 'active');
INSERT INTO public.game_types VALUES (6, 'psyop', 'PsyOp', 'Mind games and psychological challenges. Can you outsmart your opponents?', 'brain', true, true, 3, '2026-01-30 05:56:52.592412', 'active');
INSERT INTO public.game_types VALUES (3, 'sequence_squeeze', 'Sort Circuit', 'Race to arrange 4 options in the correct order! Fastest correct sequence wins.', 'list-ordered', true, true, 2, '2026-01-12 12:06:48.059754', 'active');


--
-- Data for Name: psyop_questions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.psyop_questions VALUES (1, NULL, 'The national animal of Scotland is the [REDACTED]', 'unicorn', 'Animals', true, '2026-01-31 17:34:29.469423');
INSERT INTO public.psyop_questions VALUES (2, NULL, 'Honey never [REDACTED]', 'spoils', 'Food', true, '2026-01-31 17:34:29.469423');
INSERT INTO public.psyop_questions VALUES (3, NULL, 'A group of flamingos is called a [REDACTED]', 'flamboyance', 'Animals', true, '2026-01-31 17:34:29.469423');


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.questions VALUES (15027, 'eger', '[]', 'eveve', 10, 6072, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15028, 'bjekdc', '[]', 'jkcfe', 50, 6073, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15029, 'hbcvjd', '[]', 'dfvjdkv', 40, 6073, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15030, 'er', '[]', 'vjrk', 30, 6073, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15031, 'recvse', '[]', 'vdrvdr', 20, 6073, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15032, 'evef', '[]', 'dvvdfvr', 10, 6073, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15033, 'ksjkvfsd', '[]', 'fdjk', 30, 6072, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15034, 'evser', '[]', 'vdvdkh', 20, 6072, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15035, 'dnsc s', '[]', 'sjdskc', 40, 6072, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15036, 'fdvdf', '[]', 'cdskjbc', 50, 6072, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15037, 'djbskfc', '[]', 'djbskfc', 10, 6074, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15038, 'djbskfc', '[]', 'djbskfc', 20, 6074, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15039, 'djbskfc', '[]', 'djbskfc', 30, 6074, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15040, 'djbskfc', '[]', 'djbskfc', 40, 6074, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15041, 'djbskfc', '[]', 'djbskfc', 50, 6074, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15042, 'djbskfc', '[]', 'djbskfc', 10, 6075, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15043, 'djbskfc', '[]', 'djbskfc', 20, 6075, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15044, 'djbskfc', '[]', 'djbskfc', 30, 6075, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15045, 'djbskfc', '[]', 'djbskfc', 40, 6075, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15046, 'djbskfc', '[]', 'djbskfc', 50, 6075, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15047, 'djbskfc', '[]', 'djbskfc', 10, 6076, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15048, 'djbskfc', '[]', 'djbskfc', 20, 6076, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15049, 'djbskfc', '[]', 'djbskfc', 30, 6076, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15050, 'djbskfc', '[]', 'djbskfc', 40, 6076, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15051, 'djbskfc', '[]', 'djbskfc', 50, 6076, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15052, 'Which Arsenal academy player moved to Manchester United on Feb 1, 2025, for a tribunal fee over £1m?', '[]', 'Ayden Heaven', 10, 6077, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15053, 'Which Dutch striker left Arsenal for Man Utd in 2012 and won the Golden Boot the following season?', '[]', 'Robin van Persie', 20, 6077, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15054, 'Name the two players involved in the direct swap deal between the clubs in January 2018.', '[]', 'Alexis Sánchez and Henrikh Mkhitaryan', 30, 6077, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15055, 'Which player became the first player to move directly between the clubs in the Premier League era (2008)?', '[]', 'Mikaël Silvestre', 40, 6077, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15056, 'Which Argentine defender tried to force a move from United to Liverpool, with Arsenal rumored as a bystander, in 2007?', '[]', 'Gabriel Heinze', 50, 6077, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15057, 'What was the exact score of the penalty shootout in the Jan 2025 FA Cup tie?', '[]', '5 - 3 to Manchester United', 10, 6078, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15058, 'Arsenal''s 2-0 win in Dec 2024 ended which manager''s 34-game league unbeaten streak?', '[]', 'Ruben Amorim', 20, 6078, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15059, 'How many saves did David De Gea make in the Dec 2017 match, setting a Premier League record?', '[]', '14', 30, 6078, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15060, 'Which player has the made the highest appearances in this fixture?', '[]', 'Ryan Giggs(50)', 40, 6078, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15061, 'After which match does Ferguson mention in his Autobiography improved his relationship with Wenger calling it a "Major Turning Point"?', '[]', 'Champions League Semi Final 2009', 50, 6078, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15062, 'Who scored the winning goal for Arsenal at Old Trafford in the opening game of the 2025/26 season (Aug 17, 2025)?', '[]', 'Riccardo Calafiori', 10, 6079, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15063, 'In the famous "Battle of Old Trafford" (September 21, 2003), which Manchester United striker missed a crucial penalty in injury time, sparking wild Arsenal celebrations?', '[]', 'Ruud van Nistelrooy', 20, 6079, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15064, 'Who holds the record for most goals scored in head-to-head Arsenal vs. Manchester United matches?', '[]', 'Wayne Rooney with 12 goals', 30, 6079, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15065, 'In the February 1, 2005 fixture (United 4-2 Arsenal), which Manchester United defender scored an "unlikely" chip goal, cementing United''s comeback victory?', '[]', 'John O''Shea in the 89th min', 40, 6079, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15066, 'Which Manchester United player scored a hat-trick inside 22 minutes in the 6-1 win in 2001?', '[]', 'Dwight Yorke', 50, 6079, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15067, 'Which United manager threw himself to the ground to demonstrate a dive to the fourth official in 2016?', '[]', 'Louis van Gaal', 10, 6080, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15068, 'Which Referee famously gave Wenger a red card at OT, leading to his iconic moment in front of the fans in the stand?', '[]', 'Mike Dean', 20, 6080, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15069, 'How many red cards were shown in Arsenal vs. Manchester United matches between February 1997 and February 2005?', '[]', 'Seven', 30, 6080, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15070, 'Which referee sent off Angel Di Maria in 2015 after the player grabbed his shirt?', '[]', 'Angel Di Maria', 40, 6080, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15071, 'In the "Pizzagate" match (2004), Ref Mike Riley''s performance was heavily criticized by Wenger, leading to what amount of fine?', '[]', '£15,000', 50, 6080, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15072, 'What food item was thrown at Sir Alex Ferguson following the "Battle of the Buffet" in 2004?', '[]', 'Pizza', 10, 6081, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15073, 'Who were the two players involved in the verbal altercation in the Highbury tunnel in Feb 2005?', '[]', 'Roy Keane and Patrick Vieira', 20, 6081, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15074, 'During the Pizzagate incident (October 2004), Arsène Wenger confronted Ruud van Nistelrooy about which player''s injury, thereby instigating the broader tunnel melee?', '[]', 'Ashley Cole', 30, 6081, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15075, 'In July 2023, a violent fan brawl occurred during a friendly match between the clubs. In which stadium did this take place?', '[]', 'MetLife Stadium (New Jersey)', 40, 6081, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15076, 'Name the Cameroonian midfielder who made a notoriously aggressive 2003 Community Shield  tackle on Arsenal''s Sol Campbell, Wenger called it "obscene"?', '[]', 'Eric Djemba-Djemba', 50, 6081, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15077, 'The count before a rocket launch or a 5-second YouTube ad.', '[]', 'Countdown', 10, 6082, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15078, 'A mental collapse from stress or when your old car stops working.', '[]', 'Breakdown', 20, 6082, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15079, 'The corporate way to say everyone is fired to save money.', '[]', 'Downsizing', 30, 6082, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15080, 'When a website crashes or your productivity dies because of Instagram.', '[]', 'Downtime', 40, 6082, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15081, 'A high-stakes final battle between a hero and a villain.', '[]', 'Showdown', 50, 6082, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15082, 'Can''t scale the summit? The famous peak of this country also looks great from a PLANE.', '[]', 'NEPAL', 10, 6083, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15083, 'It was worth all the PAINS to travel across the Pyrenees to reach this Mediterranean land of Flamenco and tapas.', '[]', 'SPAIN', 20, 6083, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15084, 'You could line up ANY ROW of postcards from this country and they''d still be filled with fjords and glaciers.', '[]', 'NORWAY', 30, 6083, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15085, 'This Mediterranean giant wears its historical REGALIA with pride, from its Saharan dunes to its Roman ruins.', '[]', 'ALGERIA', 40, 6083, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15086, 'Don''t need a precise ESTIMATOR to appreciate the rich marine life of this Southeast Asian nation.', '[]', 'EAST TIMOR', 50, 6083, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15087, 'A famous 1935 thought experiment where a creature''s existence is a 50/50 coin-flip between "alive" and "dead" until someone gets nosy and opens the lid.', '[]', 'Schrödinger’s Cat', 10, 6084, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15088, 'In 2008, this luxury car brand became a wholly owned subsidiary of Tata Motors.', '[]', 'Jaguar', 20, 6084, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15089, 'Released in the 80s, this rock anthem and the Rocky montage is probably a part of every gym playlist.', '[]', 'Eye of the Tiger', 30, 6084, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15090, 'A leaping predator brand built on pure German spite after a family feud over three stripes.', '[]', 'Puma', 40, 6084, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15091, 'A predator used in a common proverb to describe a person who is incapable of changing their core nature or past behavior, no matter how hard they try.', '[]', 'Leopard', 50, 6084, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15092, 'A man destroys Pakistan''s entire plumbing system using his bare hands just because his father-in-law was rude.', '[]', 'Gaddar', 10, 6085, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15093, 'England manages to suck at cricket even though it was literally the only country playing the sport professionally at the time.', '[]', 'Lagaan', 20, 6085, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15094, 'A 2.5-hour long wedding video featuring a family dog who is forced to play matchmaker.', '[]', 'Hum Aapke Hai Koun', 30, 6085, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15095, 'A young girl and her dead mother manipulate everyone into breaking a nice guy''s heart.', '[]', 'Kuch Kuch Hota Hai', 40, 6085, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15096, 'A man discovers he can successfully catfish his own spouse, proving that her entire memory of his identity is tethered to a single, two-inch strip of facial hair.', '[]', 'Rab Ne Bana Di Jodi', 50, 6085, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15097, 'Tucked inside my legal string like a hidden, secret key, 
Name my Middle Word and the City that first hosted me!', '[]', 'Vinay and Surendranagar', 10, 6086, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15098, 'To fund this life and my daily snack supply, 
I work for a Company—don''t even ask me why!
But what’s my Job Title? Those fancy words in my mail?
Tell me BOTH or your friendship logic is bound to fail!', '[]', 'Litera and Senior Product Owner', 20, 6086, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15099, 'If the world is ending and I’m glued to the TV,
Which Famous Series is the only one for me?
I’ve seen every episode, I know every line by heart,
Name this show to prove you’re actually ''Amoli-smart''!', '[]', 'The Office', 30, 6086, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15100, 'When my logic is crashing and I’m starting to get mad,
Which One Specific Food makes my stomach really glad?
It’s the ultimate ''hangry'' fix, the only meal I crave,
Guess this dish correctly if you want to be brave!', '[]', 'Chips/Pizza/Pasta/Dimsums', 40, 6086, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15101, 'I’m a master of logic, I’m technically right, 
But I still need a cuddle in the middle of the night!
My favorite fabric has a Steam Engine’s name, 
What is my Blanket called? It’s your ticket to fame!', '[]', 'Choo Choo', 50, 6086, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15102, 'Which Arsenal academy player moved to Manchester United on Feb 1, 2025, for a tribunal fee over £1m?', '[]', 'Ayden Heaven', 10, 6087, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15103, 'Which Dutch striker left Arsenal for Man Utd in 2012 and won the Golden Boot the following season?', '[]', 'Robin van Persie', 20, 6087, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15104, 'Name the two players involved in the direct swap deal between the clubs in January 2018.', '[]', 'Alexis Sánchez and Henrikh Mkhitaryan', 30, 6087, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15105, 'Which player became the first player to move directly between the clubs in the Premier League era (2008)?', '[]', 'Mikaël Silvestre', 40, 6087, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15106, 'Which Argentine defender tried to force a move from United to Liverpool, with Arsenal rumored as a bystander, in 2007?', '[]', 'Gabriel Heinze', 50, 6087, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15107, 'What was the exact score of the penalty shootout in the Jan 2025 FA Cup tie?', '[]', '5 - 3 to Manchester United', 10, 6088, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15108, 'Arsenal''s 2-0 win in Dec 2024 ended which manager''s 34-game league unbeaten streak?', '[]', 'Ruben Amorim', 20, 6088, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15109, 'How many saves did David De Gea make in the Dec 2017 match, setting a Premier League record?', '[]', '14', 30, 6088, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15110, 'Which player has the made the highest appearances in this fixture?', '[]', 'Ryan Giggs(50)', 40, 6088, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15111, 'After which match does Ferguson mention in his Autobiography improved his relationship with Wenger calling it a "Major Turning Point"?', '[]', 'Champions League Semi Final 2009', 50, 6088, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15112, 'Who scored the winning goal for Arsenal at Old Trafford in the opening game of the 2025/26 season (Aug 17, 2025)?', '[]', 'Riccardo Calafiori', 10, 6089, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15113, 'In the famous "Battle of Old Trafford" (September 21, 2003), which Manchester United striker missed a crucial penalty in injury time, sparking wild Arsenal celebrations?', '[]', 'Ruud van Nistelrooy', 20, 6089, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15114, 'Who holds the record for most goals scored in head-to-head Arsenal vs. Manchester United matches?', '[]', 'Wayne Rooney with 12 goals', 30, 6089, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15115, 'In the February 1, 2005 fixture (United 4-2 Arsenal), which Manchester United defender scored an "unlikely" chip goal, cementing United''s comeback victory?', '[]', 'John O''Shea in the 89th min', 40, 6089, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15116, 'Which Manchester United player scored a hat-trick inside 22 minutes in the 6-1 win in 2001?', '[]', 'Dwight Yorke', 50, 6089, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15117, 'Which United manager threw himself to the ground to demonstrate a dive to the fourth official in 2016?', '[]', 'Louis van Gaal', 10, 6090, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15118, 'Which Referee famously gave Wenger a red card at OT, leading to his iconic moment in front of the fans in the stand?', '[]', 'Mike Dean', 20, 6090, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15119, 'How many red cards were shown in Arsenal vs. Manchester United matches between February 1997 and February 2005?', '[]', 'Seven', 30, 6090, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15120, 'Which referee sent off Angel Di Maria in 2015 after the player grabbed his shirt?', '[]', 'Angel Di Maria', 40, 6090, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15121, 'In the "Pizzagate" match (2004), Ref Mike Riley''s performance was heavily criticized by Wenger, leading to what amount of fine?', '[]', '£15,000', 50, 6090, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15122, 'What food item was thrown at Sir Alex Ferguson following the "Battle of the Buffet" in 2004?', '[]', 'Pizza', 10, 6091, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15123, 'Who were the two players involved in the verbal altercation in the Highbury tunnel in Feb 2005?', '[]', 'Roy Keane and Patrick Vieira', 20, 6091, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15124, 'During the Pizzagate incident (October 2004), Arsène Wenger confronted Ruud van Nistelrooy about which player''s injury, thereby instigating the broader tunnel melee?', '[]', 'Ashley Cole', 30, 6091, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15125, 'In July 2023, a violent fan brawl occurred during a friendly match between the clubs. In which stadium did this take place?', '[]', 'MetLife Stadium (New Jersey)', 40, 6091, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15126, 'Name the Cameroonian midfielder who made a notoriously aggressive 2003 Community Shield  tackle on Arsenal''s Sol Campbell, Wenger called it "obscene"?', '[]', 'Eric Djemba-Djemba', 50, 6091, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15127, 'Famous for a massive shipping canal and a "Leak" of papers that made tax-evaders very sweaty.', '[]', 'Panama', 10, 6092, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15128, 'The world''s most "neutral" country, famous for chocolate, watches, and vaults that don''t ask any questions.', '[]', 'Switzerland', 20, 6092, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15129, 'A tiny patch of coast where you need a yacht just to be considered "middle class" and income tax doesn''t exist.', '[]', 'Monaco', 30, 6092, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15130, 'The spiritual home of three-piece suits and zero taxes, with more registered companies than actual humans.', '[]', 'Cayman Islands', 40, 6092, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15131, 'This "Triangle" of luxury is where billionaires'' money goes to disappear from the view of the government.', '[]', 'Bermuda', 50, 6092, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15132, 'Can''t scale the summit? The famous peak of this country also looks great from a PLANE.', '[]', 'NEPAL', 10, 6093, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15133, 'It was worth all the PAINS to travel across the Pyrenees to reach this Mediterranean land of Flamenco and tapas.', '[]', 'SPAIN', 20, 6093, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15134, 'You could line up ANY ROW of postcards from this country and they''d still be filled with fjords and glaciers.', '[]', 'NORWAY', 30, 6093, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15135, 'This Mediterranean giant wears its historical REGALIA with pride, from its Saharan dunes to its Roman ruins.', '[]', 'ALGERIA', 40, 6093, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15136, 'Don''t need a precise ESTIMATOR to appreciate the rich marine life of this Southeast Asian nation.', '[]', 'EAST TIMOR', 50, 6093, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15137, 'A famous 1935 thought experiment where a creature''s existence is a 50/50 coin-flip between "alive" and "dead" until someone gets nosy and opens the lid.', '[]', 'Schrödinger’s Cat', 10, 6094, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15138, 'In 2008, this luxury car brand became a wholly owned subsidiary of Tata Motors.', '[]', 'Jaguar', 20, 6094, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15139, 'Released in the 80s, this rock anthem and the Rocky montage is probably a part of every gym playlist.', '[]', 'Eye of the Tiger', 30, 6094, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15140, 'A leaping predator brand built on pure German spite after a family feud over three stripes.', '[]', 'Puma', 40, 6094, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15141, 'A predator used in a common proverb to describe a person who is incapable of changing their core nature or past behavior, no matter how hard they try.', '[]', 'Leopard', 50, 6094, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15143, 'England manages to suck at cricket even though it was literally the only country playing the sport professionally at the time.', '[]', 'Lagaan', 20, 6095, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15145, 'A young girl and her dead mother manipulate everyone into breaking a nice guy''s heart.', '[]', 'Kuch Kuch Hota Hai', 40, 6095, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15146, 'A man discovers he can successfully catfish his own spouse, proving that her entire memory of his identity is tethered to a single, two-inch strip of facial hair.', '[]', 'Rab Ne Bana Di Jodi', 50, 6095, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15147, 'Tucked inside my legal string like a hidden, secret key, 
Name my Middle Word and the City that first hosted me!', '[]', 'Vinay and Surendranagar', 10, 6096, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15148, 'To fund this life and my daily snack supply, 
I work for a Company—don''t even ask me why!
But what’s my Job Title? Those fancy words in my mail?
Tell me BOTH or your friendship logic is bound to fail!', '[]', 'Litera and Senior Product Owner', 20, 6096, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15149, 'If the world is ending and I’m glued to the TV,
Which Famous Series is the only one for me?
I’ve seen every episode, I know every line by heart,
Name this show to prove you’re actually ''Amoli-smart''!', '[]', 'The Office', 30, 6096, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15150, 'When my logic is crashing and I’m starting to get mad,
Which One Specific Food makes my stomach really glad?
It’s the ultimate ''hangry'' fix, the only meal I crave,
Guess this dish correctly if you want to be brave!', '[]', 'Chips/Pizza/Pasta/Dimsums', 40, 6096, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15151, 'I’m a master of logic, I’m technically right, 
But I still need a cuddle in the middle of the night!
My favorite fabric has a Steam Engine’s name, 
What is my Blanket called? It’s your ticket to fame!', '[]', 'Choo Choo', 50, 6096, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15152, 'The count before a rocket launch or a 5-second YouTube ad.', '[]', 'Countdown', 10, 6097, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15153, 'A mental collapse from stress or when your old car stops working.', '[]', 'Breakdown', 20, 6097, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15154, 'The corporate way to say everyone is fired to save money.', '[]', 'Downsizing', 30, 6097, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15155, 'When a website crashes or your productivity dies because of Instagram.', '[]', 'Downtime', 40, 6097, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15156, 'A high-stakes final battle between a hero and a villain.', '[]', 'Showdown', 50, 6097, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15157, 'The act of consuming food vs. the hot beverage you drink with your pinky up while judging people.', '[]', 'Eat / Tea', 10, 6098, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15158, 'The state of being overwhelmed by 2026 news cycles vs. the sugary treats you eat to feel better about it.', '[]', 'Stressed / Desserts', 20, 6098, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15159, 'The state of being alive vs. the ultimate state of moral corruption and bad vibes.', '[]', 'Live / Evil', 30, 6098, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15160, 'A component or piece of a whole vs. a high-stakes mechanism used to catch an animal.', '[]', 'Part / Trap', 40, 6098, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15161, 'A sliding box in your desk used for storage vs. the positive result you get for being "Technically Correct."', '[]', 'Drawer / Reward', 50, 6098, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15162, 'BONJOUR', '[]', 'French', 10, 6099, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15163, 'CIAO', '[]', 'Italian', 20, 6099, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15164, 'KONNICHIWA', '[]', 'Japanese', 30, 6099, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15165, 'ANNYEONG', '[]', 'Korean', 40, 6099, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15166, 'GUTEN TAG', '[]', 'German', 50, 6099, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15167, 'The punctuation mark that doubles as a relationship-ender when used at the end of a one-word text.', '[]', 'Full-stop', 10, 6100, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15168, 'A sweet buttery candy or the polite way to say the other F-word.', '[]', 'Fudge', 20, 6100, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15169, 'A snowy Japanese volcano you''ll never actually climb.', '[]', 'Fuji', 30, 6100, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15170, 'A loud pink color that is basically a visual scream.', '[]', 'Fuchsia', 40, 6100, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15171, 'The process of smashing atomic nuclei together, and the culinary excuse for putting Butter Chicken in a taco just to charge you $40 for ''the experience.''', '[]', 'Fusion', 50, 6100, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15142, 'A man destroys Pakistan''s entire plumbing system using his bare hands just because his father-in-law was rude.', '[]', 'Gadar: Ek Prem Katha', 10, 6095, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15144, 'A 2.5-hour long wedding video featuring a family dog who is forced to play matchmaker.', '[]', 'Hum Aapke Hain Koun..!', 30, 6095, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15173, 'Which Dutch striker left Arsenal for Man Utd in 2012 and won the Golden Boot the following season?', '[]', 'Robin van Persie', 20, 6101, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15177, 'What was the exact score of the penalty shootout in the Jan 2025 FA Cup tie?', '[]', '5 - 3 to Manchester United', 10, 6102, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15178, 'Arsenal''s 2-0 win in Dec 2024 ended which manager''s 34-game league unbeaten streak?', '[]', 'Ruben Amorim', 20, 6102, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15179, 'How many saves did David De Gea make in the Dec 2017 match, setting a Premier League record?', '[]', '14', 30, 6102, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15180, 'Which player has the made the highest appearances in this fixture?', '[]', 'Ryan Giggs(50)', 40, 6102, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15181, 'After which match does Ferguson mention in his Autobiography improved his relationship with Wenger calling it a "Major Turning Point"?', '[]', 'Champions League Semi Final 2009', 50, 6102, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15182, 'Who scored the winning goal for Arsenal at Old Trafford in the opening game of the 2025/26 season (Aug 17, 2025)?', '[]', 'Riccardo Calafiori', 10, 6103, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15183, 'In the famous "Battle of Old Trafford" (September 21, 2003), which Manchester United striker missed a crucial penalty in injury time, sparking wild Arsenal celebrations?', '[]', 'Ruud van Nistelrooy', 20, 6103, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15184, 'Who holds the record for most goals scored in head-to-head Arsenal vs. Manchester United matches?', '[]', 'Wayne Rooney with 12 goals', 30, 6103, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15185, 'In the February 1, 2005 fixture (United 4-2 Arsenal), which Manchester United defender scored an "unlikely" chip goal, cementing United''s comeback victory?', '[]', 'John O''Shea in the 89th min', 40, 6103, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15186, 'Which Manchester United player scored a hat-trick inside 22 minutes in the 6-1 win in 2001?', '[]', 'Dwight Yorke', 50, 6103, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15187, 'Which United manager threw himself to the ground to demonstrate a dive to the fourth official in 2016?', '[]', 'Louis van Gaal', 10, 6104, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15188, 'Which Referee famously gave Wenger a red card at OT, leading to his iconic moment in front of the fans in the stand?', '[]', 'Mike Dean', 20, 6104, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15189, 'How many red cards were shown in Arsenal vs. Manchester United matches between February 1997 and February 2005?', '[]', 'Seven', 30, 6104, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15190, 'Which referee sent off Angel Di Maria in 2015 after the player grabbed his shirt?', '[]', 'Angel Di Maria', 40, 6104, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15191, 'In the "Pizzagate" match (2004), Ref Mike Riley''s performance was heavily criticized by Wenger, leading to what amount of fine?', '[]', '£15,000', 50, 6104, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15192, 'What food item was thrown at Sir Alex Ferguson following the "Battle of the Buffet" in 2004?', '[]', 'Pizza', 10, 6105, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15193, 'Who were the two players involved in the verbal altercation in the Highbury tunnel in Feb 2005?', '[]', 'Roy Keane and Patrick Vieira', 20, 6105, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15194, 'During the Pizzagate incident (October 2004), Arsène Wenger confronted Ruud van Nistelrooy about which player''s injury, thereby instigating the broader tunnel melee?', '[]', 'Ashley Cole', 30, 6105, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15195, 'In July 2023, a violent fan brawl occurred during a friendly match between the clubs. In which stadium did this take place?', '[]', 'MetLife Stadium (New Jersey)', 40, 6105, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15196, 'Name the Cameroonian midfielder who made a notoriously aggressive 2003 Community Shield  tackle on Arsenal''s Sol Campbell, Wenger called it "obscene"?', '[]', 'Eric Djemba-Djemba', 50, 6105, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15197, 'Famous for a massive shipping canal and a "Leak" of papers that made tax-evaders very sweaty.', '[]', 'Panama', 10, 6106, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15198, 'The world''s most "neutral" country, famous for chocolate, watches, and vaults that don''t ask any questions.', '[]', 'Switzerland', 20, 6106, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15199, 'A tiny patch of coast where you need a yacht just to be considered "middle class" and income tax doesn''t exist.', '[]', 'Monaco', 30, 6106, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15200, 'The spiritual home of three-piece suits and zero taxes, with more registered companies than actual humans.', '[]', 'Cayman Islands', 40, 6106, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15201, 'This "Triangle" of luxury is where billionaires'' money goes to disappear from the view of the government.', '[]', 'Bermuda', 50, 6106, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15202, 'Can''t scale the summit? The famous peak of this country also looks great from a PLANE.', '[]', 'NEPAL', 10, 6107, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15203, 'It was worth all the PAINS to travel across the Pyrenees to reach this Mediterranean land of Flamenco and tapas.', '[]', 'SPAIN', 20, 6107, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15204, 'You could line up ANY ROW of postcards from this country and they''d still be filled with fjords and glaciers.', '[]', 'NORWAY', 30, 6107, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15205, 'This Mediterranean giant wears its historical REGALIA with pride, from its Saharan dunes to its Roman ruins.', '[]', 'ALGERIA', 40, 6107, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15206, 'Don''t need a precise ESTIMATOR to appreciate the rich marine life of this Southeast Asian nation.', '[]', 'EAST TIMOR', 50, 6107, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15207, 'A famous 1935 thought experiment where a creature''s existence is a 50/50 coin-flip between "alive" and "dead" until someone gets nosy and opens the lid.', '[]', 'Schrödinger’s Cat', 10, 6108, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15208, 'In 2008, this luxury car brand became a wholly owned subsidiary of Tata Motors.', '[]', 'Jaguar', 20, 6108, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15209, 'Released in the 80s, this rock anthem and the Rocky montage is probably a part of every gym playlist.', '[]', 'Eye of the Tiger', 30, 6108, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15210, 'A leaping predator brand built on pure German spite after a family feud over three stripes.', '[]', 'Puma', 40, 6108, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15211, 'A predator used in a common proverb to describe a person who is incapable of changing their core nature or past behavior, no matter how hard they try.', '[]', 'Leopard', 50, 6108, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15212, 'A man destroys Pakistan''s entire plumbing system using his bare hands just because his father-in-law was rude.', '[]', 'Gaddar', 10, 6109, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15213, 'England manages to suck at cricket even though it was literally the only country playing the sport professionally at the time.', '[]', 'Lagaan', 20, 6109, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15214, 'A 2.5-hour long wedding video featuring a family dog who is forced to play matchmaker.', '[]', 'Hum Aapke Hai Koun', 30, 6109, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15215, 'A young girl and her dead mother manipulate everyone into breaking a nice guy''s heart.', '[]', 'Kuch Kuch Hota Hai', 40, 6109, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15216, 'A man discovers he can successfully catfish his own spouse, proving that her entire memory of his identity is tethered to a single, two-inch strip of facial hair.', '[]', 'Rab Ne Bana Di Jodi', 50, 6109, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15217, 'Tucked inside my legal string like a hidden, secret key, 
Name my Middle Word and the City that first hosted me!', '[]', 'Vinay and Surendranagar', 10, 6110, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15302, 'Brahmastra', '[]', 'Ranbir Kapoor & Alia Bhatt', 10, 6127, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15174, 'Name the two players involved in the direct swap deal between the clubs in January 2018.', '[]', 'Alexis Sánchez and Henrikh Mkhitaryan', 30, 6101, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15218, 'To fund this life and my daily snack supply, 
I work for a Company—don''t even ask me why!
But what’s my Job Title? Those fancy words in my mail?
Tell me BOTH or your friendship logic is bound to fail!', '[]', 'Litera and Senior Product Owner', 20, 6110, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15219, 'If the world is ending and I’m glued to the TV,
Which Famous Series is the only one for me?
I’ve seen every episode, I know every line by heart,
Name this show to prove you’re actually ''Amoli-smart''!', '[]', 'The Office', 30, 6110, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15220, 'When my logic is crashing and I’m starting to get mad,
Which One Specific Food makes my stomach really glad?
It’s the ultimate ''hangry'' fix, the only meal I crave,
Guess this dish correctly if you want to be brave!', '[]', 'Chips/Pizza/Pasta/Dimsums', 40, 6110, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15221, 'I’m a master of logic, I’m technically right, 
But I still need a cuddle in the middle of the night!
My favorite fabric has a Steam Engine’s name, 
What is my Blanket called? It’s your ticket to fame!', '[]', 'Choo Choo', 50, 6110, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15222, 'The count before a rocket launch or a 5-second YouTube ad.', '[]', 'Countdown', 10, 6111, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15223, 'A mental collapse from stress or when your old car stops working.', '[]', 'Breakdown', 20, 6111, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15224, 'The corporate way to say everyone is fired to save money.', '[]', 'Downsizing', 30, 6111, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15225, 'When a website crashes or your productivity dies because of Instagram.', '[]', 'Downtime', 40, 6111, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15226, 'A high-stakes final battle between a hero and a villain.', '[]', 'Showdown', 50, 6111, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15227, 'The act of consuming food vs. the hot beverage you drink with your pinky up while judging people.', '[]', 'Eat / Tea', 10, 6112, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15228, 'The state of being overwhelmed by 2026 news cycles vs. the sugary treats you eat to feel better about it.', '[]', 'Stressed / Desserts', 20, 6112, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15229, 'The state of being alive vs. the ultimate state of moral corruption and bad vibes.', '[]', 'Live / Evil', 30, 6112, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15230, 'A component or piece of a whole vs. a high-stakes mechanism used to catch an animal.', '[]', 'Part / Trap', 40, 6112, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15231, 'A sliding box in your desk used for storage vs. the positive result you get for being "Technically Correct."', '[]', 'Drawer / Reward', 50, 6112, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15232, 'BONJOUR', '[]', 'French', 10, 6113, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15233, 'CIAO', '[]', 'Italian', 20, 6113, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15234, 'KONNICHIWA', '[]', 'Japanese', 30, 6113, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15235, 'ANNYEONG', '[]', 'Korean', 40, 6113, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15236, 'GUTEN TAG', '[]', 'German', 50, 6113, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15237, 'THE RED DIARY: "I was supposed to be a private notebook, but I was turned into a public script so a man could give his girlfriend to his best friend. Now my pages are just covered in tears and bad poetry."', '[]', 'Kal Ho Naa Ho', 10, 6114, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15238, 'THE TAXI DRIVER: "I was paid to drive them to Kolkata, but I ended up being a full-time consultant for an old man’s internal plumbing and the exact shade of his morning ''results''."', '[]', 'Piku', 20, 6114, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15239, 'THE BALLOT BOX: "I traveled deep into a forest where nobody wants to be, just to watch an honest government employee insist on counting pieces of paper for people who just wanted to eat lunch and not get shot by rebels."', '[]', 'Newton', 30, 6114, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15240, 'THE SERVANT: "I was just checking the fuse box in the basement, but the new daughter-in-law suddenly turned into a ninja to protect her secret radio."', '[]', 'Raazi', 40, 6114, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15241, 'THE GRAVEDIGGER: "I was just doing my job digging holes in the snow, until a man in a very long scarf started talking to a skull and singing about how his uncle is dating his mom. Total family drama, zero workplace safety."', '[]', 'Haider', 50, 6114, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15242, 'Just a giant metal A-frame that hasn''t been painted in years. Looks like a massive radio antenna that someone forgot to take down. Way too many stairs; I’ve seen better scaffolding at a construction site.', '[]', 'Eiffel Tower', 10, 6115, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15243, 'Total lack of interior design. Three giant limestone triangles in a sandbox. The previous tenants took all the gold and left the place empty for 4,000 years. Too much sun, zero shade.', '[]', 'Pyramids of Giza', 20, 6115, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15244, 'Absolute disaster for structural integrity. The architect clearly skipped the part about ''level ground.'' I spent the whole trip trying to hold the wall up for a photo and now I have a permanent neck cramp.', '[]', 'Leaning Tower of Pisa', 30, 6115, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15245, 'Way too much verticality. My ears popped three times in the elevator just to see some clouds and tiny cars. It''s basically just a giant needle sticking out of the sand. An over-engineered ego trip.', '[]', 'Burj Khalifa', 40, 6115, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15246, 'Drove for hours to see an unfinished DIY patio project. It’s just some heavy gray blocks in a circle in a field. No roof, no gift shop, and the ''mystical energy'' was just a cold breeze.', '[]', 'Stonehenge', 50, 6115, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15247, 'A video of a celebrity saying something they never said / The part of the pool where you realize you never learned to swim / What you take before a toxic argument', '[]', 'Deep (Deepfake, Deep end, Deep breath)', 10, 6116, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15248, 'What your date does the second you start catching feelings / A pepper so spicy it makes you hallucinate / The mysterious person who wrote that influencer''s autobiography', '[]', 'Ghost (Ghosting, Ghost pepper, Ghostwriter)', 20, 6116, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15249, 'A fake company used by billionaires to hide money / The traumatic state after a 14-hour shift / Things you "walk on" when avoiding a fight', '[]', 'Shell (Shell company, Shell-shocked, Eggshells)', 30, 6116, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15250, 'Three shots of tequila that make you think you can sing / Money you actually have in your hand / What people call honey when they want to charge $50', '[]', 'Liquid (Liquid courage, Liquid asset, Liquid gold)', 40, 6116, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15251, 'A protective bone structure that keeps your heart from getting squashed / A metal box to block Wi-Fi and tracking signals / An actor famous for screaming in every movie', '[]', 'Cage (Rib cage, Faraday cage, Nicolas Cage)', 50, 6116, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15252, 'A round meal in a square box, cut into triangles, and the primary cause of every internet argument about pineapple.', '[]', 'Pizza', 10, 6117, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15253, 'A bowl of Japanese liquid salt and noodles that costs $20 at a restaurant but 20 cents when you’re a broke college student.', '[]', 'Ramen', 20, 6117, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15254, 'Small rice pillows served with a "green paste" that is actually a chemical fire designed to clear your sinuses instantly.', '[]', 'Sushi', 30, 6117, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15255, 'A Belgian masterpiece that is basically a pancake with a "grid system" designed to hold as much syrup as possible.', '[]', 'Waffle', 40, 6117, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15256, 'A buttery, golden moon made of 90% air and 10% crumbs, designed specifically to ensure you wear flaky evidence on your shirt for the rest of the day.', '[]', 'Croissant', 50, 6117, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15303, 'Shershaah', '[]', 'Sidharth Malhotra & Kiara Advani', 20, 6127, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15304, 'Ram-Leela', '[]', 'Ranveer Singh & Deepika Padukone', 30, 6127, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15257, 'A barefoot founder who promised to "Elevate the World’s Consciousness" during office tequila parties. It was actually just a very broke landlord with cool chairs.', '[]', 'WeWork', 10, 6118, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15258, 'A founder with messy hair and cargo shorts who lived in a Bahamas penthouse. He "misplaced" $8 billion of customer crypto and is now serving 25 years in prison.', '[]', 'FTX', 20, 6118, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15259, 'These blue and yellow stores ruled the 90s with VHS tapes and late fees. They laughed at the chance to buy Netflix for $50 million and now they only have one store left.', '[]', 'Blockbuster', 30, 6118, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15260, 'A woman in a black turtleneck who spoke in a fake deep voice. She promised to test your blood with one drop, but her "Edison" machine was a $9 billion lie.', '[]', 'Theranos', 40, 6118, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15261, 'Influencers promised a luxury party on a private island. All the guests got were wet tents and a sad piece of cheese on bread in a foam box.', '[]', 'Fyre Festival', 50, 6118, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15262, 'A digital graveyard of DIY projects you will never start, recipes you will never cook, and a ''dream house'' that only exists in your 3:00 AM hallucinations.', '[]', 'Pinterest', 10, 6119, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15263, 'The world’s largest real estate empire that uses the smell of salty fries and a ''permanently broken'' frozen dessert machine as a legal front for its property holdings.', '[]', 'McDonald''s', 20, 6119, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15264, 'The only place on the internet that begs you for $3 once a year to save the world''s knowledge while you use it to finish a project.', '[]', 'Wikipedia', 30, 6119, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15265, 'A Swedish maze that sells furniture with names you can''t pronounce and where relationships die over a missing screw.', '[]', 'IKEA', 40, 6119, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15266, 'A service that tracks your emotional breakdowns for 12 months just to roast your ''embarrassing'' music taste in a colorful slideshow every December.', '[]', 'Spotify', 50, 6119, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15267, 'An "A" makes it a water vessel / An "O" makes it a piece of footwear.', '[]', 'Boat / Boot', 10, 6120, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15268, 'An "I" makes it a small piece of sharp metal / An "E" makes it the tool you use to sign a high-interest loan you’ll never pay back.', '[]', 'Pin / Pen', 20, 6120, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15269, 'An "I" is a piece of paper telling you exactly how much money you owe; an "A" is the round object people throw at each other in sports.', '[]', 'Bill / Ball', 30, 6120, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15270, 'An "I" is what a dog does to your face to be friendly / A "U" is the magical force you need to actually win this game.', '[]', 'Lick / Luck', 40, 6120, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15271, 'An "I" is what you do when you choose the best avocado; an "A" is what you do to your suitcase right before a flight you’re already late for.', '[]', 'Pick / Pack', 50, 6120, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15272, 'The punctuation mark that doubles as a relationship-ender when used at the end of a one-word text.', '[]', 'Full-stop', 10, 6121, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15273, 'A sweet buttery candy or the polite way to say the other F-word.', '[]', 'Fudge', 20, 6121, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15274, 'A snowy Japanese volcano you''ll never actually climb.', '[]', 'Fuji', 30, 6121, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15275, 'A loud pink color that is basically a visual scream.', '[]', 'Fuchsia', 40, 6121, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15276, 'The process of smashing atomic nuclei together, and the culinary excuse for putting Butter Chicken in a taco just to charge you $40 for ''the experience.''', '[]', 'Fusion', 50, 6121, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15277, 'THE OVERPRICED BACKUP: A freezing, oxygen-free "fixer-upper" that billionaires are obsessed with colonizing, even though it’s just a very dusty, red desert with zero Wi-Fi.', '[]', 'Mars', 10, 6122, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15278, 'THE UNFRIENDED: The original victim of a cancel culture. It was a member of the elite "Nine" until a group of nerds decided it was too tiny and kicked it out of the group chat.', '[]', 'Pluto', 20, 6122, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15279, 'THE NO-REFUND POLICY: The ultimate cosmic shredder. A gravitational glitch where light, time, and matter go to die. It’s a one-way trip with a 0% survival rate and zero refunds.', '[]', 'Black Hole', 30, 6122, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15280, 'THE COSMIC AUDIT: An uninvited "External Consultant" from the void that arrived at 40,000 mph, turned the planet''s lights off for a decade, and permanently fired every "employee" larger than a toaster.', '[]', 'Asteroid / Meteor', 50, 6122, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15281, 'THE COSMIC CATFISH: Named after the Goddess of Love and Beauty, but is actually a 900-degree acid-rain nightmare that will crush you and melt your skin instantly.', '[]', 'Venus', 40, 6122, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15282, 'Identify the movie', '[]', 'The Godfather', 10, 6123, '/objects/uploads/dc2039f1-b22d-47ab-9541-72fe38f39f6d', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15283, 'Identify the movie', '[]', 'Superbad', 50, 6123, '/objects/uploads/a1ac9024-215c-4051-aec8-9251584f7cc3', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15284, 'Identify the movie', '[]', 'Taxi Driver', 20, 6123, '/objects/uploads/064b3ebb-6c41-4d73-a473-66e8403acce0', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15285, 'Identify the movie', '[]', 'Pulp Fiction', 30, 6123, '/objects/uploads/d9684ffe-804c-424f-8897-1aaf933a1442', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15286, 'Identify the movie', '[]', 'Top Gun', 40, 6123, '/objects/uploads/7a47a049-c158-48a5-9c5c-6583a0e2b257', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15287, 'Identify the pop song', '[]', 'Dhoom Pichak Dhoom - Euphoria', 50, 6124, '/objects/uploads/e7544064-58b6-49f0-b9f0-2cd880d6bee0', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15288, 'Identify the pop song', '[]', 'Made in India - Alisha Chinai', 40, 6124, '/objects/uploads/986df7ce-1acf-4f18-bf0f-583e55a8351c', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15289, 'Identify the pop song', '[]', 'Aankhon Mein Tera Hi Chehra - Aryans', 30, 6124, '/objects/uploads/aa604f6e-4467-4ce9-a077-ecff943b9eb6', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15290, 'Identify the pop song', '[]', 'O Sanam - Lucky Ali', 20, 6124, '/objects/uploads/de5ee317-4373-4f0c-8a4e-5c1a36f12f8e', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15291, 'Identify the pop song', '[]', 'Tanha Dil - Shaan', 10, 6124, '/objects/uploads/d03e6b30-4ef3-490b-878f-f98d5a2de3c7', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15292, 'Dummy', '[]', 'Dummy', 10, 6125, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15293, 'Dummy', '[]', 'Dummy', 20, 6125, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15294, 'Dummy', '[]', 'Dummy', 30, 6125, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15295, 'Dummy', '[]', 'Dummy', 40, 6125, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15296, 'Dummy', '[]', 'Dummy', 50, 6125, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15297, 'You are fundamentally incapable of calculating the domestic and socio-religious valuation of approximately 0.5 grams of red lead tetroxide.', '[]', 'Ek chutki sindoor ki keemat tum kya jaano, Ramesh Babu', 10, 6126, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15298, 'While your portfolio of tangible assets is impressive, my current inventory includes the ongoing presence and emotional support of our biological maternal progenitor.', '[]', 'Mere paas maa hai', 20, 6126, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15299, 'My neurological system experiences a profound aversion to the saline lachrymal secretions currently exiting your ocular cavities.', '[]', 'Pushpa, I hate tears', 30, 6126, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15300, 'Within the established social and genealogical hierarchy, I occupy the primary paternal position relative to your current status. Refer to me as the Sovereign.', '[]', 'Rishte mein toh hum tumhare baap lagte hain, naam hai Shahenshah', 40, 6126, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15301, 'The eccentric villain has achieved a state of elevated endorphins.', '[]', 'Mogambo khush hua', 50, 6126, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15305, 'Kurbaan', '[]', 'Saif Ali Khan & Kareena Kapoor', 40, 6127, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15306, 'Fukrey', '[]', 'Ali Fazal & Richa Chadha', 50, 6127, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15307, 'My circular wrist ornaments have developed the ability to communicate verbally, and so have my bracelet.', '[]', 'Bole Chudiyan, Bole Kangana', 10, 6128, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15308, 'Proceed to apply a permanent saffron-colored pigment to my entire existence.', '[]', 'Rang De Tu Mohe Gerua', 20, 6128, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15311, 'The female individual has suffered a catastrophic loss of social standing, specifically for the benefit of your romantic interests.', '[]', 'Munni Badnaam Hui (Darling tere liye)', 50, 6128, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15312, 'Two-headed coin', '[]', 'Sholay', 10, 6129, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15314, 'Black-and-white checkered scarf', '[]', 'Ek Tha Tiger', 30, 6129, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15309, 'Darkly pigmented ocular protective lenses are aesthetically compatible with your fair-complexioned facial region.', '[]', 'Kala Chashma', 30, 6128, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15310, 'The residential property belonging to my spouse''s biological parents is comparable to a marigold flower.', '[]', 'Sasural Genda Phool', 40, 6128, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15313, 'October 2nd restaurant receipt', '[]', 'Drishyam', 20, 6129, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15315, 'Steel glass of water', '[]', 'Vivah', 40, 6129, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15316, 'Badge numbered 786', '[]', 'Coolie', 50, 6129, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15317, 'Crisis Management specialist with 70 minutes of intense motivational speaking experience. Successfully rebranded a team of 16 individuals who hated me into world champions just to fix my own PR disaster.', '[]', 'Kabir Khan (Chak De! India)', 10, 6130, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15318, 'Director of Peer Quality Control. Successfully implemented the ''P.H.A.T.'' (Pretty Hot And Tempting) assessment framework. Specialized in high-impact entrance strategies and recruiting high-value dates for family events.', '[]', 'Poo / Pooja (Kabhi Khushi Kabhie Gham)', 20, 6130, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15319, 'Innovation consultant with a ''Think Outside the Box'' philosophy. Expert in vacuum-assisted emergency medicine and unauthorized school administration. Successfully hacked a drone before it was cool.', '[]', 'Rancho / Phunsukh Wangdu (3 Idiots)', 30, 6130, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15320, 'Unorthodox Visual Artist and Philanthropist. Famous for high-concept paintings. Specialized in family-business restructuring and using theatrical performance groups to secure high-value matrimonial mergers.', '[]', 'Majnu Bhai (Welcome)', 40, 6130, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15321, 'Strategic Project Manager specializing in local talent recruitment. Successfully negotiated a three-year tax holiday for an entire village by winning a high-stakes athletic event against a multi-national firm.', '[]', 'Bhuvan (Lagaan)', 50, 6130, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15172, 'Which Arsenal academy player moved to Manchester United on Feb 1, 2025, for a tribunal fee over £1m?', '[]', 'Ayden Heaven', 10, 6101, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15175, 'Which player became the first player to move directly between the clubs in the Premier League era (2008)?', '[]', 'Mikaël Silvestre', 40, 6101, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.questions VALUES (15176, 'Which Argentine defender tried to force a move from United to Liverpool, with Arsenal rumored as a bystander, in 2007?', '[]', 'Gabriel Heinze', 50, 6101, NULL, NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: sequence_questions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sequence_questions VALUES (5, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence our digital history from "Checking on your ex" to "AI doing your homework"', 'Facebook', 'WhatsApp', 'Instagram', 'ChatGPT', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.077228');
INSERT INTO public.sequence_questions VALUES (6, 'd5458342-e771-4812-8174-2428a2b3efeb', 'If you dropped one gram of these in the dirt, which loss hurts your wallet the least to the most?', 'Silver', 'Saffron', 'Gold', 'Scavenged Moon Dust', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.163618');
INSERT INTO public.sequence_questions VALUES (7, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Arrange these "modern" essentials by which one actually has the oldest patent', 'Toilet Paper', 'The Telephone', 'The Lightbulb', 'Sliced Bread', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.168125');
INSERT INTO public.sequence_questions VALUES (8, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence these biological motors from a slow bass beat to a frantic drum-roll', 'Blue Whale', 'Human', 'House Cat', 'Hummingbird', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.18305');
INSERT INTO public.sequence_questions VALUES (9, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Which cinematic experience requires the least amount of bladder control to the most?', 'The Lion King', 'Animal', 'Sholay', 'Justice League (Snyder Cut)', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.19716');
INSERT INTO public.sequence_questions VALUES (10, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence these corporate giants from the "Ancient History" 1800s to the 1970s "New Guard"', 'Nintendo', 'Samsung', 'Sony', 'Apple', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.201292');
INSERT INTO public.sequence_questions VALUES (11, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Travel across the globe starting from the Land of the Rising Sun and ending in the Big Apple', 'Tokyo', 'Mumbai', 'London', 'New York', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.204836');
INSERT INTO public.sequence_questions VALUES (12, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Which of these will surrender to the sun and melt from the lowest to the highest temperature?', 'Mercury', 'An Ice Cube', 'A Chocolate Bar', 'A Diamond', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.208396');
INSERT INTO public.sequence_questions VALUES (13, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Arrange these world powers by when their "Death Certificate" was officially signed, oldest to newest', 'The Roman Empire', 'The Mughal Empire', 'The British Raj', 'The USSR', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.212798');
INSERT INTO public.sequence_questions VALUES (14, 'd5458342-e771-4812-8174-2428a2b3efeb', 'From "High-Speed Racer" to "I take 248 years to do one lap," sequence these planetary orbits', 'Mercury', 'Earth', 'Jupiter', 'Pluto', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.216514');
INSERT INTO public.sequence_questions VALUES (15, 'd5458342-e771-4812-8174-2428a2b3efeb', 'If you tried to fit these inside each other, which order goes from "Pocket Sized" to "Planet Sized"?', 'An Avocado', 'An Elephant', 'Mount Everest', 'The Moon', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.219951');
INSERT INTO public.sequence_questions VALUES (16, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence these words by how many vowels they are hoarding, from "Vowel-Poor" to "Vowel-Rich"', 'Rhythm', 'Logic', 'Avocado', 'Queueing', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.223877');
INSERT INTO public.sequence_questions VALUES (17, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Which architectural ego-trip was finished and opened to the public from first to last?', 'Pyramids of Giza', 'Great Wall of China', 'Taj Mahal', 'Burj Khalifa', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.227602');
INSERT INTO public.sequence_questions VALUES (18, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence these by how fast they will make you call for medical help, from "Weak" to "Nuclear"', 'Bell Pepper', 'Sriracha', 'Jalapeño', 'Ghost Pepper', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.230999');
INSERT INTO public.sequence_questions VALUES (19, 'd5458342-e771-4812-8174-2428a2b3efeb', 'From a slow crawl to the absolute speed limit of the universe, sequence these velocities', 'A Garden Snail', 'A Boeing 747', 'The Speed of Sound', 'Light', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.234081');
INSERT INTO public.sequence_questions VALUES (20, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Which era of human logic was initialized from the earliest to the most recent?', 'The Stone Age', 'The Industrial Revolution', 'The Digital Age', 'The Age of AI', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.237535');
INSERT INTO public.sequence_questions VALUES (21, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence these by how many holiday photos they can store, from "Tiny" to "Terrifying"', 'Kilobyte', 'Megabyte', 'Gigabyte', 'Terabyte', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.250564');
INSERT INTO public.sequence_questions VALUES (22, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Which "womb lease" lasts from the shortest time to the longest time?', 'House Cat', 'Human', 'Blue Whale', 'African Elephant', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.254281');
INSERT INTO public.sequence_questions VALUES (23, 'd5458342-e771-4812-8174-2428a2b3efeb', 'Sequence these by who has the least amount of "F-U Money" to the absolute most', 'A successful Surgeon', 'Taylor Swift', 'Elon Musk', 'The US National Debt', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.259748');
INSERT INTO public.sequence_questions VALUES (24, 'd5458342-e771-4812-8174-2428a2b3efeb', 'From "First Steps" to "First Tweet," sequence these human milestones in order', 'Controlled Fire', 'The Printing Press', 'The Internet', 'ChatGPT', '["A", "B", "C", "D"]', NULL, true, '2026-01-31 16:45:29.263903');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('b2f89b95-0293-44be-8f3c-d021cfeb907f', 'test@example.com', 'Test', 'User', '2026-01-11 08:04:43.696553', '2026-01-11 08:04:43.696553', '$2b$10$44wY4rjYhf0XtyDDtE2iyOBfLTKirnn0j5.MPzurn8WnTIHxS0Ifu', 'host');
INSERT INTO public.users VALUES ('d5458342-e771-4812-8174-2428a2b3efeb', 'amoli.bhatt@gmail.com', 'Amoli', 'Bhatt', '2026-01-11 09:31:29.950448', '2026-01-11 09:31:29.950448', '$2b$10$HOs61RuWc.Zyz.SrRfNoROj28Kcr1L2UmJC78w28RQNASr/SOOMQG', 'super_admin');
INSERT INTO public.users VALUES ('c4cf612e-6553-4490-b973-0db1492946d3', 'varunbsood@gmail.com', 'Varun', 'Sood', '2026-01-22 10:54:04.76752', '2026-01-22 10:54:04.76752', '$2b$10$EiG4KpN7k6XZo4FCrIEz6eLcCM68e0BcT68aEIyOy0.NQtMUU5wxu', 'host');


--
-- Name: board_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.board_categories_id_seq', 3681, true);


--
-- Name: boards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.boards_id_seq', 1583, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 6130, true);


--
-- Name: game_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.game_types_id_seq', 6, true);


--
-- Name: psyop_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.psyop_questions_id_seq', 3, true);


--
-- Name: questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.questions_id_seq', 15321, true);


--
-- Name: sequence_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sequence_questions_id_seq', 24, true);


--
-- PostgreSQL database dump complete
--

\unrestrict y4QbgWsYYUFKjsYbL4v8tc9p98gMnOlCsGtjBWNqXPJJ0PUHetCzBUz5XQQryxh

