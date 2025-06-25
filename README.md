# Some sort of personal site

Emily's personal blog and portfolio website, kind of? Features a collection of blog posts, quick thoughts, and personal musings. Due to its sensitive nature, it is recommended for consumption by anyone.

## 🌟 What is this?

This is a personal website featuring:
- **Blog Posts**: Longer-form writing about travel, life experiences, and random thoughts
- **Thought Feed**: Quick social media-style posts and observations  
- **About Page**: Learn about Emily and the inspiration behind the site
- **User Authentication**: Secure login system for content management

The site has a playful design inspired by the Baba Is You aesthetic, complete with custom fonts and Baba-themed imagery.

## 🚀 Features

### Content Management
- **Blog Posts**: Markdown-based blog posts with frontmatter metadata
- **Thoughts**: Quick posts with customizable background colors
- **Tag System**: Categorize and filter content by tags
- **Admin Panel**: Protected content creation interface

### Authentication & Security
- JWT-based authentication with HTTP-only cookies
- User registration and login with email preferences
- PBKDF2 password hashing using Web Crypto API
- Session management with automatic cleanup
- Protected routes and middleware
- Cloudflare D1 database with automated migrations

### Technical Features
- **Static Site Generation**: Built with Astro for optimal performance
- **Serverless Deployment**: Runs on Cloudflare Workers
- **Dark/Light Theme**: Theme toggle with persistent preferences
- **RSS Feed**: Subscribe to blog updates
- **Responsive Design**: Mobile-friendly layout

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Header.astro     # Site navigation
│   ├── Footer.astro     # Site footer
│   └── Bio.astro        # Author bio component
├── data/                # Content files
│   ├── blog-posts/      # Markdown blog posts
│   └── thoughts/        # Quick thought posts
├── layouts/             # Page layouts
│   └── BaseLayout.astro # Main site template
├── lib/                 # Utility libraries
│   └── auth/           # Authentication system
├── pages/              # Site pages and API routes
│   ├── api/auth/       # Authentication endpoints
│   ├── blog/           # Blog pages
│   ├── thoughts/       # Thoughts pages
│   └── admin/          # Content management
├── styles/             # CSS stylesheets
└── utils/              # Helper functions
```

## 🧞 Development Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm run dev`     | Start development server with D1 database    |
| `npm run dev:astro` | UI-only development (no database)         |
| `npm run build`   | Build production site to `./dist/`          |
| `npm run preview` | Preview production build locally             |
| `npm run deploy`  | Build and deploy to Cloudflare              |
| `make dev-clean`  | Clean restart with database migrations      |
| `make help`       | Show user management commands                |

**Note**: Always use `npm run dev` for full-stack development with authentication features. The development server runs on http://localhost:8787.

## 👥 User Management (Admin)

```bash
# View users and statistics
make users                         # List all users
make stats                         # Quick statistics
make recent                        # Recent registrations

# Find and inspect users
make find Q=search_term            # Search users
make info EMAIL=user@email.com     # Get user details

# Manage users  
make test-user                     # Create test user
make logout EMAIL=user@email.com   # Force logout user
make delete EMAIL=user@email.com   # Delete user (with confirmation)

# Maintenance
make cleanup                       # Remove expired sessions
```

## 🔒 Security Features

- **Secure Authentication**: JWT tokens with 7-day expiration
- **HTTP-only Cookies**: Secure, SameSite=Strict cookie settings
- **Password Security**: PBKDF2 hashing with 100,000 iterations
- **Input Validation**: Server-side validation for all user inputs
- **CSRF Protection**: SameSite cookies prevent cross-site attacks

## 📚 Documentation

- **Authentication Guide**: [`docs/authentication.md`](./docs/authentication.md)
- **User Management**: Detailed admin instructions
- **API Reference**: Complete endpoint documentation

## 🛠️ Built With

- **[Astro](https://astro.build)** - Static site generator
- **[Cloudflare Workers](https://workers.cloudflare.com)** - Serverless runtime
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** - SQLite database
- **[Svelte](https://svelte.dev)** - Interactive components
- **TypeScript** - Type safety and better DX

## 📖 Original Template

This project started from the [Astro Framework Starter](https://github.com/cloudflare/templates/tree/main/packages/astro) template for Cloudflare Workers, but has been extensively customized with authentication, content management, and personal branding.
