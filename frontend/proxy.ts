import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/reset-senha", "/inicio"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));

  // Raiz sem login: serve a landing pública sem mudar a URL (rewrite, não
  // redirect) — visitante deslogado vê "/" como a home de marketing;
  // autenticado continua vendo o Dashboard normalmente na mesma rota.
  if (!token && pathname === "/") {
    return NextResponse.rewrite(new URL("/inicio", request.url));
  }

  // Autenticado a tentar aceder ao login → manda para o dashboard
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Não autenticado a tentar aceder a rota protegida → manda para login
  if (!token && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Rotas /api/* tem sua propria verificacao JWT real (ver lib/auth-jwt.ts) e
  // devolvem JSON 401 — nao devem passar pelo redirect de pagina deste middleware.
  //
  // Ficheiros estaticos de /public ficam igualmente de fora. Sem isso o proxy
  // responde-lhes com o redirect 307 para /login e o browser recebe o HTML do
  // login no lugar do binario — foi exatamente o que impediu o <video> do hero
  // da landing de abrir (DEMUXER_ERROR_COULD_NOT_OPEN). As extensoes sao
  // listadas explicitamente, em vez de um \.\w+$ generico, pra nao tornar
  // publica por acidente uma rota futura que tenha ponto no caminho.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:mp4|webm|ogg|mp3|wav|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|txt|xml|webmanifest|pdf)$).*)",
  ],
};
