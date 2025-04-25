import { supabase } from "./supabase";

export async function runMigration(
  sqlFilePath: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Read the SQL file content
    const response = await fetch(sqlFilePath);
    if (!response.ok) {
      throw new Error(`Failed to load SQL file: ${sqlFilePath}`);
    }

    const sqlContent = await response.text();

    // Execute the SQL using Supabase's rpc function
    const { error } = await supabase.rpc("exec_sql", { sql_query: sqlContent });

    if (error) {
      console.error("Error executing migration:", error);
      return { success: false, error };
    }

    console.log(`Migration executed successfully: ${sqlFilePath}`);
    return { success: true };
  } catch (error) {
    console.error("Error running migration:", error);
    return { success: false, error };
  }
}
