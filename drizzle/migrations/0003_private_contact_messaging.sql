CREATE TABLE public.contact_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),pet_id uuid NOT NULL,pet_name text NOT NULL,finder_id uuid NOT NULL,owner_id uuid NOT NULL,introduction text NOT NULL CHECK(length(btrim(introduction)) BETWEEN 1 AND 2000),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(finder_id<>owner_id));
GRANT SELECT ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read requests" ON public.contact_requests FOR SELECT TO authenticated USING(auth.uid() IN(finder_id,owner_id));
CREATE UNIQUE INDEX contact_pending_unique ON public.contact_requests(finder_id,owner_id,pet_id) WHERE status='pending';
CREATE TABLE public.conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),request_id uuid NOT NULL UNIQUE REFERENCES public.contact_requests(id),finder_id uuid NOT NULL,owner_id uuid NOT NULL,pet_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversations" ON public.conversations FOR SELECT TO authenticated USING(auth.uid() IN(finder_id,owner_id));
CREATE TABLE public.messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid NOT NULL REFERENCES public.conversations(id),sender_id uuid NOT NULL,body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 2000),created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.messages FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=conversation_id AND auth.uid() IN(c.finder_id,c.owner_id)));
CREATE INDEX messages_conversation_time ON public.messages(conversation_id,created_at,id);
CREATE TABLE public.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,request_id uuid REFERENCES public.contact_requests(id),conversation_id uuid REFERENCES public.conversations(id),kind text NOT NULL CHECK(kind IN('request','accepted','declined','message')),pet_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE INDEX notifications_user_time ON public.notifications(user_id,created_at DESC);
CREATE TABLE public.user_blocks (blocker_id uuid NOT NULL,blocked_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(blocker_id,blocked_id),CHECK(blocker_id<>blocked_id));
GRANT SELECT ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own blocks" ON public.user_blocks FOR SELECT TO authenticated USING(auth.uid()=blocker_id);
CREATE FUNCTION public.create_contact_request(_pet_id uuid,_introduction text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pets; r uuid; u uuid:=auth.uid();
BEGIN
IF u IS NULL THEN RAISE EXCEPTION 'Du måste logga in.'; END IF;
IF _introduction IS NULL OR length(btrim(_introduction)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Skriv 1–2000 tecken.'; END IF;
SELECT * INTO p FROM public.pets WHERE id=_pet_id AND status='borttappad' FOR SHARE;
IF NOT FOUND THEN RAISE EXCEPTION 'Djuret är inte längre anmält som borttappat.'; END IF;
IF p.owner_id=u THEN RAISE EXCEPTION 'Du äger redan detta djur.'; END IF;
IF EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=u AND blocked_id=p.owner_id) OR(blocker_id=p.owner_id AND blocked_id=u)) THEN RAISE EXCEPTION 'Kontakten är blockerad.'; END IF;
IF EXISTS(SELECT 1 FROM public.contact_requests WHERE finder_id=u AND owner_id=p.owner_id AND pet_id=p.id AND status='accepted') THEN RAISE EXCEPTION 'Ni har redan ett samtal om djuret.'; END IF;
INSERT INTO public.contact_requests(pet_id,pet_name,finder_id,owner_id,introduction) VALUES(p.id,p.name,u,p.owner_id,btrim(_introduction)) RETURNING id INTO r;
INSERT INTO public.notifications(user_id,request_id,kind,pet_name) VALUES(p.owner_id,r,'request',p.name);
RETURN r;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Du har redan en väntande förfrågan.';
END $$;
CREATE FUNCTION public.respond_contact_request(_request_id uuid,_status text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.contact_requests; c uuid; u uuid:=auth.uid();
BEGIN
SELECT * INTO r FROM public.contact_requests WHERE id=_request_id AND u IN(finder_id,owner_id) FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Förfrågan är inte tillgänglig.'; END IF;
IF r.status<>'pending' THEN RAISE EXCEPTION 'Förfrågan är redan behandlad.'; END IF;
IF (_status IN('accepted','declined') AND u<>r.owner_id) OR (_status='cancelled' AND u<>r.finder_id) OR _status IS NULL OR _status NOT IN('accepted','declined','cancelled') THEN RAISE EXCEPTION 'Åtgärden är inte tillåten.'; END IF;
IF _status='accepted' AND EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=r.finder_id AND blocked_id=r.owner_id) OR(blocker_id=r.owner_id AND blocked_id=r.finder_id)) THEN RAISE EXCEPTION 'Kontakten är blockerad.'; END IF;
UPDATE public.contact_requests SET status=_status,updated_at=now() WHERE id=r.id;
IF _status='accepted' THEN
INSERT INTO public.conversations(request_id,finder_id,owner_id,pet_name) VALUES(r.id,r.finder_id,r.owner_id,r.pet_name) RETURNING id INTO c;
INSERT INTO public.messages(conversation_id,sender_id,body) VALUES(c,r.finder_id,r.introduction);
END IF;
IF _status IN('accepted','declined') THEN INSERT INTO public.notifications(user_id,request_id,conversation_id,kind,pet_name) VALUES(r.finder_id,r.id,c,_status,r.pet_name); END IF;
RETURN c;
END $$;
CREATE FUNCTION public.send_private_message(_conversation_id uuid,_body text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.conversations; m uuid; u uuid:=auth.uid(); other_id uuid;
BEGIN
IF _body IS NULL OR length(btrim(_body)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Skriv 1–2000 tecken.'; END IF;
SELECT * INTO c FROM public.conversations WHERE id=_conversation_id AND u IN(finder_id,owner_id);
IF NOT FOUND THEN RAISE EXCEPTION 'Samtalet är inte tillgängligt.'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.contact_requests WHERE id=c.request_id AND status='accepted') THEN RAISE EXCEPTION 'Förfrågan är inte accepterad.'; END IF;
other_id:=CASE WHEN u=c.finder_id THEN c.owner_id ELSE c.finder_id END;
IF EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=u AND blocked_id=other_id) OR(blocker_id=other_id AND blocked_id=u)) THEN RAISE EXCEPTION 'Kontakten är blockerad.'; END IF;
INSERT INTO public.messages(conversation_id,sender_id,body) VALUES(c.id,u,btrim(_body)) RETURNING id INTO m;
INSERT INTO public.notifications(user_id,conversation_id,request_id,kind,pet_name) VALUES(other_id,c.id,c.request_id,'message',c.pet_name);
RETURN m;
END $$;
CREATE FUNCTION public.mark_notification_read(_notification_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.notifications SET read_at=now() WHERE id=_notification_id AND user_id=auth.uid(); $$;
CREATE FUNCTION public.mark_conversation_read(_conversation_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.notifications SET read_at=now() WHERE conversation_id=_conversation_id AND user_id=auth.uid() AND read_at IS NULL; $$;
CREATE FUNCTION public.set_contact_block(_request_id uuid,_blocked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.contact_requests; u uuid:=auth.uid(); other_id uuid;
BEGIN
SELECT * INTO r FROM public.contact_requests WHERE id=_request_id AND u IN(finder_id,owner_id);
IF NOT FOUND OR _blocked IS NULL THEN RAISE EXCEPTION 'Kontakten är inte tillgänglig.'; END IF;
other_id:=CASE WHEN u=r.finder_id THEN r.owner_id ELSE r.finder_id END;
IF _blocked THEN INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(u,other_id) ON CONFLICT DO NOTHING;
ELSE DELETE FROM public.user_blocks WHERE blocker_id=u AND blocked_id=other_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.create_contact_request(uuid,text),public.respond_contact_request(uuid,text),public.send_private_message(uuid,text),public.mark_notification_read(uuid),public.mark_conversation_read(uuid),public.set_contact_block(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_contact_request(uuid,text),public.respond_contact_request(uuid,text),public.send_private_message(uuid,text),public.mark_notification_read(uuid),public.mark_conversation_read(uuid),public.set_contact_block(uuid,boolean) TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_requests,public.conversations,public.messages,public.notifications;