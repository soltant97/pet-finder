-- Profiles: public, non-identifying username only
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[A-Za-z0-9_]{3,24}$')
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON public.profiles (lower(username));
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.generate_username()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  words text[] := ARRAY['Luna','Sol','Moln','Bris','Skog','Ek','Björk','Stjärna','Vind','Snö','Älv','Myra','Lo','Räv','Uggla','Hare','Sälg','Lind','Kotte','Mossa'];
  candidate text;
BEGIN
  LOOP
    candidate := translate(words[1 + floor(random()*array_length(words,1))::int], 'åäöÅÄÖ', 'aaoAAO')
                 || lpad((floor(random()*10000))::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate));
  END LOOP;
  RETURN candidate;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, public.generate_username());
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_username_available(_username text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(_username) AND id <> auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.is_username_available(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Pets
CREATE TYPE public.pet_species AS ENUM ('katt','hund','annat');
CREATE TYPE public.pet_sex AS ENUM ('hane','hona','okant');
CREATE TYPE public.pet_status AS ENUM ('registrerad','borttappad','aterfunnen');

CREATE TABLE public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  species public.pet_species NOT NULL,
  breed text CHECK (breed IS NULL OR char_length(breed) <= 80),
  color text NOT NULL CHECK (char_length(color) BETWEEN 1 AND 80),
  sex public.pet_sex NOT NULL DEFAULT 'okant',
  age text CHECK (age IS NULL OR char_length(age) <= 40),
  microchip text CHECK (microchip IS NULL OR microchip ~ '^[0-9A-Za-z]{6,20}$'),
  marks text CHECK (marks IS NULL OR char_length(marks) <= 500),
  description text CHECK (description IS NULL OR char_length(description) <= 1500),
  status public.pet_status NOT NULL DEFAULT 'registrerad',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pets_owner_idx ON public.pets(owner_id);
CREATE INDEX pets_status_idx ON public.pets(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pets TO authenticated;
GRANT ALL ON public.pets TO service_role;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read pets" ON public.pets FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert pets" ON public.pets FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update pets" ON public.pets FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete pets" ON public.pets FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER pets_touch BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Lost reports (one active report per pet)
CREATE TABLE public.lost_reports (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  last_location text NOT NULL CHECK (char_length(last_location) BETWEEN 2 AND 160),
  last_seen_date date NOT NULL,
  circumstances text NOT NULL CHECK (char_length(circumstances) BETWEEN 2 AND 1500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_reports TO authenticated;
GRANT ALL ON public.lost_reports TO service_role;
ALTER TABLE public.lost_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read reports" ON public.lost_reports FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert reports" ON public.lost_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.owner_id = auth.uid()));
CREATE POLICY "Owner update reports" ON public.lost_reports FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete reports" ON public.lost_reports FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.lost_reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.validate_lost_report()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.last_seen_date > (now() AT TIME ZONE 'Europe/Stockholm')::date THEN
    RAISE EXCEPTION 'Datumet kan inte vara i framtiden';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reports_validate BEFORE INSERT OR UPDATE ON public.lost_reports FOR EACH ROW EXECUTE FUNCTION public.validate_lost_report();

-- A pet can only be 'borttappad' when a lost report exists
CREATE OR REPLACE FUNCTION public.validate_pet_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'borttappad' AND NOT EXISTS (SELECT 1 FROM public.lost_reports r WHERE r.pet_id = NEW.id) THEN
    RAISE EXCEPTION 'Ange plats, datum och omständigheter innan djuret markeras som borttappat';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER pets_validate_status BEFORE INSERT OR UPDATE OF status ON public.pets FOR EACH ROW EXECUTE FUNCTION public.validate_pet_status();

-- Photos
CREATE TABLE public.pet_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pet_photos_pet_idx ON public.pet_photos(pet_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_photos TO authenticated;
GRANT ALL ON public.pet_photos TO service_role;
ALTER TABLE public.pet_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read photos" ON public.pet_photos FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert photos" ON public.pet_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.owner_id = auth.uid())
    AND storage_path LIKE auth.uid()::text || '/%');
CREATE POLICY "Owner update photos" ON public.pet_photos FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner delete photos" ON public.pet_photos FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Public lost listing: only safe columns, only status = 'borttappad'
CREATE OR REPLACE FUNCTION public.get_lost_pets()
RETURNS TABLE (
  id uuid, name text, species public.pet_species, breed text, color text, sex public.pet_sex,
  age text, marks text, last_location text, last_seen_date date, circumstances text,
  photo_paths text[], reported_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.species, p.breed, p.color, p.sex, p.age, p.marks,
         r.last_location, r.last_seen_date, r.circumstances,
         COALESCE((SELECT array_agg(ph.storage_path ORDER BY ph.position, ph.created_at) FROM public.pet_photos ph WHERE ph.pet_id = p.id), '{}'),
         r.created_at
  FROM public.pets p
  JOIN public.lost_reports r ON r.pet_id = p.id
  WHERE p.status = 'borttappad'
  ORDER BY r.last_seen_date DESC, r.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_lost_pets() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_lost_pet_photo(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pet_photos ph JOIN public.pets p ON p.id = ph.pet_id
                 WHERE ph.storage_path = _path AND p.status = 'borttappad');
$$;
GRANT EXECUTE ON FUNCTION public.is_lost_pet_photo(text) TO anon, authenticated;