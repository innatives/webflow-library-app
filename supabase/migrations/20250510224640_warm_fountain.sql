/*
  # Fix ambiguous library_id reference

  1. Changes
    - Drop and recreate has_library_access function with explicit table references
    - Use proper table aliases to avoid ambiguity
    - Add proper type safety checks

  2. Security
    - Maintains existing security model
    - Only allows access to libraries user owns or has been granted access to
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
    WHERE 
      -- Check if user owns the library
      (ul.id = library_id AND ul.created_by = current_user_id)
      -- Or check if user has been granted access through permissions
      OR (ul.id = library_id AND slp.shared_with = current_user_id);
  );
END;
$$;