import { BrowserRouter } from "react-router-dom";

import { RootLayout } from "@/components/layout/RootLayout";
import { AppRoutes, AuthBootstrap } from "@/lib/router";

const App = () => (
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <AuthBootstrap />
    <RootLayout>
      <AppRoutes />
    </RootLayout>
  </BrowserRouter>
);

export default App;
