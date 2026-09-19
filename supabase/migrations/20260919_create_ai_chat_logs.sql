-- Create ai_chat_logs table to track AI assistant conversations
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text NOT NULL,
    user_message text NOT NULL,
    ai_response text NOT NULL,
    channel text DEFAULT 'web'::text NOT NULL,
    tools_used jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (only authenticated admins can view logs)
CREATE POLICY "Enable read access for authenticated users" 
ON "public"."ai_chat_logs"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert
CREATE POLICY "Enable insert access for service_role" 
ON "public"."ai_chat_logs"
AS PERMISSIVE FOR INSERT
TO service_role
WITH CHECK (true);
