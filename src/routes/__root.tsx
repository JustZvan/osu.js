import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen w-screen">
      <Outlet />
    </div>
  ),
})
