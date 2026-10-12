import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { setUnauthenticatedHandler } from './lib/auth-client';
import { router } from './routes';
import './styles.css';
import './design.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      // Refetching on every window focus is the default and it is wrong for an account screen:
      // tabbing back to the tab would silently overwrite an edit in progress.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

// `no-js` is removed here rather than in a component, so anything the CSS hides is revealed by the
// bundle having genuinely started.
document.documentElement.classList.remove('no-js');

// The one place a 401 turns into navigation. `authClient` calls it rather than importing the router,
// because the package must not know about routing.
setUnauthenticatedHandler(() => {
  void router.navigate({ to: '/login', search: { return_to: window.location.pathname } });
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('the #root element is missing from index.html');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
