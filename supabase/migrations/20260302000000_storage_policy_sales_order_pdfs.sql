
-- Allow authenticated users to upload sales order PDFs to company_assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company_assets', 'company_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files into the sales_orders/ folder
CREATE POLICY "Authenticated users can upload sales order PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company_assets'
  AND (storage.foldername(name))[1] = 'sales_orders'
);

-- Allow authenticated users to read/view sales order PDFs
CREATE POLICY "Authenticated users can read sales order PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company_assets'
  AND (storage.foldername(name))[1] = 'sales_orders'
);

-- Allow public read access so PDF public URLs work without auth
CREATE POLICY "Public read access for sales order PDFs"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'company_assets'
  AND (storage.foldername(name))[1] = 'sales_orders'
);
