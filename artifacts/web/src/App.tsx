import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SavedListingsProvider } from '@/context/SavedListingsContext';

import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';
import { ScrollManager } from '@/components/ScrollManager';
import Home from '@/pages/Home';

// Split secondary pages into their own chunks so the homepage loads fast on phones.
const Explore = lazy(() => import('@/pages/Explore'));
const ListingDetail = lazy(() => import('@/pages/ListingDetail'));
const Saved = lazy(() => import('@/pages/Saved'));
const Spin = lazy(() => import('@/pages/Spin'));
const Admin = lazy(() => import('@/pages/Admin'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Partners = lazy(() => import('@/pages/Partners'));
const Feedback = lazy(() => import('@/pages/Feedback'));

function PageFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center" aria-busy="true">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — reduces noisy refetches on tab focus
    },
  },
});

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:font-semibold"
      >
        Skip to content
      </a>
      <ScrollManager />
      <Navbar />
      <main id="main" className="flex-1 flex flex-col">
        <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/explore" component={Explore} />
          <Route path="/listing/:id" component={ListingDetail} />
          <Route path="/saved" component={Saved} />
          <Route path="/spin" component={Spin} />
          <Route path="/partners" component={Partners} />
          <Route path="/feedback" component={Feedback} />
          <Route path="/admin" component={Admin} />
          <Route path="/notifications" component={Notifications} />
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="directory-theme">
      <SavedListingsProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </SavedListingsProvider>
    </ThemeProvider>
  );
}

export default App;
