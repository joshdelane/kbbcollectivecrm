-- patch_016: Add logo_url to organisations for branded quotations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_url TEXT;
