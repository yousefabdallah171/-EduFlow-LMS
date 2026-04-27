import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout/RootLayout";
import { AppRoutes, AuthBootstrap, SessionKeepAlive } from "@/lib/router";

const App = () => {
  useEffect(() => {
    document.dispatchEvent(new Event("render-event"));
  }, []);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthBootstrap />
      <SessionKeepAlive />
      <RootLayout>
        <AppRoutes />
      </RootLayout>
    </BrowserRouter>
  );
};

export default App;
