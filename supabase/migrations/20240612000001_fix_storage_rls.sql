-- Disable RLS on storage.buckets to allow bucket creation
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Disable RLS on storage.objects to allow file uploads
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload files
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to select files
DROP POLICY IF EXISTS "Allow authenticated selects" ON storage.objects;
CREATE POLICY "Allow authenticated selects"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow authenticated users to update files
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (true);

-- Create policy to allow authenticated users to delete files
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (true);
