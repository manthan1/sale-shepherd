-- Rename telegram_bot_token column to telegram_chat_id
ALTER TABLE public.companies 
RENAME COLUMN telegram_bot_token TO telegram_chat_id;