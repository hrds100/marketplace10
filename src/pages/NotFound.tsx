import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div data-feature="SHARED" className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <div data-feature="SHARED__404_MESSAGE">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">{t('page.notFoundTitle')}</p>
        </div>
        <a data-feature="SHARED__404_HOME" href="/" className="text-primary underline hover:text-primary/90">
          {t('page.returnHome')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
