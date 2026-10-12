import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  themeVariables: {
    primaryColor: '#f4f4f4',
    primaryTextColor: '#171717',
    primaryBorderColor: '#737373',
    lineColor: '#525252',
    secondaryColor: '#fafafa',
    tertiaryColor: '#ffffff',
  },
});

await mermaid.run({ querySelector: '.mermaid' });
