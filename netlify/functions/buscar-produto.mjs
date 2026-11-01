// netlify/functions/buscar-produto.mjs
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ mensagem: "Método não permitido" }), { status: 405 });
  }

  try {
    const { url } = await req.json();

    if (!url || !url.startsWith("http")) {
      return new Response(JSON.stringify({ mensagem: "URL inválida" }), { status: 400 });
    }

    const resposta = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!resposta.ok) {
      return new Response(JSON.stringify({ mensagem: "Página não encontrada" }), { status: 404 });
    }

    const html = await resposta.text();

    // Extrai todos os <h2> via regex
    const todosH2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
      .map((m) => {
        let textoConteudo = m[1];
        // Remove tags estruturais internas e seus conteúdos (ex: <span>subtitulo</span>, <small>...</small>)
        textoConteudo = textoConteudo.replace(/<(span|small|p|b)[^>]*>[\s\S]*?<\/\1>/gi, "");
        // Limpa qualquer outra tag HTML restante e remove espaços extras
        return textoConteudo.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      })
      .filter((t) => t.length >= 4);

    // Pula o primeiro h2 (nome da empresa) e pega o segundo (nome do produto)
    const nome = todosH2.length >= 2 ? todosH2[1] : todosH2[0] ?? null;

    if (!nome) {
      return new Response(JSON.stringify({ mensagem: "Nome não encontrado" }), { status: 404 });
    }

    return new Response(JSON.stringify({ nome }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("buscar-produto:", e);
    return new Response(JSON.stringify({ mensagem: "Erro ao aceder ao link" }), { status: 500 });
  }
}
