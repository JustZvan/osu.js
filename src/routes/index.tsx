import { Link, createFileRoute } from '@tanstack/react-router'
import logoUrl from '@/assets/logomark.png'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-20 text-center sm:py-28">
        <img
          src={logoUrl}
          alt="osu.js logo"
          className="h-32 w-32 rounded-lg shadow-2xl ring-1 ring-white/10 sm:h-40 sm:w-40"
        />

        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            osu.js
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-zinc-300 sm:text-lg">
            A lightweight osu! engine that runs in a browser! Work in progress,
            some things inaccurate, may contain traces of bad code.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            to="/test"
            className="inline-flex items-center justify-center rounded-lg bg-yellow-400 px-6 py-3 font-semibold text-black shadow-lg shadow-yellow-400/20 ring-1 ring-yellow-300 transition hover:translate-y-0.5 hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
          >
            ▶ Play the demo!
          </Link>
        </div>

        <div className="text-zinc-400">song used in demo is bad apple!</div>
      </section>
    </main>
  )
}
