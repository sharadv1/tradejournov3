import { Suspense, useEffect } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import SymbolManagementPage from "./components/SymbolManagementPage";
import RiskSettingsPage from "./components/RiskSettingsPage";
import AccountManagementPage from "./components/AccountManagementPage";
import StrategyManagementPage from "./components/StrategyManagementPage";
import JournalPage from "./components/JournalPage";
import TradeIdeasPage from "./components/TradeIdeasPage";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import Layout from "./components/layout/Layout";
import routes from "tempo-routes";
import { RiskProvider } from "./contexts/RiskContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { handleDatabaseMigrations } from "./lib/supabase";

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function AppRoutes() {
  const { loading } = useAuth();
  // Store the tempo routes result in a variable to avoid hook order issues
  const tempoRoutes =
    import.meta.env.VITE_TEMPO === "true" ? useRoutes(routes) : null;

  // Initialize database and handle migrations
  useEffect(() => {
    const initDatabase = async () => {
      try {
        // Import the function to ensure the trade_closure_edits table exists
        const { ensureTradeClosureEditsTable } = await import("@/lib/supabase");

        // First handle general migrations
        await handleDatabaseMigrations();

        // Then specifically ensure the trade_closure_edits table exists
        await ensureTradeClosureEditsTable();

        console.log("Database initialization completed");
      } catch (error) {
        console.error("Error initializing database:", error);
      }
    };

    initDatabase();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        {/* Render Tempo routes first if in Tempo environment */}
        {tempoRoutes}

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/symbol-management"
            element={
              <ProtectedRoute>
                <SymbolManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/risk-settings"
            element={
              <ProtectedRoute>
                <RiskSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-management"
            element={
              <ProtectedRoute>
                <AccountManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/strategy-management"
            element={
              <ProtectedRoute>
                <StrategyManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal"
            element={
              <ProtectedRoute>
                <JournalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trade-ideas"
            element={
              <ProtectedRoute>
                <div className="bg-background">
                  <TradeIdeasPage />
                </div>
              </ProtectedRoute>
            }
          />
          {/* Add tempo route for storyboards */}
          {import.meta.env.VITE_TEMPO === "true" && (
            <Route path="/tempobook/*" element={<div />} />
          )}
          {/* Routes below are already defined above, removing duplicates */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <RiskProvider>
        <AppRoutes />
      </RiskProvider>
    </AuthProvider>
  );
}

export default App;
