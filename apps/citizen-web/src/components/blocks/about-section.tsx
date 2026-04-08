import { Button } from "@workspace/ui/components/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export interface Achievement {
  label: string;
  value: string;
}

export interface AboutSectionProps {
  title?: string;
  description?: string;
  mainImage?: { src: string; alt: string };
  secondaryImage?: { src: string; alt: string };
  breakout?: {
    title: string;
    description: string;
    buttonText: string;
    buttonHref: string;
  };
  companiesTitle?: string;
  companies?: string[];
  achievementsTitle?: string;
  achievementsDescription?: string;
  achievements?: Achievement[];
}

export function AboutSection({
  title = "Pourquoi Consulat.ga ?",
  description = "Une plateforme moderne au service de la diaspora gabonaise dans le monde entier.",
  mainImage = {
    src: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=1200&auto=format&fit=crop",
    alt: "Bureau diplomatique",
  },
  secondaryImage = {
    src: "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=800&auto=format&fit=crop",
    alt: "Accompagnement citoyen",
  },
  breakout = {
    title: "Plateforme securisee et accessible 24/7",
    description:
      "Vos donnees sont protegees selon les standards internationaux. Accedez a vos demarches depuis n'importe quel pays.",
    buttonText: "Decouvrir les services",
    buttonHref: "/services",
  },
  companiesTitle = "En partenariat avec les institutions gabonaises",
  companies = ["MAECI", "DGDI", "ONE", "CNAMGS", "ANPI"],
  achievementsTitle = "Nos chiffres cles",
  achievementsDescription = "Des milliers de citoyens accompagnes a travers le monde dans leurs demarches consulaires.",
  achievements = [
    { label: "Citoyens accompagnes", value: "15K+" },
    { label: "Representations mondiales", value: "50+" },
    { label: "Services disponibles", value: "39" },
    { label: "Assistance permanente", value: "24/7" },
  ],
}: AboutSectionProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section className="py-20 lg:py-32">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Header split */}
        <motion.div
          variants={itemVariants}
          className="mb-14 grid gap-5 text-center md:grid-cols-2 md:text-left"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.02em]">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg self-end">{description}</p>
        </motion.div>

        {/* Grille asymetrique */}
        <motion.div variants={itemVariants} className="grid gap-6 lg:grid-cols-3">
          <img
            src={mainImage.src}
            alt={mainImage.alt}
            className="w-full h-full max-h-[620px] rounded-[10px] object-cover lg:col-span-2"
          />
          <div className="flex flex-col gap-6 md:flex-row lg:flex-col">
            {/* Breakout card */}
            <div className="flex flex-col justify-between gap-6 rounded-[10px] bg-muted border border-border p-7 md:w-1/2 lg:w-auto">
              <div>
                <p className="mb-2 text-lg font-semibold text-foreground">
                  {breakout.title}
                </p>
                <p className="text-muted-foreground">{breakout.description}</p>
              </div>
              <Button variant="outline" className="mr-auto gap-2 rounded-[10px]" asChild>
                <Link to={breakout.buttonHref}>
                  {breakout.buttonText}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            {/* Image secondaire */}
            <img
              src={secondaryImage.src}
              alt={secondaryImage.alt}
              className="grow basis-0 rounded-[10px] object-cover md:w-1/2 lg:min-h-0 lg:w-auto"
            />
          </div>
        </motion.div>

        {/* Logo cloud partenaires */}
        {companies.length > 0 && (
          <motion.div variants={itemVariants} className="py-20 lg:py-32">
            <p className="text-center text-muted-foreground">{companiesTitle}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-12 gap-y-6">
              {companies.map((company) => (
                <span
                  key={company}
                  className="text-xl md:text-2xl font-semibold text-muted-foreground/40"
                >
                  {company}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Stats KPI */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-[10px] bg-muted p-10 md:p-16"
        >
          <div className="flex flex-col gap-4 text-center md:text-left">
            <h3 className="text-4xl font-bold tracking-[-0.02em]">
              {achievementsTitle}
            </h3>
            <p className="max-w-screen-sm text-muted-foreground">
              {achievementsDescription}
            </p>
          </div>
          <div className="mt-10 flex flex-wrap justify-between gap-10 text-center">
            {achievements.map((item) => (
              <div className="flex flex-col gap-4" key={item.label}>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <span className="text-4xl font-semibold md:text-5xl text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
          {/* Grille decorative */}
          <div className="pointer-events-none absolute -top-1 right-1 z-10 hidden h-full w-full bg-[linear-gradient(to_right,oklch(0.556_0_0)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.556_0_0)_1px,transparent_1px)] bg-[size:80px_80px] opacity-[0.08] [mask-image:linear-gradient(to_bottom_right,#000,transparent,transparent)] md:block" />
        </motion.div>
      </motion.div>
    </section>
  );
}
