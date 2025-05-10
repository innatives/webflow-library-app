/*
  # Fix Library Permissions Schema

  1. Changes
    - Add unique constraint to prevent duplicate shares
    - Add library_id constraint
    - Update RLS policies for proper access control
    - Add cascading deletes for cleanup

  2. Security
    - Enable RLS
    - Add policies for proper access control
*/

-- Create user_libraries table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_libraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on user_libraries
ALTER TABLE user_libraries ENABLE ROW LEVEL SECURITY;

-- Create policies for user_libraries
CREATE POLICY "Users can insert their own libraries"
  ON user_libraries
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view their own libraries"
  ON user_libraries
  FOR SELECT
  TO public
  USING (auth.uid() = created_by);

CREATE POLICY "Users can update their own libraries"
  ON user_libraries
  FOR UPDATE
  TO public
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own libraries"
  ON user_libraries
  FOR DELETE
  TO public
  USING (auth.uid() = created_by);

-- Create shared_library_permissions table with proper constraints
CREATE TABLE IF NOT EXISTS shared_library_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  library_id uuid REFERENCES user_libraries(id) ON DELETE CASCADE NOT NULL,
  can_edit boolean DEFAULT false NOT NULL,
  can_delete boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(shared_by, shared_with, library_id)
);

-- Enable RLS on shared_library_permissions
ALTER TABLE shared_library_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_library_permissions
CREATE POLICY "Users can create sharing entries"
  ON shared_library_permissions
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can view their sharing permissions"
  ON shared_library_permissions
  FOR SELECT
  TO public
  USING (auth.uid() = shared_by OR auth.uid() = shared_with);

CREATE POLICY "Users can update their sharing entries"
  ON shared_library_permissions
  FOR UPDATE
  TO public
  USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete their sharing entries"
  ON shared_library_permissions
  FOR DELETE
  TO public
  USING (auth.uid() = shared_by);

-- Create shared_clipboard_items table with proper constraints
CREATE TABLE IF NOT EXISTS shared_clipboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  content_type text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  library_id uuid REFERENCES user_libraries(id) ON DELETE SET NULL,
  screenshot_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on shared_clipboard_items
ALTER TABLE shared_clipboard_items ENABLE ROW LEVEL SECURITY;

-- Create policies for shared_clipboard_items
CREATE POLICY "Users can insert their own items"
  ON shared_clipboard_items
  FOR INSERT
  TO public
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view items they have access to"
  ON shared_clipboard_items
  FOR SELECT
  TO public
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 
      FROM shared_library_permissions 
      WHERE shared_library_permissions.shared_by = shared_clipboard_items.created_by 
      AND shared_library_permissions.shared_with = auth.uid()
      AND shared_library_permissions.library_id = shared_clipboard_items.library_id
    )
  );

CREATE POLICY "Users can update items with permission"
  ON shared_clipboard_items
  FOR UPDATE
  TO public
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 
      FROM shared_library_permissions 
      WHERE shared_library_permissions.shared_by = shared_clipboard_items.created_by 
      AND shared_library_permissions.shared_with = auth.uid()
      AND shared_library_permissions.library_id = shared_clipboard_items.library_id
      AND shared_library_permissions.can_edit = true
    )
  );

CREATE POLICY "Users can delete items with permission"
  ON shared_clipboard_items
  FOR DELETE
  TO public
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 
      FROM shared_library_permissions 
      WHERE shared_library_permissions.shared_by = shared_clipboard_items.created_by 
      AND shared_library_permissions.shared_with = auth.uid()
      AND shared_library_permissions.library_id = shared_clipboard_items.library_id
      AND shared_library_permissions.can_delete = true
    )
  );