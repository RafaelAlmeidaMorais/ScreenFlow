import Image from "next/image";
import { cn } from "@/lib/utils";

// /public/logo.svg: "Screen" in orange and "Flow" in white, made for dark
// backgrounds. Its proportion is about 6.35 : 1, so the height sets the size.
const LOGO_WIDTH = 2602;
const LOGO_HEIGHT = 410;

export function BrandLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.svg"
      alt="ScreenFlow"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn("h-7 w-auto", className)}
    />
  );
}
