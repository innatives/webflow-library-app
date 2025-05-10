/*
  # Add library sharing functionality

  1. New Functions
    - has_library_access: Checks if a user has access to a library
    - has_clipboard_access: Checks if a user has access to a clipboard item

  2. Security
    - Add functions to verify access permissions
*/

-- Function to check if a user has access to a library
CREATE OR REPLACE FUNCTION has_library_access(library_id UUID, current_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_libraries
    WHERE id = library_id
    AND (
      created_by = current_user_id
      OR EXISTS (
        SELECT 1
        FROM shared_library_permissions
        WHERE shared_library_permissions.library_id = library_id
        AND shared_library_permissions.shared_with = current_user_id
      )
    )
  );
END;
$$;

-- Function to check if a user has access to a clipboard item
CREATE OR REPLACE FUNCTION has_clipboard_access(item_creator_id UUID, current_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    item_creator_id = current_user_id
    OR EXISTS (
      SELECT 1
      FROM shared_library_permissions
      WHERE shared_library_permissions.shared_by = item_creator_id
      AND shared_library_permissions.shared_with = current_user_id
    )
  );
END;
$$;