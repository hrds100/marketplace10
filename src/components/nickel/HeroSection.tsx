import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section data-feature="NICKEL" className="bg-background min-h-[calc(100vh-4rem)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex items-center w-full relative z-10">
        <div className="max-w-xl">
          <h1 data-feature="NICKEL__HERO_HEADING" className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-foreground leading-[1.05]">
            Unlock growth with every payment
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Run payments, extend net terms and automate collections compliance.
          </p>
          <div data-feature="NICKEL__HERO_CTA" className="mt-10 flex flex-wrap gap-4">
            <Button variant="hero" size="xl">
              Get started
            </Button>
            <Button variant="hero-outline" size="xl">
              Talk to a human
            </Button>
          </div>
        </div>
      </div>

      {/* Video — right side, desktop only */}
      <div className="absolute top-0 right-0 w-[55%] h-full hidden lg:block z-0 bg-muted">
        <video
          data-feature="NICKEL__HERO_VIDEO"
          className="w-full h-full object-cover rounded-bl-2xl"
          autoPlay
          loop
          muted
          playsInline
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_192508_4eecde4c-f835-4f4b-b255-eafd1156da99.mp4"
        />
      </div>
    </section>
  );
};

export default HeroSection;
