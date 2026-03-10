/**
 * Auth Guard Component
 * 
 * Conditionally renders children based on authentication state.
 * Shows login prompt if not authenticated.
 */

import React, { useState, useEffect } from "react";
import { authFlow, apiClient } from "@/utils/api";
import { Button } from "./Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./Card";
import { Loader2, LogIn } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  requireAuth?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  loadingComponent,
  requireAuth = true,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authed = await apiClient.isAuthenticated();
      setIsAuthenticated(authed);
    } catch (error) {
      console.error("[AuthGuard] Auth check failed:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    authFlow.openLogin();
  };

  if (isLoading) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && requireAuth) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Sign In Required</CardTitle>
          <CardDescription>
            Please sign in to access this feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} leftIcon={<LogIn size={16} />}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
