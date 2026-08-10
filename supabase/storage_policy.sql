-- After creating a bucket named "reports" in Dashboard → Storage → New bucket
-- (uncheck "Public bucket" — files should only be reachable via signed URLs
-- or by the owning user, not a public link), run this in the SQL Editor
-- so users can only upload/read files inside their own folder within the bucket.

create policy "Users can upload to their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'reports' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own files"
  on storage.objects for select
  using (
    bucket_id = 'reports' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  using (
    bucket_id = 'reports' and
    (storage.foldername(name))[1] = auth.uid()::text
  );
