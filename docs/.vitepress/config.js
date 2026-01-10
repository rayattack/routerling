export default {
  title: 'Routerling',
  description: 'A simple, fast, and feature-rich router for Node.js',
  base: '/routerling/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/guide/middleware' },
      { text: 'GitHub', link: 'https://github.com/rayattack/routerling' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Routing Basics', link: '/guide/routing' }
        ]
      },
      {
        text: 'Core Features',
        items: [
          { text: 'Middleware & Security', link: '/guide/middleware' },
          { text: 'Body Parsing', link: '/guide/body-parsing' },
          { text: 'Error Handling', link: '/guide/error-handling' }
        ]
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Templating & Assets', link: '/guide/templating' },
          { text: 'Route Groups', link: '/guide/groups' },
          { text: 'WebSockets', link: '/guide/websockets' },
          { text: 'Daemons', link: '/guide/daemons' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rayattack/routerling' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Tersoo Ortserga'
    }
  }
}
