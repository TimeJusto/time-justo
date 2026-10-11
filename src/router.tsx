import { Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import Cadastro from "@/pages/Cadastro";
import ElencoDoDia from "@/pages/ElencoDoDia";
import Times from "@/pages/Times";
import Configuracoes from "@/pages/Configuracoes";
import Historico from "@/pages/Historico";
import Privacidade from "@/pages/Privacidade";
import Sobre from "@/pages/Sobre";
import NotFound from "@/pages/NotFound";

export const routers = [
  {
    path: "/",
    name: "app",
    element: <Layout />,
    children: [
      {
        index: true,
        name: "home",
        element: <Navigate to="/times" replace />,
      },
      { path: "cadastro", name: "cadastro", element: <Cadastro /> },
      { path: "elenco", name: "elenco", element: <ElencoDoDia /> },
      { path: "times", name: "times", element: <Times /> },
      { path: "configuracoes", name: "configuracoes", element: <Configuracoes /> },
      { path: "historico", name: "historico", element: <Historico /> },
      { path: "privacidade", name: "privacidade", element: <Privacidade /> },
      { path: "sobre", name: "sobre", element: <Sobre /> },
    ],
  },
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
