--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Homebrew)
-- Dumped by pg_dump version 14.17 (Homebrew)

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
-- Name: clothes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clothes (
    clothid integer NOT NULL,
    description text NOT NULL,
    color text NOT NULL,
    brand text,
    size text,
    material text
);


--
-- Name: clothes_clothid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clothes_clothid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clothes_clothid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clothes_clothid_seq OWNED BY public.clothes.clothid;


--
-- Name: user_clothes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_clothes (
    id integer NOT NULL,
    userid integer,
    clothid integer
);


--
-- Name: user_clothes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_clothes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_clothes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_clothes_id_seq OWNED BY public.user_clothes.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    userid integer NOT NULL,
    name text NOT NULL,
    surname text NOT NULL
);


--
-- Name: users_userid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_userid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_userid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_userid_seq OWNED BY public.users.userid;


--
-- Name: clothes clothid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clothes ALTER COLUMN clothid SET DEFAULT nextval('public.clothes_clothid_seq'::regclass);


--
-- Name: user_clothes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clothes ALTER COLUMN id SET DEFAULT nextval('public.user_clothes_id_seq'::regclass);


--
-- Name: users userid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN userid SET DEFAULT nextval('public.users_userid_seq'::regclass);


--
-- Data for Name: clothes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clothes (clothid, description, color, brand, size, material) FROM stdin;
1	T-Shirt	Red	Nike	M	Cotton
2	Jeans	Blue	Levis	32	Denim
3	Jacket	Black	Adidas	L	Polyester
4	Sweater	Green	Uniqlo	M	Wool
5	Hat	Black	Puma	One Size	Cotton
6	Scarf	Red	Gucci	One Size	Silk
7	Shoes	White	Adidas	9	Leather
8	Socks	Gray	HM	M	Cotton
9	Sneakers	White	Nike	10	Leather
10	Shorts	Black	Zara	M	Polyester
\.


--
-- Data for Name: user_clothes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_clothes (id, userid, clothid) FROM stdin;
5	3	5
6	3	6
7	4	7
8	4	8
9	5	9
181	3	1
347	1	4
356	5	10
201	2	5
42	3	2
44	3	3
268	2	6
269	4	6
272	4	5
216	2	4
283	2	7
284	2	8
287	1	1
288	1	2
290	1	3
322	5	8
324	5	7
329	4	10
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (userid, name, surname) FROM stdin;
1	John	Doe
2	Jane	Smith
3	Alice	Johnson
4	Bob	Brown
5	Charlie	Williams
\.


--
-- Name: clothes_clothid_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clothes_clothid_seq', 10, true);


--
-- Name: user_clothes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_clothes_id_seq', 356, true);


--
-- Name: users_userid_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_userid_seq', 36, true);


--
-- Name: clothes clothes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clothes
    ADD CONSTRAINT clothes_pkey PRIMARY KEY (clothid);


--
-- Name: user_clothes user_clothes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clothes
    ADD CONSTRAINT user_clothes_pkey PRIMARY KEY (id);


--
-- Name: user_clothes user_clothes_userid_clothid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clothes
    ADD CONSTRAINT user_clothes_userid_clothid_key UNIQUE (userid, clothid);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (userid);


--
-- Name: user_clothes user_clothes_clothid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clothes
    ADD CONSTRAINT user_clothes_clothid_fkey FOREIGN KEY (clothid) REFERENCES public.clothes(clothid);


--
-- Name: user_clothes user_clothes_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clothes
    ADD CONSTRAINT user_clothes_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(userid);


--
-- PostgreSQL database dump complete
--

