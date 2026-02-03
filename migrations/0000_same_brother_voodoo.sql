CREATE TABLE "admin_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"category" text DEFAULT 'achievement' NOT NULL,
	"game_slug" text,
	"requirement" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "board_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "board_categories_board_id_category_id_unique" UNIQUE("board_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"description" text,
	"point_values" jsonb DEFAULT '[10,20,30,40,50]'::jsonb NOT NULL,
	"theme" text DEFAULT 'birthday' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"color_code" text DEFAULT '#6366f1',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_starter_pack" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"moderation_status" text DEFAULT 'approved',
	"moderated_by" text,
	"moderated_at" timestamp,
	"flag_reason" text
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rule" text,
	"image_url" text NOT NULL,
	"source_group" text,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "double_dip_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"daily_set_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"answer_text" text NOT NULL,
	"prediction" text,
	"is_time_capsule" boolean DEFAULT false NOT NULL,
	"unlock_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "double_dip_answers_daily_set_id_question_id_user_id_unique" UNIQUE("daily_set_id","question_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "double_dip_daily_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair_id" integer NOT NULL,
	"date_key" text NOT NULL,
	"question_ids" jsonb NOT NULL,
	"user_a_completed" boolean DEFAULT false NOT NULL,
	"user_b_completed" boolean DEFAULT false NOT NULL,
	"revealed" boolean DEFAULT false NOT NULL,
	"followup_task" text,
	"category_insights" jsonb,
	"weekly_stake_scored" boolean DEFAULT false NOT NULL,
	"first_completer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "double_dip_daily_sets_pair_id_date_key_unique" UNIQUE("pair_id","date_key")
);
--> statement-breakpoint
CREATE TABLE "double_dip_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair_id" integer NOT NULL,
	"answer_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "double_dip_favorites_answer_id_user_id_unique" UNIQUE("answer_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "double_dip_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"value" integer,
	"daily_set_id" integer,
	"answer_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "double_dip_pairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_a_id" text NOT NULL,
	"user_b_id" text,
	"invite_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_completed_date" text,
	"anniversary_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "double_dip_pairs_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "double_dip_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"question_text" text NOT NULL,
	"question_type" text DEFAULT 'open_ended' NOT NULL,
	"options" jsonb,
	"is_future_locked" boolean DEFAULT false NOT NULL,
	"unlock_after_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "double_dip_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"answer_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "double_dip_reactions_answer_id_user_id_unique" UNIQUE("answer_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "double_dip_weekly_stakes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair_id" integer NOT NULL,
	"week_start_date" text NOT NULL,
	"stake_id" text NOT NULL,
	"user_a_score" integer DEFAULT 0 NOT NULL,
	"user_b_score" integer DEFAULT 0 NOT NULL,
	"winner_id" text,
	"is_revealed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "double_dip_weekly_stakes_pair_id_week_start_date_unique" UNIQUE("pair_id","week_start_date")
);
--> statement-breakpoint
CREATE TABLE "game_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"board_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "game_boards_game_id_board_id_unique" UNIQUE("game_id","board_id")
);
--> statement-breakpoint
CREATE TABLE "game_decks" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"deck_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "game_decks_game_id_deck_id_unique" UNIQUE("game_id","deck_id")
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"host_id" text NOT NULL,
	"game_id" integer,
	"current_board_id" integer,
	"current_mode" text DEFAULT 'board',
	"state" text DEFAULT 'waiting' NOT NULL,
	"buzzer_locked" boolean DEFAULT true NOT NULL,
	"played_category_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_sessions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "game_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'gamepad' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"host_enabled" boolean DEFAULT true NOT NULL,
	"player_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"mode" text DEFAULT 'jeopardy' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heads_up_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"deck_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"hints" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "heads_up_decks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"timer_seconds" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"image_url" text NOT NULL,
	"caption" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_starter_pack" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"name" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"hand" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_starter_pack" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"prompt_id" integer NOT NULL,
	"status" text DEFAULT 'selecting' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_code" text NOT NULL,
	"host_id" text NOT NULL,
	"status" text DEFAULT 'lobby' NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"total_rounds" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meme_sessions_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "meme_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"image_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meme_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"voter_id" integer NOT NULL,
	"submission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meme_votes_round_id_voter_id_unique" UNIQUE("round_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_game_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_slug" text NOT NULL,
	"session_code" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"placement" integer,
	"player_count" integer DEFAULT 1 NOT NULL,
	"played_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_game_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"game_slug" text NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"highest_score" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_game_stats_user_id_game_slug_unique" UNIQUE("user_id","game_slug")
);
--> statement-breakpoint
CREATE TABLE "psyop_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"fact_text" text NOT NULL,
	"correct_answer" text NOT NULL,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_starter_pack" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "psyop_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"status" text DEFAULT 'submitting' NOT NULL,
	"submission_deadline" timestamp,
	"voting_deadline" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "psyop_rounds_session_id_round_number_unique" UNIQUE("session_id","round_number")
);
--> statement-breakpoint
CREATE TABLE "psyop_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"room_code" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"timer_seconds" integer DEFAULT 30 NOT NULL,
	"current_round_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "psyop_sessions_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "psyop_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"player_avatar" text,
	"lie_text" text NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "psyop_submissions_round_id_player_id_unique" UNIQUE("round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "psyop_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"voter_id" text NOT NULL,
	"voter_name" text NOT NULL,
	"voted_for_id" integer,
	"voted_for_truth" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "psyop_votes_round_id_voter_id_unique" UNIQUE("round_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"points" integer NOT NULL,
	"image_url" text,
	"audio_url" text,
	"video_url" text,
	"answer_image_url" text,
	"answer_audio_url" text,
	"answer_video_url" text
);
--> statement-breakpoint
CREATE TABLE "sequence_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"question" text NOT NULL,
	"option_a" text NOT NULL,
	"option_b" text NOT NULL,
	"option_c" text NOT NULL,
	"option_d" text NOT NULL,
	"correct_order" jsonb NOT NULL,
	"hint" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_starter_pack" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequence_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"room_code" text NOT NULL,
	"question_id" integer,
	"status" text DEFAULT 'waiting' NOT NULL,
	"started_at" timestamp,
	"reveal_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sequence_sessions_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "sequence_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"player_id" text NOT NULL,
	"player_name" text NOT NULL,
	"player_avatar" text,
	"sequence" jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"time_ms" integer NOT NULL,
	"is_correct" boolean,
	CONSTRAINT "sequence_submissions_session_id_player_id_unique" UNIQUE("session_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "session_completed_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answered_by_player_id" text,
	"points_awarded" integer DEFAULT 0,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_completed_questions_session_id_question_id_unique" UNIQUE("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "session_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"player_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"avatar" text DEFAULT 'cat' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"is_connected" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_players_session_id_player_id_unique" UNIQUE("session_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "time_warp_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"image_url" text NOT NULL,
	"era" text NOT NULL,
	"answer" text NOT NULL,
	"hint" text,
	"category" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_starter_pack" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_unique" UNIQUE("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"razorpay_order_id" varchar NOT NULL,
	"razorpay_payment_id" varchar,
	"razorpay_signature" varchar,
	"amount" integer NOT NULL,
	"currency" varchar DEFAULT 'INR' NOT NULL,
	"status" varchar DEFAULT 'created' NOT NULL,
	"plan" varchar NOT NULL,
	"description" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"role" varchar DEFAULT 'host' NOT NULL,
	"subscription_plan" varchar DEFAULT 'free' NOT NULL,
	"subscription_status" varchar DEFAULT 'active' NOT NULL,
	"razorpay_customer_id" varchar,
	"razorpay_subscription_id" varchar,
	"subscription_expires_at" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "idx_answers_daily_set" ON "double_dip_answers" USING btree ("daily_set_id");--> statement-breakpoint
CREATE INDEX "idx_answers_user" ON "double_dip_answers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_daily_sets_pair" ON "double_dip_daily_sets" USING btree ("pair_id");--> statement-breakpoint
CREATE INDEX "idx_daily_sets_date" ON "double_dip_daily_sets" USING btree ("date_key");--> statement-breakpoint
CREATE INDEX "idx_favorites_pair" ON "double_dip_favorites" USING btree ("pair_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_pair" ON "double_dip_milestones" USING btree ("pair_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_type" ON "double_dip_milestones" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_pairs_user_a" ON "double_dip_pairs" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX "idx_pairs_user_b" ON "double_dip_pairs" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX "idx_pairs_status" ON "double_dip_pairs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reactions_answer" ON "double_dip_reactions" USING btree ("answer_id");--> statement-breakpoint
CREATE INDEX "idx_weekly_stakes_pair" ON "double_dip_weekly_stakes" USING btree ("pair_id");--> statement-breakpoint
CREATE INDEX "idx_meme_images_user" ON "meme_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_meme_players_session" ON "meme_players" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_meme_prompts_user" ON "meme_prompts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_meme_rounds_session" ON "meme_rounds" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_meme_sessions_code" ON "meme_sessions" USING btree ("room_code");--> statement-breakpoint
CREATE INDEX "idx_meme_submissions_round" ON "meme_submissions" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_meme_votes_round" ON "meme_votes" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_player_history_user" ON "player_game_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_player_history_game" ON "player_game_history" USING btree ("game_slug");--> statement-breakpoint
CREATE INDEX "idx_player_stats_user" ON "player_game_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_player_stats_game" ON "player_game_stats" USING btree ("game_slug");--> statement-breakpoint
CREATE INDEX "idx_psyop_rounds_session" ON "psyop_rounds" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_psyop_submissions_round" ON "psyop_submissions" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_psyop_votes_round" ON "psyop_votes" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_session" ON "sequence_submissions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_players_user" ON "session_players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_time_warp_user" ON "time_warp_questions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_time_warp_era" ON "time_warp_questions" USING btree ("era");--> statement-breakpoint
CREATE INDEX "idx_user_badges_user" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_user" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_order" ON "payments" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");