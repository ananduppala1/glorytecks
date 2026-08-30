import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Not-found state for routes inside the site chrome — an unknown course slug,
 * comparison, blog category or location landing.
 *
 * Reproduces the inline "not found" blocks the React pages rendered (course,
 * comparison, landing), but with the header and footer intact and a real 404
 * status code instead of a 200.
 */
export default function SiteNotFound() {
  return (
    <section className="container-px mx-auto max-w-3xl py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground mt-3">
        The page you&rsquo;re looking for doesn&rsquo;t exist or was moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="hero">
          <Link href="/courses">Browse Courses</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </section>
  );
}
