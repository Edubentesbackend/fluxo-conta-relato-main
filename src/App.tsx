import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ApiAvailabilityBanner } from "./components/ApiAvailabilityBanner";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

const Index = lazy(() => import("./pages/Index"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
  </div>
);

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return showRegister
      ? <RegisterPage onBack={() => setShowRegister(false)} />
      : <LoginPage onShowRegister={() => setShowRegister(true)} />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <ApiAvailabilityBanner />
          <Toaster />
          <Sonner />
          <AppRoutes />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
