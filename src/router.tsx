import Index from "./pages/Index";
import Context from "./pages/Context";
import OwnerInbox from "./pages/OwnerInbox";
import Kitchen from "./pages/Kitchen";
import Emails from "./pages/Emails";
import Crm from "./pages/Crm";
import NotFound from "./pages/NotFound";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Index />,
  },
  { path: "/inquire", name: "inquire", element: <Index /> },
  { path: "/context", name: "context", element: <Context /> },
  { path: "/owner", name: "owner", element: <OwnerInbox /> },
  { path: "/kitchen", name: "kitchen", element: <Kitchen /> },
  { path: "/emails", name: "emails", element: <Emails /> },
  { path: "/crm", name: "crm", element: <Crm /> },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
