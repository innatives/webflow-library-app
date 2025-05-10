/*
  # Fix ambiguous library_id references

  1. Changes
    - Update has_library_access function to use explicit table references
    - Add table alias to improve readability
    - Use proper column qualification to avoid ambiguity

  2. Security
    - No changes to security policies
    - Function remains accessible to all authenticated users
*/

CREATE OR REPLACE FUNCTION public.has_library_access(library_id uuid, current_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is the library owner
  IF EXISTS (
    SELECT 1 
    FROM user_libraries ul
    WHERE ul.id = library_id 
    AND ul.created_by = current_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check if user has been granted access through permissions
  IF EXISTS (
    SELECT 1 
    FROM shared_library_permissions slp
    WHERE slp.library_id = has_library_access.library_id 
    AND slp.shared_with = current_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;