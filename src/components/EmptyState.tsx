import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  IconComponent?: LucideIcon; // Making icon optional
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void; // Made optional
    href?: string; // Added href
    icon?: LucideIcon;
  };
}

export function EmptyState({ IconComponent, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center shadow-sm">
      {IconComponent && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconComponent className="h-8 w-8" />
        </div>
      )}
      <h2 className="text-xl font-semibold text-card-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action && (
        action.href ? (
          <Button asChild className="mt-6">
            <Link href={action.href}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Link>
          </Button>
        ) : action.onClick ? (
          <Button onClick={action.onClick} className="mt-6">
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        ) : null
      )}
    </div>
  );
}
