import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { prefetchRoute } from '../lib/routeModules';

// A drop-in replacement for react-router's <Link> that warms the target route's
// code chunk before the user commits to the navigation.
//
// - hover / focus / touch-start: prefetch immediately (desktop + keyboard).
// - prefetchOnVisible: also observe the link and prefetch once it scrolls near
//   the viewport. Useful for links inside cards further down a page; because
//   `import()` is memoised, many cards pointing at one route download it once.
//
// All original props (onClick, className, aria-*, ...) pass straight through.
export default function PrefetchLink({
  to,
  prefetchOnVisible = false,
  onMouseEnter,
  onFocus,
  onTouchStart,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const path = typeof to === 'string' ? to : to?.pathname;

  useEffect(() => {
    if (!prefetchOnVisible) return undefined;
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          prefetchRoute(path);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [prefetchOnVisible, path]);

  const warm = () => prefetchRoute(path);

  return (
    <Link
      ref={ref}
      to={to}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
