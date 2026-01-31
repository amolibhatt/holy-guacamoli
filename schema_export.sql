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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: board_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_categories (
    id integer NOT NULL,
    board_id integer NOT NULL,
    category_id integer NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


--
-- Name: board_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.board_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: board_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.board_categories_id_seq OWNED BY public.board_categories.id;


--
-- Name: boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boards (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    point_values jsonb DEFAULT '[10, 20, 30, 40, 50]'::jsonb NOT NULL,
    user_id text,
    theme text DEFAULT 'birthday'::text NOT NULL,
    visibility text DEFAULT 'private'::text NOT NULL,
    is_global boolean DEFAULT false NOT NULL,
    color_code text DEFAULT '#6366f1'::text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_starter_pack boolean DEFAULT false NOT NULL
);


--
-- Name: boards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boards_id_seq OWNED BY public.boards.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    image_url text NOT NULL,
    source_group text,
    is_active boolean DEFAULT false NOT NULL,
    rule text
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: game_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.game_types (
    id integer NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    description text,
    icon text DEFAULT 'gamepad'::text NOT NULL,
    host_enabled boolean DEFAULT true NOT NULL,
    player_enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL
);


--
-- Name: game_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.game_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: game_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.game_types_id_seq OWNED BY public.game_types.id;


--
-- Name: psyop_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.psyop_questions (
    id integer NOT NULL,
    user_id text,
    fact_text text NOT NULL,
    correct_answer text NOT NULL,
    category text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: psyop_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.psyop_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: psyop_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.psyop_questions_id_seq OWNED BY public.psyop_questions.id;


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id integer NOT NULL,
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer text NOT NULL,
    points integer NOT NULL,
    category_id integer NOT NULL,
    image_url text,
    audio_url text,
    video_url text,
    answer_image_url text,
    answer_audio_url text,
    answer_video_url text
);


--
-- Name: questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.questions_id_seq OWNED BY public.questions.id;


--
-- Name: sequence_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequence_questions (
    id integer NOT NULL,
    user_id text,
    question text NOT NULL,
    option_a text NOT NULL,
    option_b text NOT NULL,
    option_c text NOT NULL,
    option_d text NOT NULL,
    correct_order jsonb NOT NULL,
    hint text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: sequence_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sequence_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sequence_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sequence_questions_id_seq OWNED BY public.sequence_questions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    password character varying NOT NULL,
    role character varying DEFAULT 'host'::character varying NOT NULL
);


--
-- Name: board_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_categories ALTER COLUMN id SET DEFAULT nextval('public.board_categories_id_seq'::regclass);


--
-- Name: boards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards ALTER COLUMN id SET DEFAULT nextval('public.boards_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: game_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_types ALTER COLUMN id SET DEFAULT nextval('public.game_types_id_seq'::regclass);


--
-- Name: psyop_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psyop_questions ALTER COLUMN id SET DEFAULT nextval('public.psyop_questions_id_seq'::regclass);


--
-- Name: questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions ALTER COLUMN id SET DEFAULT nextval('public.questions_id_seq'::regclass);


--
-- Name: sequence_questions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_questions ALTER COLUMN id SET DEFAULT nextval('public.sequence_questions_id_seq'::regclass);


--
-- Name: board_categories board_categories_board_id_category_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_categories
    ADD CONSTRAINT board_categories_board_id_category_id_unique UNIQUE (board_id, category_id);


--
-- Name: board_categories board_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_categories
    ADD CONSTRAINT board_categories_pkey PRIMARY KEY (id);


--
-- Name: boards boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: game_types game_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_types
    ADD CONSTRAINT game_types_pkey PRIMARY KEY (id);


--
-- Name: game_types game_types_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.game_types
    ADD CONSTRAINT game_types_slug_unique UNIQUE (slug);


--
-- Name: psyop_questions psyop_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.psyop_questions
    ADD CONSTRAINT psyop_questions_pkey PRIMARY KEY (id);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: sequence_questions sequence_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_questions
    ADD CONSTRAINT sequence_questions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--


