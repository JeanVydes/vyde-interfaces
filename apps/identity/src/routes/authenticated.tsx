/**
 * The authenticated layout route.
 *
 * # Why this file no longer holds the shell
 *
 * It used to. The frame and the auth gate now live in `components/ProtectedShell.tsx` because a
 * layout *route* turned out to be the wrong tool for this router: a layout at `/` with a `/` index
 * beneath it is rejected outright, and the pathless form that gets past that check builds a tree
 * whose paths look right and cannot be navigated. The reasoning is written out in that file; this is
 * only the record of where it went.
 *
 * Nothing is registered here any more. A route file that registers nothing is a file nobody deletes,
 * so it is kept as the note it is and the screens below are wired directly to the root.
 */

export {};