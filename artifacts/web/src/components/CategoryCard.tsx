import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface CategoryCardProps {
  title: string;
  icon: ReactNode;
  category: string;
}

export function CategoryCard({ title, icon, category }: CategoryCardProps) {
  return (
    <Link href={`/explore?category=${category}`} className="block group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
      <Card className="h-full border-border/60 hover:border-primary/40 transition-all duration-300 bg-card hover:bg-muted/20 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4 relative">
          <div className="absolute inset-0 bg-noise opacity-0 group-hover:opacity-100 transition-opacity duration-300 mix-blend-overlay"></div>
          <div className="p-4 rounded-full bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 relative z-10">
            {icon}
          </div>
          <span className="font-serif font-bold text-lg group-hover:text-primary transition-colors duration-300 relative z-10">
            {title}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
