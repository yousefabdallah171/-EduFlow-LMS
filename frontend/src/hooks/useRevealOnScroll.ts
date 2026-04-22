import { useEffect } from "react";

type RevealOnScrollOptions = {
  selector: string;
  threshold?: number;
  rootMargin?: string;
};

export const useRevealOnScroll = ({ selector, threshold = 0.12, rootMargin = "0px 0px -12% 0px" }: RevealOnScrollOptions) => {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!nodes.length) return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (prefersReducedMotion) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold, rootMargin }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [rootMargin, selector, threshold]);
};

