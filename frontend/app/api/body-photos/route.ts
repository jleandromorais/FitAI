import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { extractToken, verifyAuthToken } from "@/lib/auth-jwt";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

// Único ponto do app que toca o arquivo binário da foto. Faz upload pro
// Vercel Blob (BLOB_READ_WRITE_TOKEN — variável de ambiente que só existe
// aqui, nunca chega ao browser) e repassa só a URL resultante pro backend
// Spring Boot gravar, com o mesmo JWT do usuário. O backend nunca vê o
// arquivo em si — ver BodyPhoto.java (comentário "nunca o arquivo binário").
export async function POST(req: NextRequest) {
  const userEmail = await verifyAuthToken(req);
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Armazenamento de fotos não configurado." }, { status: 500 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    const muscleGroup = form.get("muscleGroup");
    const capturedAt = form.get("capturedAt");

    if (!(file instanceof File) || typeof muscleGroup !== "string" || typeof capturedAt !== "string") {
      return NextResponse.json({ error: "Dados do formulário inválidos." }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "O arquivo precisa ser uma imagem." }, { status: 400 });
    }

    const blob = await put(`body-photos/${userEmail}/${Date.now()}-${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const token = extractToken(req);
    const backendRes = await fetch(`${API_URL}/body-photos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ muscleGroup, photoUrl: blob.url, capturedAt }),
    });

    if (!backendRes.ok) {
      const err = await backendRes.text();
      console.error("Erro ao salvar metadado da foto:", backendRes.status, err);
      return NextResponse.json({ error: "Erro ao salvar a foto. Tente novamente." }, { status: 502 });
    }

    const saved = await backendRes.json();
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("Falha no upload de foto de evolução:", err);
    return NextResponse.json({ error: "Erro ao enviar a foto. Tente novamente." }, { status: 500 });
  }
}
