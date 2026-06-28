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
    <Link href={`/explore?category=${category}`} className="block group outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="h-full hover:border-primary/50 transition-colors bg-card/50 hover:bg-card">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            {icon}
          </div>
          <span className="font-medium text-sm group-hover:text-primary transition-colors">
            {title}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
