import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SavedListingsProvider } from '@/context/SavedListingsContext';

import { Navbar } from '@/components/Navbar';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import ListingDetail from '@/pages/ListingDetail';
import Saved from '@/pages/Saved';
import Spin from '@/pages/Spin';

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
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/explore" component={Explore} />
          <Route path="/listing/:id" component={ListingDetail} />
          <Route path="/saved" component={Saved} />
          <Route path="/spin" component={Spin} />
          <Route component={NotFound} />
        </Switch>
      </main>
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
