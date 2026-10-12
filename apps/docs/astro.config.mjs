import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.vyde.dev',
  integrations: [
    starlight({
      title: 'Vyde Developer Docs',
      description: 'OAuth 2.1 and OpenID Connect for the Vyde platform.',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/JeanVydes/vyde-cli' }],
      customCss: ['./src/styles.css'],
      sidebar: [
        {
          label: 'OAuth 2.1 + OIDC',
          items: [
            { label: 'Overview', slug: 'oauth/overview' },
            { label: 'Build your first integration', slug: 'oauth/quickstart' },
            { label: 'Applications', slug: 'oauth/applications' },
            { label: 'Authorization', slug: 'oauth/authorization' },
            { label: 'Tokens', slug: 'oauth/tokens' },
            { label: 'OpenID Connect', slug: 'oauth/oidc' },
            { label: 'API reference', slug: 'oauth/api' },
          ],
        },
        { label: 'Native clients', items: [{ label: 'Vyde CLI', slug: 'cli' }] },
      ],
    }),
  ],
});
