import { Link, createRoute } from '@tanstack/react-router';
import { PublicShell } from '@/components/ProtectedShell';

import { RootRoute } from './__root';

export const LandingRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  component: LandingScreen,
});

function LandingScreen() {
  return (
    <PublicShell>
      <main id="main" className="landing">
      <nav className="landing__nav" aria-label="Public navigation">
        <span className="landing__wordmark">VYDE / CONTROL PLANE</span>
        <div className="landing__actions">
          <Link to="/login" className="button button--quiet">Sign in</Link>
          <Link to="/overview" className="button button--quiet">Open console</Link>
          <Link to="/register" className="button button--primary">Create account</Link>
        </div>
      </nav>
      <section className="landing__hero">
        <p className="landing__eyebrow">IDENTITY // ORGANIZATIONS // ACCESS</p>
        <h1>Operate your digital perimeter with clarity.</h1>
        <p className="landing__lead">
          A focused command center for identity, teams, applications, and the credentials that connect them.
        </p>
        <div className="landing__actions">
          <Link to="/register" className="button button--primary">Initialize workspace</Link>
          <Link to="/overview" className="button button--quiet">Access console</Link>
        </div>
      </section>
      <section className="landing__grid" aria-label="Platform capabilities">
        <article><span>01</span><h2>Identity</h2><p>Profiles, strong authentication, verified channels, and recovery controls.</p></article>
        <article><span>02</span><h2>Organizations</h2><p>Membership, roles, and a clear operating picture for every team.</p></article>
        <article><span>03</span><h2>Applications</h2><p>Manage connected clients and access grants without losing sight of ownership.</p></article>
      </section>
      </main>
    </PublicShell>
  );
}
