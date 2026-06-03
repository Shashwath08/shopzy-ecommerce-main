import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    img: "https://images.unsplash.com/photo-1758274252497-fa3e681f283a?w=1600&q=80",
    eyebrow: "Spring Sale",
    title: "Fashion that moves you",
    sub: "Up to 60% off across brands · Free shipping over ₹499",
    cta: "Shop Fashion",
    href: "/products?category=fashion",
    align: "left",
  },
  {
    img: "https://images.unsplash.com/photo-1760087616415-62270db23966?w=1600&q=80",
    eyebrow: "Tech Week",
    title: "Smart living, redefined",
    sub: "Latest gadgets, smarter homes, sharper screens",
    cta: "Explore Electronics",
    href: "/products?category=electronics",
    align: "left",
  },
  {
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&q=80",
    eyebrow: "Home Edit",
    title: "Upgrade your everyday",
    sub: "Coffee makers, vacuums, mixers — at their best price",
    cta: "Shop Home Appliances",
    href: "/products?category=home",
    align: "right",
  },
];

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [idx, setIdx] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIdx(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    const t = setInterval(() => emblaApi.scrollNext(), 5500);
    return () => { emblaApi.off("select", onSelect); clearInterval(t); };
  }, [emblaApi]);

  return (
    <section className="relative w-full overflow-hidden bg-nav-dark" data-testid="hero-carousel">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((s, i) => (
            <div key={i} className="relative flex-[0_0_100%] min-w-0 h-[300px] sm:h-[420px] lg:h-[520px]">
              <img src={s.img} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 ${s.align === "right" ? "bg-gradient-to-l from-black/70 via-black/40 to-transparent" : "bg-gradient-to-r from-black/70 via-black/40 to-transparent"}`} />
              <div className={`relative max-w-7xl mx-auto px-6 lg:px-12 h-full flex flex-col justify-center ${s.align === "right" ? "items-end text-right" : "items-start text-left"}`}>
                <span className="uppercase tracking-widest text-[#FF9900] text-xs sm:text-sm font-semibold mb-3 animate-fade-up">{s.eyebrow}</span>
                <h1 className="text-white font-heading text-4xl sm:text-5xl lg:text-6xl font-bold max-w-xl leading-tight animate-fade-up">{s.title}</h1>
                <p className="text-gray-200 mt-3 max-w-md text-sm sm:text-base animate-fade-up">{s.sub}</p>
                <Link to={s.href} className="mt-6 animate-fade-up">
                  <Button className="bg-[#FF9900] hover:bg-[#E68A00] text-[#131921] font-semibold px-7 h-11" data-testid={`hero-cta-${i}`}>{s.cta}</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={scrollPrev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur p-2 rounded-full text-white transition" aria-label="Previous slide" data-testid="hero-prev">
        <ChevronLeft />
      </button>
      <button onClick={scrollNext} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur p-2 rounded-full text-white transition" aria-label="Next slide" data-testid="hero-next">
        <ChevronRight />
      </button>

      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => emblaApi && emblaApi.scrollTo(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-[#FF9900]" : "w-2 bg-white/50"}`} aria-label={`Go to slide ${i+1}`} />
        ))}
      </div>
    </section>
  );
}
