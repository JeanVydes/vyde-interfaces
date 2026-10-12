import { Link, Outlet, createRootRoute } from '@tanstack/react-router';

/**
 * The document frame.
 *
 * # The scanline layer
 *
 * One fixed element behind everything, `pointer-events: none`. It is *not* a component with props
 * because it has no variants: making it configurable would mean every call site could put it in
 * front of content, which is the one thing it must never do. A 2px band across body text measurably
 * lowers its contrast, and it compounds with a bright accent.
 *
 * `aria-hidden`, because a decorative gradient is not content and a screen reader announcing one is
 * worse than not having it.
 */
export const RootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <div className="vyde-scanlines" aria-hidden="true" />
      <a className="vyde-skip-link" href="#main">
        Skip to content
      </a>
      <Outlet />
    </>
  );
}

function NotFound() {
  return (
    <main id="main" className="shell__main">
      <div className="panel panel--bracketed">
        <h1 className="panel__title">Not found</h1>
        <p>
          There is nothing at this address. <Link to="/">Return to the overview</Link>.
        </p>
      </div>
    </main>
  );
}
