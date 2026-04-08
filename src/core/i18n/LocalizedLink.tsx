import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localePath } from './useLocale';
import { DEFAULT_LOCALE, type SupportedLocale } from './constants';

/**
 * Drop-in replacement for React Router's <Link> that auto-prefixes
 * the current locale to the path.
 *
 * Usage: <LocalizedLink to="/dashboard/deals">Deals</LocalizedLink>
 * In Portuguese: renders href="/pt-br/dashboard/deals"
 * In English: renders href="/dashboard/deals" (no prefix)
 */
const LocalizedLink = forwardRef<HTMLAnchorElement, LinkProps>(
  function LocalizedLink({ to, ...rest }, ref) {
    const { i18n } = useTranslation();
    const locale = (i18n.language || DEFAULT_LOCALE) as SupportedLocale;

    // Only prefix string paths that start with /
    const prefixedTo =
      typeof to === 'string' && to.startsWith('/')
        ? localePath(to, locale)
        : to;

    return <Link ref={ref} to={prefixedTo} {...rest} />;
  }
);

export default LocalizedLink;
