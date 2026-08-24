// Worker Cloudflare — assina uploads de foto pro Cloudinary só pra quem
// está de verdade logado no Calend.rio.
//
// Por quê isso existe: o Calend.rio não tem servidor com banco de segredos
// (o backend só serve arquivos estáticos), então não dá pra guardar a
// "senha secreta" do Cloudinary no navegador sem qualquer um poder
// descobrir e usar. Esse Worker é o único lugar que conhece essa senha —
// ele confere com o Firebase se quem está pedindo pra enviar uma foto é
// mesmo uma conta válida do sistema, e só então devolve uma "assinatura"
// de uso único que autoriza aquele envio específico.
//
// Variáveis de ambiente que esse Worker precisa (configurar no painel da
// Cloudflare, em Settings > Variables and Secrets, todas como "Secret"):
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
//   FIREBASE_WEB_API_KEY   (o "apiKey" que está em public/firebase-config.js)
//   FIREBASE_PROJECT_ID    (= "calendario-3b725")
//
// ORIGEM_PERMITIDA: troque pelo endereço real onde o Calend.rio fica
// publicado (ex: a URL do Render), pra só esse site poder chamar isso.
const ORIGEM_PERMITIDA = "https://SEU-APP.onrender.com";

function cabecalhosCors() {
  return {
    "Access-Control-Allow-Origin": ORIGEM_PERMITIDA,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

function respostaJson(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "Content-Type": "application/json", ...cabecalhosCors() },
  });
}

async function sha1Hex(texto) {
  const dados = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-1", dados);
  return [...new Uint8Array(hashBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Confere o token de login do Firebase e devolve o UID, ou { erro } se inválido/expirado.
async function verificarLogin(idToken, env) {
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return { erro: dados.error?.message || `HTTP ${resp.status} do Firebase` };
  }
  const uid = dados.users?.[0]?.localId;
  if (!uid) return { erro: "Token válido mas sem usuário associado." };
  return { uid };
}

// No Calend.rio qualquer conta cadastrada pode enviar foto — não tem
// conceito de admin/bloqueado aqui, só "tem conta = usuário do sistema".
// Ainda assim confere no Firestore que o documento users/{uid} existe,
// pra recusar um token válido de outro projeto Firebase qualquer.
async function podeEnviarFoto(uid, idToken, env) {
  const resp = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  return resp.ok;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cabecalhosCors() });
    }
    if (request.method !== "POST") {
      return respostaJson({ erro: "Método não permitido." }, 405);
    }

    const cabecalhoAuth = request.headers.get("Authorization") || "";
    const idToken = cabecalhoAuth.replace(/^Bearer\s+/i, "");
    if (!idToken) return respostaJson({ erro: "Faça login primeiro." }, 401);

    const resultadoLogin = await verificarLogin(idToken, env);
    if (resultadoLogin.erro) return respostaJson({ erro: "Falha no login: " + resultadoLogin.erro }, 401);
    const uid = resultadoLogin.uid;

    const autorizado = await podeEnviarFoto(uid, idToken, env);
    if (!autorizado) return respostaJson({ erro: "Sem permissão pra enviar foto." }, 403);

    let corpo = {};
    try {
      corpo = await request.json();
    } catch (e) {
      // corpo vazio é aceitável — nem toda foto precisa de folder/publicId
    }

    // Monta só os parâmetros que essa foto específica vai usar. TUDO que é
    // enviado pro Cloudinary depois precisa ter sido assinado aqui — não dá
    // pra acrescentar nada por fora sem invalidar a assinatura.
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { timestamp };
    if (corpo.folder) params.folder = String(corpo.folder);
    if (corpo.publicId) params.public_id = String(corpo.publicId);
    if (corpo.overwrite) params.overwrite = "true";

    const paramsOrdenados = Object.keys(params)
      .sort()
      .map((chave) => `${chave}=${params[chave]}`)
      .join("&");
    const signature = await sha1Hex(paramsOrdenados + env.CLOUDINARY_API_SECRET);

    return respostaJson({
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      folder: params.folder,
      publicId: params.public_id,
      overwrite: params.overwrite,
    });
  },
};
