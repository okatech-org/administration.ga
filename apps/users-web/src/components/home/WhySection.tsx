import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Lock, Zap, Globe, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const AdvantageCard = ({
  icon,
  titleKey,
  descriptionKey,
  color,
  delay,
}: {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  color: "blue" | "yellow" | "purple" | "green";
  delay: number;
}) => {
  const { t } = useTranslation();

  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-500",
    yellow: "bg-yellow-500/20 text-yellow-500",
    purple: "bg-purple-500/20 text-purple-500",
    green: "bg-green-500/20 text-green-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <Card className="text-center h-full">
        <CardContent className="p-6 space-y-4">
          <div
            className={cn(
              "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center",
              colorClasses[color],
            )}
          >
            {icon}
          </div>
          <h3 className="font-bold text-lg">{t(titleKey)}</h3>
          <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export function WhySection() {
  const { t } = useTranslation();

  return (
    <section className="relative z-10 py-16 px-4 lg:px-8 bg-background">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold mb-3">{t("why.title")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("why.subtitle")}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdvantageCard
            icon={<Lock className="w-8 h-8" />}
            titleKey="why.secure.title"
            descriptionKey="why.secure.description"
            color="blue"
            delay={0}
          />
          <AdvantageCard
            icon={<Zap className="w-8 h-8" />}
            titleKey="why.fast.title"
            descriptionKey="why.fast.description"
            color="yellow"
            delay={0.1}
          />
          <AdvantageCard
            icon={<Globe className="w-8 h-8" />}
            titleKey="why.accessible.title"
            descriptionKey="why.accessible.description"
            color="purple"
            delay={0.2}
          />
          <AdvantageCard
            icon={<Smartphone className="w-8 h-8" />}
            titleKey="why.modern.title"
            descriptionKey="why.modern.description"
            color="green"
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}
