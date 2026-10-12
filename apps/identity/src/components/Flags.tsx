import { BadgeCheck, FlaskConical, LifeBuoy, ShieldCheck } from 'lucide-react';

const labels: Record<string, string> = {
  verified: 'Verified',
  beta: 'Beta',
  support: 'Support',
  official: 'Official',
};

const icons = {
  verified: BadgeCheck,
  beta: FlaskConical,
  support: LifeBuoy,
  official: ShieldCheck,
} as const;

export function Flags({ values = [] }: { values?: readonly string[] | undefined }) {
  return values.length ? (
    <span className="subject-flags" aria-label={values.map((value) => labels[value] ?? value).join(', ')}>
      {values.map((value) => (
        <span className="subject-flag" title={labels[value] ?? value} key={value}>
          {(() => {
            const Icon = icons[value as keyof typeof icons] ?? BadgeCheck;
            return <Icon size={14} strokeWidth={2.25} aria-hidden="true" />;
          })()}
          <span className="sr-only">{labels[value] ?? value}</span>
        </span>
      ))}
    </span>
  ) : null;
}
