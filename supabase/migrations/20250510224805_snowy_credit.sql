/*
  # Fix ambiguous library_id reference

  1. Changes
    - Update has_library_access function to use explicit table references
    - Fix ambiguous column references by using proper table aliases
    - Improve query structure for better clarity

  2. Security
    - Maintain existing security model
    - Keep function as SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION has_library_access(target_library_id uuid, current_user_id uuid)
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
      (ul.id = target_library_id AND ul.created_by = current_user_id)
      -- Or check if user has been granted access through permissions
      OR (ul.id = target_library_id AND slp.shared_with = current_user_id)
    )
  );
END;
$$;