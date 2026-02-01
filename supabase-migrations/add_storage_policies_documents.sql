-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Policy 1: Admin users can upload to documents bucket
CREATE POLICY "Admin users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' 
    AND (
        -- Check if user is admin
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        OR
        -- Or if the path starts with their user ID (owner check)
        (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- Policy 2: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (
        -- Admin can view all
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        OR
        -- Or user can view their own files
        (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- Policy 3: Users can update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        OR
        (storage.foldername(name))[1] = auth.uid()::text
    )
)
WITH CHECK (
    bucket_id = 'documents' 
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        OR
        (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- Policy 4: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' 
    AND (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
        OR
        (storage.foldername(name))[1] = auth.uid()::text
    )
);

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;
