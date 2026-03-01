# Cloudflare Workers + React - Multi-Entity Durable Object Storage Template

[![[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/veritas-lens-bias-minimized-news-architect)]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})

A production-ready Cloudflare Workers + React template featuring a single Durable Object (DO) for efficient, multi-entity storage (users, chats, organizations, etc.). No direct DO access required—use simple entity APIs for persistence. Perfect for backend-heavy apps, chats, dashboards, and more.

## 🚀 Features

- **React 18 + Vite**: Fast, modern frontend with TypeScript and hot module replacement
- **Cloudflare Workers + Hono**: Lightning-fast API routing with automatic SPA handling
- **Single Durable Object Storage**: Multi-entity persistence (users, chats, etc.) via a shared DO—no KV costs
- **Entity System**: Simple CRUD APIs for entities with indexes, pagination, seeding
- **Shadcn UI + Tailwind**: Beautiful, accessible components with New York styling
- **React Router v6**: Type-safe routing with error boundaries
- **TanStack Query**: Data fetching, caching, mutations with optimistic updates
- **Error Reporting**: Automatic client/server error capture and deduplication
- **Theme System**: Dark/light mode with persistence
- **Mobile-Responsive**: Full responsive design with mobile sidebar
- **Development UX**: Auto-cache clearing, hot reload, type generation
- **Production-Ready**: Minification, sourcemaps, observability enabled

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite 6, React Router 6, TanStack Query 5, Shadcn UI, Tailwind CSS 3.4, Framer Motion
- **Backend**: Cloudflare Workers, Hono 4, Durable Objects (SQLite storage)
- **UI/UX**: Shadcn UI (full component library), Lucide Icons, Sonner Toasts
- **Dev Tools**: Bun, ESLint 9, TypeScript 5.8, Cloudflare Vite Plugin
- **State**: Zustand, Immer, React Hook Form + Zod
- **Other**: Date-fns, Recharts, Dnd-kit

## 🚀 Quick Start

```bash
# Clone & Install
bun install

# Development (localhost:3000)
bun run dev

# Build & Preview
bun run build
bun run preview

# Type Generation
bun run cf-typegen

# Deploy to Cloudflare
bun run deploy
```

**[!NOTE]** Uses Bun for fastest installs. npm/yarn also work.

## 📖 Usage

### Frontend
- **Routing**: Use `createBrowserRouter` in `src/main.tsx`. Add pages with `errorElement: <RouteErrorBoundary />`
- **API Calls**: `api<T>('/api/users')` from `@/lib/api-client`. Full type safety via `shared/types.ts`
- **Components**: Import Shadcn from `@/components/ui/*` (Button, Card, etc.)
- **Layout**: Wrap with `AppLayout` for sidebar (`src/components/layout/AppLayout.tsx`)

### Backend (Worker)
- **Add Routes**: `worker/user-routes.ts` → `app.get('/api/users', ...)`
- **Entities**: Extend `IndexedEntity` in `worker/entities.ts`. Auto-indexing/pagination/seeding
- **Example**:
```ts
// worker/entities.ts
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static seedData = MOCK_USERS;
}

// worker/user-routes.ts
app.get('/api/users', async (c) => {
  return ok(c, await UserEntity.list(c.env));
});
```

**Bindings**: Only `GlobalDurableObject` available (managed library). No config changes.

### Shared Types
- Define in `shared/types.ts` → Auto-TypeScript across frontend/worker
- `ApiResponse<T>`: `{ success: boolean, data?: T, error?: string }`

## 🧪 Development

```bash
# Watch dependencies & clear caches automatically
bun run dev

# TypeScript types from worker
bun run cf-typegen

# Lint
bun run lint

# Build
bun run build
```

**Hot Reload**: Full HMR for React + auto-worker sync. Edits to `worker/*` hot-reload in ~1s.

**Error Handling**:
- `RouteErrorBoundary` for router errors
- `ErrorBoundary` wraps app
- Automatic `/api/client-errors` reporting

## ☁️ Deployment

1. **Build**: `bun run build`
2. **Deploy**: `bun run deploy` (or `wrangler deploy`)
3. **Custom Domain**: Update via Cloudflare Dashboard

```bash
# Production deploy
bun run deploy
```

**Observability**: Enabled by default (`wrangler.jsonc`).

[![[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/bilbywilby/veritas-lens-bias-minimized-news-architect)]](https://deploy.workers.cloudflare.com/?url=${repositoryUrl})

**Bindings**: Production uses same single `GlobalDurableObject` (migrates automatically).

## 📚 Documentation

- [Usage Guide](prompts/usage.md)
- [Storage Patterns](prompts/usage.md#storage-patterns)
- [API Examples](prompts/usage.md#api-patterns)

## 🤝 Contributing

1. Fork & clone
2. `bun install`
3. `bun run dev`
4. Submit PR

## ⚠️ Important Notes

- **DO NOT** modify `wrangler.jsonc` or add bindings
- **DO NOT** edit `worker/core-utils.ts` (storage library)
- Replace `src/pages/HomePage.tsx` demo with your UI
- Shadcn components in `src/components/ui/*`—use directly

## 📄 License

MIT - see [LICENSE](LICENSE)