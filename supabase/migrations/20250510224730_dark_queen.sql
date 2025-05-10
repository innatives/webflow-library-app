/*
  # Fix has_library_access function
  
  1. Changes
    - Fix SQL syntax error in has_library_access function
    - Add proper parentheses grouping
    - Improve readability with better formatting
*/

CREATE OR REPLACE FUNCTION has_library_access(library_id uuid, current_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_libraries ul
    LEFT JOIN shared_library_permissions slp ON slp.library_id = ul.id
    WHERE (
      -- Check if user owns the library
      (ul.id = library_id AND ul.created_by = current_user_id)
      -- Or check if user has been granted access through permissions
      OR (ul.id = library_id AND slp.shared_with = current_user_id)
    )
  );
END;
$$;