-- Table to track imported documents
CREATE TABLE public.imported_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  summary TEXT,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.imported_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON public.imported_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON public.imported_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.imported_documents FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.imported_documents FOR UPDATE
USING (auth.uid() = user_id);

-- Link posts to source document (nullable for legacy posts)
ALTER TABLE public.posts
ADD COLUMN document_id UUID REFERENCES public.imported_documents(id) ON DELETE CASCADE;

CREATE INDEX idx_posts_document_id ON public.posts(document_id);
CREATE INDEX idx_imported_documents_user_id ON public.imported_documents(user_id);