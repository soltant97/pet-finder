CREATE TABLE public.found_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finder_id uuid NOT NULL,
  species public.pet_species,
  area text,
  city text,
  found_at timestamptz,
  description text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.found_reports TO authenticated;
GRANT ALL ON public.found_reports TO service_role;
ALTER TABLE public.found_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finder read found" ON public.found_reports FOR SELECT TO authenticated USING (auth.uid() = finder_id);
CREATE POLICY "Finder insert found" ON public.found_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = finder_id);
CREATE POLICY "Finder update found" ON public.found_reports FOR UPDATE TO authenticated USING (auth.uid() = finder_id) WITH CHECK (auth.uid() = finder_id);
CREATE POLICY "Finder delete found" ON public.found_reports FOR DELETE TO authenticated USING (auth.uid() = finder_id);

CREATE OR REPLACE FUNCTION public.search_lost_pets(_species public.pet_species DEFAULT NULL, _location_term text DEFAULT NULL, _found_date date DEFAULT NULL)
RETURNS TABLE(id uuid, name text, species public.pet_species, breed text, color text, sex public.pet_sex, age text, marks text, last_location text, last_seen_date date, circumstances text, photo_paths text[], reported_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.name, p.species, p.breed, p.color, p.sex, p.age, p.marks,
         r.last_location, r.last_seen_date, r.circumstances,
         COALESCE((SELECT array_agg(ph.storage_path ORDER BY ph.position, ph.created_at) FROM public.pet_photos ph WHERE ph.pet_id = p.id), '{}'),
         r.created_at
  FROM public.pets p
  JOIN public.lost_reports r ON r.pet_id = p.id
  WHERE p.status = 'borttappad'
    AND (_species IS NULL OR p.species = _species)
    AND (_location_term IS NULL OR length(trim(_location_term)) < 2
         OR r.last_location ILIKE '%' || replace(replace(trim(_location_term), '%', ''), '_', '') || '%')
    AND (_found_date IS NULL OR r.last_seen_date <= _found_date)
  ORDER BY r.last_seen_date DESC, r.created_at DESC
  LIMIT 200;
$$;
GRANT EXECUTE ON FUNCTION public.search_lost_pets(public.pet_species, text, date) TO anon, authenticated;