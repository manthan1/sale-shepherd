import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold mb-4 sm:mb-6 text-foreground">404</h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8">Oops! Page not found</p>
        <a 
          href="/" 
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm sm:text-base"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
