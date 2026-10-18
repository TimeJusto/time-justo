import { Navigate } from "react-router-dom";
import { Layout } from "@/components/layout";
import Cadastro from "@/pages/Cadastro";
import ElencoDoDia from "@/pages/ElencoDoDia";
import Times from "@/pages/Times";
import Configuracoes from "@/pages/Configuracoes";
import Historico from "@/pages/Historico";
import Privacidade from "@/pages/Privacidade";
import Sobre from "@/pages/Sobre";
import Entrar from "@/pages/Entrar";
import CriarConta from "@/pages/CriarConta";
import EsqueciSenha from "@/pages/EsqueciSenha";
import RedefinirSenha from "@/pages/RedefinirSenha";
import ExcluirConta from "@/pages/ExcluirConta";
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
      { path: "entrar", name: "entrar", element: <Entrar /> },
      { path: "criar-conta", name: "criar-conta", element: <CriarConta /> },
      { path: "esqueci-senha", name: "esqueci-senha", element: <EsqueciSenha /> },
      { path: "redefinir-senha", name: "redefinir-senha", element: <RedefinirSenha /> },
      { path: "privacidade", name: "privacidade", element: <Privacidade /> },
      { path: "sobre", name: "sobre", element: <Sobre /> },
      { path: "excluir-conta", name: "excluir-conta", element: <ExcluirConta /> },
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
