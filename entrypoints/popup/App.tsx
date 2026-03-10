import { useEffect, useState } from "react";
import { authFlow, apiClient } from "@/utils/api";
import { authStore } from "@/utils/store";
import type { AuthStore } from "@dracon/wxt-shared/storage";

function App() {
  const [auth, setAuth] = useState<AuthStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  async function loadAuth() {
    const authData = await authStore.getValue();
    setAuth(authData);
    setIsLoading(false);
  }

  const handleLogin = () => {
    authFlow.openLogin();
  };

  const handleLogout = async () => {
    await authFlow.logout();
    await loadAuth();
  };

  const handleDashboard = () => {
    authFlow.openDashboard();
  };

  if (isLoading) {
    return (
      <div className="w-80 p-4 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const isAuthenticated = !!auth?.accessToken;

  return (
    <div className="w-80 p-4 space-y-4">
      <header className="flex items-center gap-2">
        <img src="/icon/32.png" alt="Logo" className="w-8 h-8" />
        <h1 className="text-lg font-semibold">My Extension</h1>
      </header>

      {isAuthenticated ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {auth.user?.picture && (
              <img
                src={auth.user.picture}
                alt={auth.user.name}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{auth.user?.name}</p>
              <p className="text-sm text-muted-foreground">{auth.user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDashboard}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to access all features
          </p>
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
