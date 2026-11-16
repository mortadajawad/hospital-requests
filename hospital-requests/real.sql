--
-- PostgreSQL database dump
--

\restrict yhmThcayushRhBtBncG8APpZqK2Kb4dk6stYsbvU6aT2ieXjz4W8fOgYinsT7IN

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg13+2)

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
-- Name: Priority; Type: TYPE; Schema: public; Owner: hospital
--

CREATE TYPE public."Priority" AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."Priority" OWNER TO hospital;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: hospital
--

CREATE TYPE public."Role" AS ENUM (
    'REQUESTER',
    'STAFF',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO hospital;

--
-- Name: Status; Type: TYPE; Schema: public; Owner: hospital
--

CREATE TYPE public."Status" AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'WAITING',
    'DONE',
    'CANCELLED'
);


ALTER TYPE public."Status" OWNER TO hospital;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."ActivityLog" (
    id integer NOT NULL,
    action text NOT NULL,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestId" integer,
    "userId" integer NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO hospital;

--
-- Name: ActivityLog_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."ActivityLog_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActivityLog_id_seq" OWNER TO hospital;

--
-- Name: ActivityLog_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."ActivityLog_id_seq" OWNED BY public."ActivityLog".id;


--
-- Name: Attachment; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."Attachment" (
    id integer NOT NULL,
    filename text NOT NULL,
    path text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestId" integer NOT NULL,
    "uploaderId" integer NOT NULL
);


ALTER TABLE public."Attachment" OWNER TO hospital;

--
-- Name: Attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."Attachment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Attachment_id_seq" OWNER TO hospital;

--
-- Name: Attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."Attachment_id_seq" OWNED BY public."Attachment".id;


--
-- Name: Category; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Category" OWNER TO hospital;

--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Category_id_seq" OWNER TO hospital;

--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."Comment" (
    id integer NOT NULL,
    text text NOT NULL,
    internal boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "requestId" integer NOT NULL,
    "authorId" integer NOT NULL
);


ALTER TABLE public."Comment" OWNER TO hospital;

--
-- Name: Comment_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."Comment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Comment_id_seq" OWNER TO hospital;

--
-- Name: Comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."Comment_id_seq" OWNED BY public."Comment".id;


--
-- Name: Department; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."Department" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Department" OWNER TO hospital;

--
-- Name: Department_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."Department_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Department_id_seq" OWNER TO hospital;

--
-- Name: Department_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."Department_id_seq" OWNED BY public."Department".id;


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."Notification" (
    id integer NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer NOT NULL
);


ALTER TABLE public."Notification" OWNER TO hospital;

--
-- Name: Notification_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."Notification_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Notification_id_seq" OWNER TO hospital;

--
-- Name: Notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."Notification_id_seq" OWNED BY public."Notification".id;


--
-- Name: Request; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."Request" (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status public."Status" DEFAULT 'NEW'::public."Status" NOT NULL,
    priority public."Priority" DEFAULT 'NORMAL'::public."Priority" NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "firstResponseAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "requesterId" integer NOT NULL,
    "assigneeId" integer,
    "departmentId" integer NOT NULL,
    "categoryId" integer NOT NULL
);


ALTER TABLE public."Request" OWNER TO hospital;

--
-- Name: Request_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."Request_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Request_id_seq" OWNER TO hospital;

--
-- Name: Request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."Request_id_seq" OWNED BY public."Request".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" DEFAULT 'REQUESTER'::public."Role" NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "departmentId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO hospital;

--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: hospital
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO hospital;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: hospital
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _StaffCategories; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public."_StaffCategories" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_StaffCategories" OWNER TO hospital;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: hospital
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO hospital;

--
-- Name: ActivityLog id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."ActivityLog" ALTER COLUMN id SET DEFAULT nextval('public."ActivityLog_id_seq"'::regclass);


--
-- Name: Attachment id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Attachment" ALTER COLUMN id SET DEFAULT nextval('public."Attachment_id_seq"'::regclass);


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: Comment id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Comment" ALTER COLUMN id SET DEFAULT nextval('public."Comment_id_seq"'::regclass);


--
-- Name: Department id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Department" ALTER COLUMN id SET DEFAULT nextval('public."Department_id_seq"'::regclass);


--
-- Name: Notification id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Notification" ALTER COLUMN id SET DEFAULT nextval('public."Notification_id_seq"'::regclass);


--
-- Name: Request id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Request" ALTER COLUMN id SET DEFAULT nextval('public."Request_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."ActivityLog" (id, action, details, "createdAt", "requestId", "userId") FROM stdin;
1	CREATED	\N	2026-11-05 23:01:37.975	1	1
2	UPDATED	{"status": ["NEW", "IN_PROGRESS"]}	2026-11-07 20:56:54.757	1	1
3	COMMENTED	\N	2026-11-07 20:57:13.221	1	1
4	CREATED	\N	2026-11-07 20:58:08.897	2	1
5	UPDATED	{"status": ["IN_PROGRESS", "WAITING"]}	2026-11-07 21:22:00.308	1	1
6	UPDATED	{"status": ["WAITING", "DONE"]}	2026-11-07 21:22:10.359	1	1
7	CREATED	\N	2026-11-07 22:37:24.485	3	1
8	UPDATED	{"status": ["NEW", "IN_PROGRESS"]}	2026-11-07 22:38:04.098	3	1
9	UPDATED	{"status": ["IN_PROGRESS", "DONE"]}	2026-11-07 22:38:23.65	3	1
10	UPDATED	{"assigneeId": [null, 1]}	2026-11-07 22:38:26.858	3	1
11	COMMENTED	\N	2026-11-07 22:38:33.919	3	1
12	CREATED	\N	2026-11-08 16:20:03.05	4	2
13	CREATED	\N	2026-11-08 17:21:54.113	5	2
14	UPDATED	{"status": ["NEW", "IN_PROGRESS"]}	2026-11-08 17:22:17.053	5	4
15	COMMENTED	\N	2026-11-08 17:24:21.193	5	4
16	UPDATED	{"status": ["IN_PROGRESS", "DONE"]}	2026-11-08 17:25:08.548	5	4
17	COMMENTED	\N	2026-11-08 17:25:30.803	5	4
18	UPDATED	{"assigneeId": [null, 4]}	2026-11-08 17:25:36.692	5	4
19	UPDATED	{"assigneeId": [null, 5]}	2026-11-08 17:35:02.672	4	1
\.


--
-- Data for Name: Attachment; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."Attachment" (id, filename, path, "createdAt", "requestId", "uploaderId") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."Category" (id, name) FROM stdin;
1	Equipment
2	IT Support
3	Supplies
4	Maintenance
5	Scheduling
6	Other
7	System Support
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."Comment" (id, text, internal, "createdAt", "requestId", "authorId") FROM stdin;
1	internal note	f	2026-11-07 20:57:13.208	1	1
2	it's done.	f	2026-11-07 22:38:33.908	3	1
3	we will attend as soon as possible to check the problem	f	2026-11-08 17:24:21.154	5	4
4	its done by 'user name'	f	2026-11-08 17:25:30.789	5	4
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."Department" (id, name) FROM stdin;
1	Laboratory
2	Radiology
3	Pharmacy
4	Emergency
5	Maintenance
6	IT
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."Notification" (id, message, read, "createdAt", "userId") FROM stdin;
1	New request #1: Broken printer	f	2026-11-05 23:01:38.019	1
2	Request #1 is now IN PROGRESS	f	2026-11-07 20:56:54.777	1
3	New request #2: new request	f	2026-11-07 20:58:08.906	1
4	Request #1 is now WAITING	f	2026-11-07 21:22:00.323	1
5	Request #1 is now DONE	f	2026-11-07 21:22:10.365	1
6	New request #3: error in printer label	f	2026-11-07 22:37:24.495	1
7	Request #3 is now IN PROGRESS	f	2026-11-07 22:38:04.103	1
8	Request #3 is now DONE	f	2026-11-07 22:38:23.66	1
9	New request #4: er door is locked	f	2026-11-08 16:20:03.063	1
10	New request #4: er door is locked	f	2026-11-08 16:20:03.063	4
11	New request #5: problem in the phone	f	2026-11-08 17:21:54.138	1
12	New request #5: problem in the phone	f	2026-11-08 17:21:54.138	4
13	Request #5 is now IN PROGRESS	f	2026-11-08 17:22:17.061	2
14	New comment on request #5	f	2026-11-08 17:24:21.199	2
15	Request #5 is now DONE	f	2026-11-08 17:25:08.556	2
16	New comment on request #5	f	2026-11-08 17:25:30.806	2
17	Request #4 was assigned to you: er door is locked	f	2026-11-08 17:35:02.683	5
\.


--
-- Data for Name: Request; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."Request" (id, title, description, status, priority, "dueDate", "createdAt", "updatedAt", "firstResponseAt", "closedAt", "requesterId", "assigneeId", "departmentId", "categoryId") FROM stdin;
2	new request	123	NEW	NORMAL	2026-11-07 00:00:00	2026-11-07 20:58:08.873	2026-11-07 20:58:08.873	\N	\N	1	\N	6	2
1	Broken printer	Printer in ward 3 is not working	DONE	HIGH	\N	2026-11-05 23:01:37.887	2026-11-07 21:22:10.345	2026-11-07 20:56:53.117	2026-11-07 21:22:10.342	1	\N	1	1
3	error in printer label	there is an error in printer label	DONE	HIGH	2026-11-08 00:00:00	2026-11-07 22:37:24.387	2026-11-07 22:38:26.847	2026-11-07 22:38:04.082	2026-11-07 22:38:23.623	1	1	1	2
5	problem in the phone	there is no sound	DONE	HIGH	\N	2026-11-08 17:21:54.005	2026-11-08 17:25:36.667	2026-11-08 17:22:17.033	2026-11-08 17:25:08.526	2	4	4	2
4	er door is locked	locked door number 4	NEW	NORMAL	2026-11-08 00:00:00	2026-11-08 16:20:02.986	2026-11-08 17:35:02.652	2026-11-08 17:35:02.647	\N	2	5	4	4
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."User" (id, name, email, "passwordHash", role, active, "departmentId", "createdAt") FROM stdin;
1	System Admin	admin@hospital.local	$2a$12$Wncq.MTS8crUivDbSxynTuQIAfOCsQGSC8ti.PggwDtSPyWfzD.oy	ADMIN	t	\N	2026-11-05 22:45:27.599
2	Emergency	er@hospital.local	$2a$12$T0oVzHwGtEBgqmwZHLwGs.J.zeQ31KUhfD5KwANunsVI/hDGOKw/2	REQUESTER	t	4	2026-11-07 21:35:54.866
4	IT	it@hospital.local	$2a$12$aV7pfDku3oD7MAJNU7.aoOO3ZpvYd7DB74kKJ./v1Z.y7MlDpgRHa	STAFF	t	6	2026-11-08 16:17:25.29
5	maintenance	maintenance@hospital.local	$2a$12$QMnUpybJdqsSM3AFAoUF9OqztQXjuja5WsDg4kLOD5eLOd4UiQznC	STAFF	t	5	2026-11-08 17:31:16.798
6	test	test@hospital.local	$2a$12$rUARmjyzvrMtWc8o9NlhSeJoVRU5HZ/KJRVf4yu9TqlU9fKTGNwgW	REQUESTER	f	\N	2026-11-08 17:37:11.37
\.


--
-- Data for Name: _StaffCategories; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public."_StaffCategories" ("A", "B") FROM stdin;
2	4
4	5
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: hospital
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
38d6cbb1-bf08-4898-af48-ddf858b97936	d9a263b8ad860dd831538e36d18dc2e6e1bcb4693a55d0b3e37eca32e63cb6b2	2026-11-05 22:36:33.703922+00	20261105223633_init	\N	\N	2026-11-05 22:36:33.533588+00	1
7b4834bf-14f3-4936-ae1c-0e38dccdaf8c	bc8ac4902325640f6e4e9ce74491430a79260a7451281e06b0c392bbf1005f6f	2026-11-08 17:12:21.371155+00	20261108171221_staff_categories	\N	\N	2026-11-08 17:12:21.322148+00	1
\.


--
-- Name: ActivityLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."ActivityLog_id_seq"', 19, true);


--
-- Name: Attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."Attachment_id_seq"', 1, false);


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."Category_id_seq"', 7, true);


--
-- Name: Comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."Comment_id_seq"', 4, true);


--
-- Name: Department_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."Department_id_seq"', 7, true);


--
-- Name: Notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."Notification_id_seq"', 17, true);


--
-- Name: Request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."Request_id_seq"', 5, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: hospital
--

SELECT pg_catalog.setval('public."User_id_seq"', 6, true);


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: Attachment Attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Request Request_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: hospital
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: Department_name_key; Type: INDEX; Schema: public; Owner: hospital
--

CREATE UNIQUE INDEX "Department_name_key" ON public."Department" USING btree (name);


--
-- Name: Request_assigneeId_idx; Type: INDEX; Schema: public; Owner: hospital
--

CREATE INDEX "Request_assigneeId_idx" ON public."Request" USING btree ("assigneeId");


--
-- Name: Request_createdAt_idx; Type: INDEX; Schema: public; Owner: hospital
--

CREATE INDEX "Request_createdAt_idx" ON public."Request" USING btree ("createdAt");


--
-- Name: Request_departmentId_idx; Type: INDEX; Schema: public; Owner: hospital
--

CREATE INDEX "Request_departmentId_idx" ON public."Request" USING btree ("departmentId");


--
-- Name: Request_status_idx; Type: INDEX; Schema: public; Owner: hospital
--

CREATE INDEX "Request_status_idx" ON public."Request" USING btree (status);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: hospital
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: _StaffCategories_AB_unique; Type: INDEX; Schema: public; Owner: hospital
--

CREATE UNIQUE INDEX "_StaffCategories_AB_unique" ON public."_StaffCategories" USING btree ("A", "B");


--
-- Name: _StaffCategories_B_index; Type: INDEX; Schema: public; Owner: hospital
--

CREATE INDEX "_StaffCategories_B_index" ON public."_StaffCategories" USING btree ("B");


--
-- Name: ActivityLog ActivityLog_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."Request"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ActivityLog ActivityLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attachment Attachment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."Request"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attachment Attachment_uploaderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Attachment"
    ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."Request"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Request Request_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Request Request_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Request Request_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Request Request_requesterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: _StaffCategories _StaffCategories_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."_StaffCategories"
    ADD CONSTRAINT "_StaffCategories_A_fkey" FOREIGN KEY ("A") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _StaffCategories _StaffCategories_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: hospital
--

ALTER TABLE ONLY public."_StaffCategories"
    ADD CONSTRAINT "_StaffCategories_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict yhmThcayushRhBtBncG8APpZqK2Kb4dk6stYsbvU6aT2ieXjz4W8fOgYinsT7IN

