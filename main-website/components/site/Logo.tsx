import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";

const Logo = () => (
  <Link href="/" className="flex items-center gap-2 group">
    <Image
      src={logo}
      alt="GloryTecks logo"
      width={48}
      height={48}
      // Deliberately NOT `priority`. The logo is a 48px mark in the header of
      // every page; preloading it competes for bandwidth with the actual LCP
      // element (the hero image on the home and about pages, the H1 elsewhere).
      // Only those two heroes carry `priority`.
      className="h-12 w-12 object-contain transition-smooth group-hover:scale-105"
    />
    <div className="leading-tight">
      <div className="text-lg font-bold gradient-text">GloryTecks</div>
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Learn · Build · Glow</div>
    </div>
  </Link>
);

export default Logo;
