import type { DrawTeam } from "@/types";
import { sortTeamPlayers } from "@/lib/normalize";
import { formatEsquema } from "@/lib/format";
import { headerTextColor, teamColor } from "@/lib/teamColors";
import { APP_LOGO, APP_NAME, APP_STORE_TEXT, APP_TAGLINE } from "@/lib/brand";
import { downloadBlob, loadImage } from "@/lib/imageUtils";

const FONT_STACK =
  'Aptos, Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function font(weight: number | string, size: number): string {
  return `${weight} ${size}px ${FONT_STACK}`;
}

export interface ShareImageInput {
  groupName: string;
  groupLogo: string | null;
  teams: DrawTeam[];
  term: string;
  dateLabel: string;
}

export interface ShareImageResult {
  blob: Blob;
  fileName: string;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function topRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function drawCircularImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  r: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** Ajusta o tamanho da fonte ao espaço disponível (e trunca com "…" se necessário). */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight: number | string,
  minSize: number,
): { text: string; font: string } {
  let size = baseSize;
  ctx.font = font(weight, size);
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(weight, size);
  }
  if (ctx.measureText(text).width <= maxWidth) {
    return { text, font: font(weight, size) };
  }
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return { text: `${truncated}…`, font: font(weight, size) };
}

function safeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "sorteio";
}

/**
 * Gera a imagem de compartilhamento com o nome e o logo do grupo no topo e a
 * faixa fixa da marca no rodapé. Todas as faixas são calculadas a partir do
 * conteúdo, garantindo que os cards nunca sejam cortados.
 */
export async function generateShareImage(
  input: ShareImageInput,
): Promise<ShareImageResult> {
  const teams = input.teams.filter((t) => t.players.length > 0);
  const playersPerTeam = Math.max(
    1,
    ...teams.map((t) => t.players.length),
  );

  const W = 1080;
  const PAD = 44;
  const HEADER_H = 170;
  const GAP = 26;
  const CARD_W = Math.floor((W - PAD * 2 - GAP) / 2);
  const CARD_HEADER_H = 88;
  const ROW_H = 52;
  const CARD_H = CARD_HEADER_H + 26 + playersPerTeam * ROW_H;
  const rows = Math.max(1, Math.ceil(teams.length / 2));
  const GRID_H = rows * CARD_H + (rows - 1) * GAP;
  const FOOTER_H = 152;
  const H = PAD + HEADER_H + GAP + GRID_H + GAP + FOOTER_H;

  const [groupImg, appImg] = await Promise.all([
    input.groupLogo ? loadImage(input.groupLogo) : Promise.resolve(null),
    loadImage(APP_LOGO),
  ]);
  const headerImg = groupImg ?? appImg;
  const cardImg = groupImg ?? appImg;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem.");

  // Fundo
  ctx.fillStyle = "#F7F8F7";
  ctx.fillRect(0, 0, W, H);

  // Cabeçalho: logo e nome do grupo
  if (headerImg) drawCircularImage(ctx, headerImg, PAD + 58, PAD + 70, 58);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#243F35";
  const nameFit = fitText(
    ctx,
    input.groupName,
    W - (PAD + 142) - PAD,
    48,
    "bold",
    26,
  );
  ctx.font = nameFit.font;
  ctx.fillText(nameFit.text, PAD + 142, PAD + 62);

  ctx.fillStyle = "#5B6B63";
  ctx.font = font(500, 26);
  const subtitle = input.dateLabel
    ? `${input.term} • ${input.dateLabel}`
    : input.term;
  ctx.fillText(subtitle, PAD + 142, PAD + 104);

  // Cards dos times
  teams.forEach((team, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = PAD + col * (CARD_W + GAP);
    const y = PAD + HEADER_H + GAP + row * (CARD_H + GAP);
    const colors = teamColor(team.teamNumber);
    const players = sortTeamPlayers(team.players);
    const totalStars = players.reduce((sum, p) => sum + p.stars, 0);

    roundRect(ctx, x, y, CARD_W, CARD_H, 20);
    ctx.fillStyle = colors.light;
    ctx.fill();
    ctx.strokeStyle = colors.medium;
    ctx.lineWidth = 2;
    ctx.stroke();

    topRoundRect(ctx, x, y, CARD_W, CARD_HEADER_H, 20);
    ctx.fillStyle = colors.strong;
    ctx.fill();

    const headerColor = headerTextColor(team.teamNumber);
    if (cardImg) {
      drawCircularImage(ctx, cardImg, x + 54, y + CARD_HEADER_H / 2, 30);
    }

    ctx.fillStyle = headerColor;
    ctx.textAlign = "left";
    ctx.font = font("bold", 30);
    ctx.fillText(`TIME ${team.teamNumber}`, x + 96, y + 42);
    ctx.globalAlpha = 0.85;
    ctx.font = font(400, 22);
    ctx.fillText(`Esquema ${formatEsquema(team)}`, x + 96, y + 72);
    ctx.globalAlpha = 1;

    ctx.textAlign = "right";
    ctx.font = font("bold", 38);
    ctx.fillText(String(totalStars), x + CARD_W - 22, y + 46);
    ctx.globalAlpha = 0.85;
    ctx.font = font(500, 18);
    ctx.fillText("ESTRELAS", x + CARD_W - 22, y + 72);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";

    players.forEach((player, playerIndex) => {
      const baseY = y + CARD_HEADER_H + 32 + playerIndex * ROW_H;
      ctx.fillStyle = colors.text;
      const namePlayer = fitText(
        ctx,
        player.playerName,
        CARD_W - 22 - 200,
        28,
        500,
        20,
      );
      ctx.font = namePlayer.font;
      ctx.fillText(namePlayer.text, x + 22, baseY);

      ctx.textAlign = "right";
      ctx.font = font("bold", 26);
      ctx.fillText(`${player.stars} ★`, x + CARD_W - 22, baseY);
      ctx.globalAlpha = 0.65;
      ctx.font = font(400, 20);
      ctx.fillText(player.position, x + CARD_W - 118, baseY);
      ctx.globalAlpha = 1;
      ctx.textAlign = "left";

      if (playerIndex < players.length - 1) {
        ctx.strokeStyle = colors.medium;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(x + 22, baseY + 17);
        ctx.lineTo(x + CARD_W - 22, baseY + 17);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  });

  // Rodapé fixo da marca
  const footerY = H - FOOTER_H;
  ctx.fillStyle = "#243F35";
  ctx.fillRect(0, footerY, W, FOOTER_H);

  if (appImg) {
    drawCircularImage(ctx, appImg, PAD + 46, footerY + FOOTER_H / 2, 46);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "#FFFFFF";
  const taglineFit = fitText(
    ctx,
    APP_TAGLINE,
    W - (PAD + 112) - PAD,
    38,
    "bold",
    26,
  );
  ctx.font = taglineFit.font;
  ctx.fillText(taglineFit.text, PAD + 112, footerY + FOOTER_H / 2 - 4);

  ctx.fillStyle = "#C8A24A";
  ctx.font = font(500, 25);
  ctx.fillText(APP_STORE_TEXT, PAD + 112, footerY + FOOTER_H / 2 + 34);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });

  const stamp = input.dateLabel
    ? safeFileName(input.dateLabel)
    : safeFileName(input.groupName);
  return { blob, fileName: `${APP_NAME.toLowerCase().replace(/\s+/g, "-")}-${stamp}.png` };
}

interface ShareCapableNavigator extends Navigator {
  canShare?: (data: { files?: File[]; title?: string; text?: string }) => boolean;
  share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
}

/** Compartilha a imagem (WhatsApp e afins) ou baixa quando não houver suporte. */
export async function shareOrDownload(
  blob: Blob,
  fileName: string,
): Promise<"shared" | "downloaded"> {
  const nav = navigator as ShareCapableNavigator;
  const file = new File([blob], fileName, { type: "image/png" });

  if (typeof nav.canShare === "function" && nav.canShare({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title: APP_NAME, text: APP_TAGLINE });
    return "shared";
  }

  downloadBlob(blob, fileName);
  return "downloaded";
}
