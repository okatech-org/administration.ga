import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Separator } from "@workspace/ui/components/separator";
import { Quote, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: string;
}

export interface AnimatedTestimonialsProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  testimonials?: Testimonial[];
  autoRotateInterval?: number;
  trustedCompanies?: string[];
  trustedCompaniesTitle?: string;
  className?: string;
}

const defaultTestimonials: Testimonial[] = [
  {
    id: 1,
    name: "Marie Nguema",
    role: "Residente",
    company: "Paris, France",
    content:
      "J'ai renouvele mon passeport en quelques clics. Plus besoin de faire la queue au consulat. La plateforme est intuitive et le suivi en temps reel m'a rassure.",
    rating: 5,
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    id: 2,
    name: "Jean-Claude Mba",
    role: "Entrepreneur",
    company: "Bruxelles, Belgique",
    content:
      "L'inscription consulaire etait si simple. En 10 minutes c'etait fait. Je recommande cette plateforme a tous les Gabonais de la diaspora.",
    rating: 5,
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    id: 3,
    name: "Patricia Obiang",
    role: "Etudiante",
    company: "Montreal, Canada",
    content:
      "Le suivi en temps reel de ma demande d'acte de naissance m'a beaucoup rassure. Tout est transparent et les delais sont respectes.",
    rating: 5,
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    id: 4,
    name: "Alain Tonda",
    role: "Cadre",
    company: "Dakar, Senegal",
    content:
      "Enfin une plateforme moderne pour nos demarches consulaires ! L'assistance 24/7 est un vrai plus. Bravo a l'equipe.",
    rating: 5,
    avatar: "https://randomuser.me/api/portraits/men/46.jpg",
  },
];

export function AnimatedTestimonials({
  title = "La confiance de la diaspora",
  subtitle = "Decouvrez ce que les Gabonais du monde entier disent de notre plateforme consulaire.",
  badgeText = "Temoignages",
  testimonials = defaultTestimonials,
  autoRotateInterval = 6000,
  trustedCompanies = ["MAECI", "DGDI", "ONE", "CNAMGS", "ANPI"],
  trustedCompaniesTitle = "En partenariat avec les institutions gabonaises",
  className,
}: AnimatedTestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

  useEffect(() => {
    if (autoRotateInterval <= 0 || testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, autoRotateInterval);
    return () => clearInterval(interval);
  }, [autoRotateInterval, testimonials.length]);

  if (testimonials.length === 0) return null;

  return (
    <section
            className={`py-20 lg:py-32 overflow-hidden bg-[oklch(0.145_0_0)] text-white ${className || ""}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:gap-24"
        >
          {/* Gauche : titre + dots */}
          <motion.div variants={itemVariants} className="flex flex-col justify-center">
            <div className="space-y-6">
              {badgeText && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-[oklch(0.685_0.169_237.323)]">
                  <Star className="mr-1 h-3.5 w-3.5 fill-[oklch(0.685_0.169_237.323)] text-[oklch(0.685_0.169_237.323)]" />
                  <span>{badgeText}</span>
                </div>
              )}

              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-white">
                {title}
              </h2>

              <p className="max-w-[600px] text-[oklch(0.7_0_0)] md:text-xl/relaxed">
                {subtitle}
              </p>

              <div className="flex items-center gap-3 pt-4">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      activeIndex === index
                        ? "w-10 bg-[oklch(0.685_0.169_237.323)]"
                        : "w-2.5 bg-white/20"
                    }`}
                    aria-label={`Temoignage ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Droite : carte temoignage */}
          <motion.div
            variants={itemVariants}
            className="relative h-full min-h-[300px] md:min-h-[400px]"
          >
            <AnimatePresence mode="wait">
              {testimonials.map(
                (testimonial, index) =>
                  activeIndex === index && (
                    <motion.div
                      key={testimonial.id}
                      className="absolute inset-0"
                      initial={{ opacity: 0, x: 80, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -80, scale: 0.95 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      <div className="bg-[oklch(0.205_0_0)] border border-white/10 rounded-[10px] p-8 h-full flex flex-col">
                        <div className="mb-6 flex gap-1">
                          {Array(testimonial.rating)
                            .fill(0)
                            .map((_, i) => (
                              <Star
                                key={i}
                                className="h-5 w-5 fill-[oklch(0.685_0.169_237.323)] text-[oklch(0.685_0.169_237.323)]"
                              />
                            ))}
                        </div>

                        <div className="relative mb-6 flex-1">
                          <Quote className="absolute -top-2 -left-2 h-8 w-8 text-white/10 rotate-180" />
                          <p className="relative z-10 text-lg font-medium leading-relaxed text-white/90">
                            "{testimonial.content}"
                          </p>
                        </div>

                        <Separator className="my-4 bg-white/10" />

                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border border-white/20">
                            <AvatarImage
                              src={testimonial.avatar}
                              alt={testimonial.name}
                            />
                            <AvatarFallback>
                              {testimonial.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-white">
                              {testimonial.name}
                            </h3>
                            <p className="text-sm text-[oklch(0.7_0_0)]">
                              {testimonial.role}, {testimonial.company}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ),
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Logo cloud partenaires */}
        {trustedCompanies.length > 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="mt-24 text-center"
          >
            <h3 className="text-sm font-medium text-[oklch(0.7_0_0)] mb-8">
              {trustedCompaniesTitle}
            </h3>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-8">
              {trustedCompanies.map((company) => (
                <div
                  key={company}
                  className="text-2xl font-semibold text-white/30"
                >
                  {company}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
