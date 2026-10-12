/**
 * The route table's entry point.
 *
 * A file rather than a `routes/index.ts`, because `main.tsx` imports `./routes` and Vite resolves a
 * bare `./routes` to `routes.ts`. The name is unchanged; only its shape is different, and this
 * comment is here so nobody "tidies" it back into a directory and reintroduces the collision.
 */

export { router } from '@/routes/router';
