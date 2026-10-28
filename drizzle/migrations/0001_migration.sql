CREATE POLICY "Owner upload pet photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-photos' AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY "Owner read pet photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner delete pet photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pet-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public read lost pet photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'pet-photos' AND public.is_lost_pet_photo(name));