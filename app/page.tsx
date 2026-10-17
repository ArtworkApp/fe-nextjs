import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <header>
          <Link className="text-lg font-semibold" href="/">ArtworkApp</Link>
        </header>
        <section className="py-24 sm:py-32">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
            Discover original art
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold sm:text-6xl">
            Find artwork that feels like yours.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-stone-600">
            Explore works from artists around the world.
          </p>
          <Link
            className="mt-8 inline-flex rounded-full bg-stone-900 px-6 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
            href="/artworks"
          >
            Browse artworks
          </Link>
        </section>
      </div>
    </main>
  );
}
