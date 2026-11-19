import { Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Context from "./pages/Context";
import OwnerInbox from "./pages/OwnerInbox";
import OwnerDashboard from "./pages/OwnerDashboard";
import Kitchen from "./pages/Kitchen";
import Emails from "./pages/Emails";
import Crm from "./pages/Crm";
import Settings from "./pages/Settings";
import MenuAdmin from "./pages/MenuAdmin";
import Export from "./pages/Export";
import NotFound from "./pages/NotFound";
import StaffLogin from "./pages/StaffLogin";
import AcceptQuote from "./pages/AcceptQuote";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Index />,
  },
  { path: "/inquire", name: "inquire", element: <Navigate to="/" replace /> },
  { path: "/context", name: "context", element: <Context /> },
  { path: "/owner", name: "owner", element: <OwnerInbox /> },
  { path: "/dashboard", name: "dashboard", element: <OwnerDashboard /> },
  { path: "/kitchen", name: "kitchen", element: <Kitchen /> },
  { path: "/staff-login", name: "staff-login", element: <StaffLogin /> },
  { path: "/emails", name: "emails", element: <Emails /> },
  { path: "/crm", name: "crm", element: <Crm /> },
  { path: "/settings", name: "settings", element: <Settings /> },
  { path: "/menu", name: "menu", element: <MenuAdmin /> },
  { path: "/export", name: "export", element: <Export /> },
  { path: "/accept/:token", name: "accept-quote", element: <AcceptQuote /> },
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
