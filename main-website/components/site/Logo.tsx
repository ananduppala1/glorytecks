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
      priority
      className="h-12 w-12 object-contain transition-smooth group-hover:scale-105"
    />
    <div className="leading-tight">
      <div className="text-lg font-bold gradient-text">GloryTecks</div>
      <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Learn · Build · Glow</div>
    </div>
  </Link>
);

export default Logo;
