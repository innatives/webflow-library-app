-- Function to get user ID by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id
  FROM users
  WHERE email = email_input;
  
  RETURN user_id;
END;
$$;