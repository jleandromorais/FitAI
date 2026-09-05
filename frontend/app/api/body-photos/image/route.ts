import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { verifyAuthToken } from "@/lib/auth-jwt";

// Único jeito de LER uma foto de evolução — o blob é privado (ver
// app/api/body-photos/route.ts), então a URL guardada no banco não é
// diretamente acessível. Esta rota busca o conteúdo no Blob com o
// BLOB_READ_WRITE_TOKEN (nunca exposto ao browser) e repassa como imagem.
//
// Autorização em duas camadas: (1) precisa de JWT válido — qualquer usuário
// logado; (2) o pathname da foto no Blob é sempre prefixado com o email do
// dono (`body-photos/<email>/...`, ver route.ts do upload), então um
// usuário autenticado só consegue ler fotos cujo pathname comece com o
// próprio email — não dá pra ler a foto de outro usuário só por saber a URL.
export async function GET(req: NextRequest) {
  const userEmail = await verifyAuthToken(req);
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "URL da foto ausente." }, { status: 400 });
  }

  let pathname: string;
  try {
    pathname = new URL(url).pathname.replace(/^\/+/, "");
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }
  if (!pathname.startsWith(`body-photos/${userEmail}/`)) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  try {
    const result = await get(url, { access: "private" });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Falha ao ler foto de evolução:", err);
    return NextResponse.json({ error: "Erro ao carregar a foto." }, { status: 500 });
  }
}
