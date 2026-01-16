-- Supabase Schema for Nightmare Library (Enhanced)
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    cover_url TEXT,
    file_path TEXT NOT NULL,
    storage_provider TEXT DEFAULT 'supabase',
    tags TEXT[],
    is_favorite BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"Public Access\" ON books
    FOR SELECT USING (true);

CREATE POLICY \"Admin Access\" ON books
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
