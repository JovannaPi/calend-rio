import { auth } from "./firebase-config.js";

// Troque pela URL do seu Worker depois de publicá-lo no Cloudflare.
// Veja cloudflare-worker/worker.js e o README para o passo a passo.
export const URL_UPLOAD_FOTO = "https://calend-rio-fotos.SEU-SUBDOMINIO.workers.dev";

// Redimensiona/comprime a foto no navegador antes de enviar — senão uma
// foto de celular (4-8MB) come a cota gratuita do Cloudinary rapidinho.
function comprimirImagem(file, larguraMax = 1280, qualidade = 0.75) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    const urlTemp = URL.createObjectURL(file);
    imagem.onload = () => {
      const escala = Math.min(1, larguraMax / imagem.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      canvas.getContext("2d").drawImage(imagem, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(urlTemp);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao comprimir a imagem."))),
        "image/jpeg",
        qualidade
      );
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(urlTemp);
      reject(new Error("Não consegui ler essa imagem."));
    };
    imagem.src = urlTemp;
  });
}

// Pede uma assinatura autorizada ao Worker e envia a foto (já comprimida)
// direto pro Cloudinary. `destino` é { folder } para organizar por
// pasta (ex: "calend-rio/roles" ou "calend-rio/memorias/<livroId>").
export async function enviarFoto(file, destino) {
  if (!auth.currentUser) throw new Error("Faça login primeiro.");
  const blobComprimido = await comprimirImagem(file);
  const idToken = await auth.currentUser.getIdToken();

  const respAssinatura = await fetch(URL_UPLOAD_FOTO, {
    method: "POST",
    headers: { Authorization: "Bearer " + idToken, "Content-Type": "application/json" },
    body: JSON.stringify(destino || {}),
  });
  if (!respAssinatura.ok) {
    const erro = await respAssinatura.json().catch(() => ({}));
    throw new Error(erro.erro || "Não autorizado a enviar foto.");
  }
  const assinatura = await respAssinatura.json();

  const formData = new FormData();
  formData.append("file", blobComprimido, "foto.jpg");
  formData.append("api_key", assinatura.apiKey);
  formData.append("timestamp", assinatura.timestamp);
  formData.append("signature", assinatura.signature);
  if (assinatura.folder) formData.append("folder", assinatura.folder);
  if (assinatura.publicId) formData.append("public_id", assinatura.publicId);
  if (assinatura.overwrite) formData.append("overwrite", assinatura.overwrite);

  const respUpload = await fetch(`https://api.cloudinary.com/v1_1/${assinatura.cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!respUpload.ok) throw new Error("Falha ao enviar a foto.");
  const dados = await respUpload.json();
  return dados.secure_url;
}
