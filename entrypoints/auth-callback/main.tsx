import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { authFlow } from "@/utils/api";
import "./style.css";

function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const result = await authFlow.handleAuthCallback();
    
    if (result.success) {
      setStatus("success");
      // Close the tab after a brief delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      setStatus("error");
      setError(result.error || "Authentication failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {status === "loading" && (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-lg text-foreground">Completing sign in...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg text-foreground">Successfully signed in!</p>
            <p className="text-sm text-muted-foreground">
              You can close this tab and return to the extension.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-lg text-foreground">Sign in failed</p>
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => authFlow.openLogin()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthCallback />
  </React.StrictMode>
);
