import katex from 'katex';
import { Fragment, useEffect, useMemo, useRef } from 'react';
/** Renders a LaTeX string with KaTeX. Inline by default; `block` for display equations. */
export function Tex({
  children,
  block = false,
  className,
}: {
  children: string;
  block?: boolean;
  className?: string;
}) {
  const html = useMemo(
    () => katex.renderToString(children, { displayMode: block, throwOnError: false, strict: 'ignore' }),
    [children, block],
  );
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    // Equations that overflow scroll horizontally; make only those keyboard reachable.
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (el.scrollWidth > el.clientWidth + 1) el.tabIndex = 0;
      else el.removeAttribute('tabindex');
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [html]);
  const Tag = block ? 'div' : 'span';
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={(block ? 'tex-block' : 'tex') + (className ? ' ' + className : '')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
/** Prose with `$inline$` and `$$display$$` math, and **bold** emphasis. */
export function Prose({ children, as = 'p' }: { children: string; as?: 'p' | 'span' }) {
  const parts = children.split(/(\$\$[^$]+\$\$|\$[^$]+\$|\*\*[^*]+\*\*)/g).filter(Boolean);
  const content = parts.map((part, i) =>
    part.startsWith('$$') ? (
      <Tex key={i} block>
        {part.slice(2, -2)}
      </Tex>
    ) : part.startsWith('$') ? (
      <Tex key={i}>{part.slice(1, -1)}</Tex>
    ) : part.startsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
  // Display math cannot live inside <p>; fall back to a div when present.
  if (as === 'span') return <span>{content}</span>;
  return children.includes('$$') ? <div className="prose-p">{content}</div> : <p>{content}</p>;
}
