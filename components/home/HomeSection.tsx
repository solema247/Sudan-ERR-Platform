import React, { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type HomeSectionProps = {
  title: string;
  href: string;
  children: ReactNode;
};

/** Headspace-style section: title + chevron, then a horizontal card row. */
export function HomeSection({ title, href, children }: HomeSectionProps) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 min-w-0"
          aria-label={`Open ${title}`}
        >
          <h2 className="text-lg font-bold text-white leading-tight group-hover:text-brand-orange transition-colors">
            {title}
          </h2>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-brand-orange group-hover:bg-brand-orange group-hover:text-[#152238] transition-colors">
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </span>
        </Link>
      </div>
      <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
          {children}
        </div>
      </div>
    </section>
  );
}

type HomeCardProps = {
  href?: string;
  onClick?: () => void;
  code?: string;
  title: string;
  subtitle?: string;
  /** Flat scene drawn in the wash (not a Lucide icon) */
  illustration: React.ComponentType<{ className?: string }>;
  /** Top wash (peach / blue) */
  wash: string;
  disabled?: boolean;
  disabledLabel?: string;
  /** Wider cards for hub menus (default carousel width) */
  size?: 'sm' | 'md';
};

export function HomeCard({
  href,
  onClick,
  code,
  title,
  subtitle,
  illustration: Illustration,
  wash,
  disabled,
  disabledLabel = 'Soon',
  size = 'sm',
}: HomeCardProps) {
  const width = size === 'md' ? 'w-[11.5rem] sm:w-[12.5rem]' : 'w-[10.5rem]';
  const className = `snap-start shrink-0 ${width} overflow-hidden rounded-2xl border border-white/10 shadow-lift flex flex-col text-start ${
    disabled
      ? 'opacity-55 cursor-not-allowed'
      : 'hover:border-brand-orange/40 active:scale-[0.98] transition-all duration-150'
  }`;

  const body = (
    <>
      <div className={`relative h-[6.75rem] overflow-hidden ${wash}`}>
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-1 px-2.5 pt-2">
          {code ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#152238]/80 bg-white/75 px-1.5 py-0.5 rounded-md">
              {code}
            </span>
          ) : (
            <span />
          )}
          {disabled && (
            <span className="text-[10px] font-semibold text-[#152238]/70 bg-white/60 px-1.5 py-0.5 rounded-md">
              {disabledLabel}
            </span>
          )}
        </div>
        <Illustration className="absolute inset-0 h-full w-full" />
      </div>
      <div className="bg-[#152238] px-3 py-3 flex-1">
        <span className="block font-bold text-white text-sm leading-snug">{title}</span>
        {subtitle && (
          <span className="block text-[11px] text-[#a8b6cc] mt-0.5 leading-snug">{subtitle}</span>
        )}
      </div>
    </>
  );

  if (disabled) {
    return (
      <div className={className} aria-disabled>
        {body}
      </div>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }

  if (!href) {
    return (
      <div className={className} aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
