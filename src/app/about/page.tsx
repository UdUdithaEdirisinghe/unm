// src/app/about/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = { title: "About Us • Manny.lk" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-white">Our Story</h1>
      <p className="mt-2 mb-6 text-slate-300">
        We’re two university students who share the same passion: making technology more
        accessible for everyone in Sri Lanka. What started as late-night discussions about
        gadgets and problem-solving has grown into <strong>Manny.lk</strong> — a place where
        you can find reliable tech accessories without the inflated price tags.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">Our Mission</h2>
      <p className="mt-2 mb-6 text-slate-300">
        Our goal is simple: to deliver <strong>high-quality tech essentials</strong> that
        fit every budget. Whether you’re a student looking for an affordable cable, a
        professional in need of a premium charger, or anyone who just wants reliable gear —
        we’ve got you covered.
      </p>

      <h2 className="text-xl font-semibold text-white mt-8">What We Offer</h2>
      <ul className="mt-2 mb-6 list-disc list-inside text-slate-300 space-y-2">
        <li>Everyday essentials at fair prices</li>
        <li>Mid-range products with a balance of quality &amp; value</li>
        <li>High-end gear for top performance and durability</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">Why Choose Us</h2>
      <ul className="mt-2 mb-6 list-disc list-inside text-slate-300 space-y-2">
        <li>We’re not just resellers — we’re tech users ourselves</li>
        <li>Every product is hand-picked and tested</li>
        <li>Transparent, fair pricing with no hidden surprises</li>
        <li>Local support and trusted service</li>
      </ul>

      <h2 className="text-xl font-semibold text-white mt-8">Our Vision</h2>
      <p className="mt-2 text-slate-300">
        From our small beginnings as students, we aim to build a brand that people trust — a
        marketplace where anyone in Sri Lanka can shop for tech with confidence, knowing
        they’re getting both <strong>value and reliability</strong>.
      </p>
    </section>
  );
}