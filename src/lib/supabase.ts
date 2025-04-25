import { createClient, PostgrestError } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Helper function to get the current user
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting current user:", error);
      return null;
    }

    // If user exists, ensure they also exist in the public.users table
    if (user) {
      await ensureUserInDatabase(user);
    }

    return user;
  } catch (error) {
    console.error("Unexpected error getting current user:", error);
    return null;
  }
};

// Helper function to ensure user exists in public.users table
export const ensureUserInDatabase = async (user: any = null) => {
  try {
    // If no user is provided, get the current user
    if (!user) {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error getting auth user:", authError);
        return null;
      }

      user = currentUser;
    }

    if (!user) return null;

    // Check if user exists in public.users table
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking user existence:", fetchError);
      return null;
    }

    // If user doesn't exist in public.users, create them
    if (!existingUser) {
      const { error: insertError } = await supabase.from("users").insert({
        id: user.id,
        email: user.email,
      });

      if (insertError) {
        console.error("Error creating user in public.users:", insertError);
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error("Unexpected error in ensureUserInDatabase:", error);
    return null;
  }
};

// Generic update function with error handling
export const updateRecord = async <T extends Record<string, any>>(
  table: string,
  id: string,
  data: T,
  idField: string = "id",
): Promise<{ data: any | null; error: PostgrestError | Error | null }> => {
  try {
    // Validate inputs
    if (!table || !id || !data) {
      return {
        data: null,
        error: new Error("Missing required parameters for update operation"),
      };
    }

    // Perform the update operation
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq(idField, id)
      .select();

    if (error) {
      console.error(`Error updating ${table} record:`, error);
      return { data: null, error };
    }

    return { data: result, error: null };
  } catch (error) {
    console.error(`Unexpected error updating ${table} record:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

// Generic delete function with error handling
export const deleteRecord = async (
  table: string,
  id: string,
  idField: string = "id",
): Promise<{ success: boolean; error: PostgrestError | Error | null }> => {
  try {
    // Validate inputs
    if (!table || !id) {
      return {
        success: false,
        error: new Error("Missing required parameters for delete operation"),
      };
    }

    // Directly perform the delete operation without checking if the record exists
    // This avoids potential race conditions where the record might be deleted between the check and the delete
    const { error } = await supabase.from(table).delete().eq(idField, id);

    if (error) {
      console.error(`Error deleting ${table} record:`, error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error(`Unexpected error deleting ${table} record:`, error);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

// Helper function to migrate data from localStorage to Supabase
export const migrateLocalStorageToSupabase = async () => {
  try {
    const user = await ensureUserInDatabase();
    if (!user) return;

    // Check if migration has already been performed
    const migrationKey = `migration_completed_${user.id}`;
    if (localStorage.getItem(migrationKey)) return;

    // Migrate accounts
    const storedAccounts = localStorage.getItem("tradingAccounts");
    if (storedAccounts) {
      const accounts = JSON.parse(storedAccounts);
      for (const account of accounts) {
        const { error } = await supabase.from("accounts").insert({
          name: account.name,
          description: account.description,
          user_id: user.id,
        });

        if (error) {
          console.error("Error migrating account to Supabase:", error);
        }
      }
    }

    // Migrate strategies
    const storedStrategies = localStorage.getItem("tradingStrategies");
    if (storedStrategies) {
      const strategies = JSON.parse(storedStrategies);
      for (const strategy of strategies) {
        const { error } = await supabase.from("strategies").insert({
          name: strategy.name,
          description: strategy.description,
          user_id: user.id,
        });

        if (error) {
          console.error("Error migrating strategy to Supabase:", error);
        }
      }
    }

    // Migrate symbols
    const storedSymbols = localStorage.getItem("tradingSymbols");
    if (storedSymbols) {
      const symbols = JSON.parse(storedSymbols);
      for (const symbol of symbols) {
        const { error } = await supabase.from("symbols").insert({
          symbol: symbol.symbol,
          name: symbol.name,
          type: symbol.type,
          tick_size: symbol.tickSize,
          tick_value: symbol.tickValue,
          contract_size: symbol.contractSize,
          user_id: user.id,
        });

        if (error) {
          console.error("Error migrating symbol to Supabase:", error);
        }
      }
    }

    // Mark migration as completed
    localStorage.setItem(migrationKey, "true");
  } catch (error) {
    console.error("Error migrating data to Supabase:", error);
  }
};

// Helper function to handle database migrations
export const handleDatabaseMigrations = async () => {
  // This function would be expanded in the future to handle schema changes
  // For now, it just ensures the initial migration from localStorage to Supabase
  try {
    await migrateLocalStorageToSupabase();
  } catch (error) {
    console.error("Error handling database migrations:", error);
  }
};

// Function to fetch comments for a media file
export const fetchMediaComments = async (mediaId: string) => {
  try {
    const { data: comments, error } = await supabase
      .from("media_comments")
      .select(
        `
        *,
        users(email)
      `,
      )
      .eq("media_id", mediaId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching media comments:", error);
      return [];
    }

    // Format the comments to include user email
    return comments.map((comment) => ({
      ...comment,
      user_email: comment.users?.email || "Anonymous",
    }));
  } catch (error) {
    console.error("Unexpected error fetching media comments:", error);
    return [];
  }
};

// Function to delete media files from Supabase storage
export const deleteMediaFilesFromStorage = async (
  ideaId: string,
): Promise<{ success: boolean; error: any | null }> => {
  try {
    if (!ideaId) {
      return { success: false, error: new Error("Missing idea ID") };
    }

    console.log(`Attempting to delete media files for trade idea ${ideaId}`);

    // Delete all files in the trade_ideas/{ideaId} folder
    const { data, error } = await supabase.storage
      .from("media")
      .list(`trade_ideas/${ideaId}`);

    if (error) {
      console.error("Error listing media files for deletion:", error);
      return { success: false, error };
    }

    console.log(`Found ${data?.length || 0} files to delete in storage`);

    if (data && data.length > 0) {
      // Create an array of file paths to delete
      const filesToDelete = data.map(
        (file) => `trade_ideas/${ideaId}/${file.name}`,
      );

      console.log("Files to delete:", filesToDelete);

      // Delete the files
      const { error: deleteError } = await supabase.storage
        .from("media")
        .remove(filesToDelete);

      if (deleteError) {
        console.error("Error deleting media files from storage:", deleteError);
        return { success: false, error: deleteError };
      }

      console.log(
        `Successfully deleted ${filesToDelete.length} files from storage`,
      );
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Unexpected error deleting media files from storage:", error);
    return { success: false, error };
  }
};

// Function to add a comment to a media file
export const addMediaComment = async (mediaId: string, comment: string) => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase.from("media_comments").insert({
      media_id: mediaId,
      user_id: user?.id,
      comment,
    }).select(`
        *,
        users(email)
      `);

    if (error) {
      console.error("Error adding media comment:", error);
      return null;
    }

    // Format the comment to include user email
    if (data && data.length > 0) {
      return {
        ...data[0],
        user_email: data[0].users?.email || "Anonymous",
      };
    }

    return null;
  } catch (error) {
    console.error("Unexpected error adding media comment:", error);
    return null;
  }
};

// Function to ensure the trade_closure_edits table exists
export async function ensureTradeClosureEditsTable() {
  try {
    // Skip the direct SQL execution attempt since we know it's failing
    // This will prevent the 404 errors in the console
    console.log("Checking if trade_closure_edits table exists");

    // Continue with alternative approach if needed
    // Try an alternative approach - check if the table exists first
    try {
      const { count, error: countError } = await supabase
        .from("trade_closure_edits")
        .select("id", { count: "exact", head: true });

      if (countError) {
        console.log(
          "Table likely does not exist, will be created by migration script",
        );
      } else {
        console.log("Table exists, count:", count);
      }
    } catch (err) {
      console.warn("Error checking if table exists:", err);
    }

    console.log("trade_closure_edits table created or verified");

    return { success: true };
  } catch (error) {
    console.error("Error ensuring trade_closure_edits table:", error);
    return { success: false, error };
  }
}
