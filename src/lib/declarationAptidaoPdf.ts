import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type DeclarationStep = {
  order: number;
  name: string;
  decision: string | null;
};

type DeclarationPayload = {
  protocol: string;
  citizenName: string;
  passportNumber: string;
  requestName: string;
  workflowStatus: string;
  steps: DeclarationStep[];
  cityName?: string;
};

function mapStepDecisionLabel(decision: string | null) {
  if (decision === "APTO" || decision === "APROVADO") {
    return "Aprovado";
  }

  if (decision === "NAO_APTO" || decision === "REPROVADO") {
    return "Reprovado";
  }

  if (decision === "PENDENTE") {
    return "Pendente";
  }

  return "Nao avaliado";
}

function mapFinalAptidaoLabel(workflowStatus: string) {
  if (workflowStatus === "FINAL_APPROVED") {
    return "Apto";
  }

  if (workflowStatus === "FINAL_REJECTED") {
    return "Nao apto";
  }

  return "Em analise";
}

function toWrappedLines(input: string, maxCharsPerLine = 95) {
  const words = input.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line.length > 0 ? `${line} ${word}` : word;

    if (next.length > maxCharsPerLine) {
      if (line.length > 0) {
        lines.push(line);
      }

      line = word;
    } else {
      line = next;
    }
  }

  if (line.length > 0) {
    lines.push(line);
  }

  return lines;
}

async function loadVoidRpLogo(pdfDoc: PDFDocument) {
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "voidrp.png");
    const logoBytes = await readFile(logoPath);
    const embedded = await pdfDoc.embedPng(logoBytes);

    return embedded;
  } catch {
    return null;
  }
}

export async function buildDeclarationAptidaoPdf(payload: DeclarationPayload) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const logo = await loadVoidRpLogo(pdfDoc);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  page.drawRectangle({
    x: 24,
    y: 24,
    width: pageWidth - 48,
    height: pageHeight - 48,
    borderColor: rgb(0.14, 0.2, 0.34),
    borderWidth: 1.2,
    color: rgb(0.992, 0.992, 0.988),
  });

  page.drawRectangle({
    x: 24,
    y: pageHeight - 144,
    width: pageWidth - 48,
    height: 120,
    color: rgb(0.12, 0.2, 0.34),
  });

  if (logo) {
    const logoWidth = 78;
    const logoHeight = (logo.height / logo.width) * logoWidth;

    page.drawImage(logo, {
      x: 44,
      y: pageHeight - 126,
      width: logoWidth,
      height: logoHeight,
    });
  }

  page.drawText("JUSTICA DE VOID RP", {
    x: 134,
    y: pageHeight - 74,
    size: 17,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Departamento de Avaliacao de Aptidao", {
    x: 134,
    y: pageHeight - 96,
    size: 11,
    font,
    color: rgb(0.9, 0.93, 0.98),
  });

  page.drawText("Documento oficial de tramitacao interna RP", {
    x: 134,
    y: pageHeight - 114,
    size: 10,
    font,
    color: rgb(0.8, 0.88, 0.98),
  });

  let y = 660;
  const left = 52;

  page.drawText("DECLARACAO DE APTIDAO", {
    x: left,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0.07, 0.11, 0.2),
  });

  page.drawRectangle({
    x: left,
    y: y - 8,
    width: 250,
    height: 1,
    color: rgb(0.14, 0.2, 0.34),
  });

  y -= 34;

  const cityName = payload.cityName ?? "VOID RP";
  const stepsSummary = payload.steps
    .map((step) => `${step.order + 1}. ${step.name}: ${mapStepDecisionLabel(step.decision)}`)
    .join("; ");

  const line1 = `Declaro para os devidos fins que o(a) Sr.(a) ${payload.citizenName}, Passaporte ${payload.passportNumber}, foi submetido(a) a todas as avaliacoes para permissao do porte de arma, conforme os parametros estabelecidos pela Justica da cidade ${cityName}.`; 
  const line2 = `Segue avaliacao de todas as etapas concluidas: ${stepsSummary}.`;
  const aptidaoLabel = mapFinalAptidaoLabel(payload.workflowStatus);
  const line3 = `Atesto para os devidos fins que o cidadao se encontra ${aptidaoLabel} ao ${payload.requestName}.`;

  const content = [...toWrappedLines(line1), "", ...toWrappedLines(line2), "", ...toWrappedLines(line3)];

  for (const line of content) {
    if (y < 190) {
      break;
    }

    page.drawText(line, {
      x: left,
      y,
      size: 12,
      font,
      color: rgb(0.16, 0.16, 0.18),
    });

    y -= line.length === 0 ? 14 : 18;
  }

  y -= 24;
  page.drawText(`Emitido em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`, {
    x: left,
    y,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  const signatureBaseY = 120;

  page.drawRectangle({
    x: 360,
    y: signatureBaseY + 36,
    width: 170,
    height: 0.9,
    color: rgb(0.22, 0.22, 0.24),
  });

  page.drawText("Deluca Falconi", {
    x: 386,
    y: signatureBaseY + 16,
    size: 15,
    font: fontItalic,
    color: rgb(0.13, 0.13, 0.14),
  });

  page.drawText("Responsavel pela declaracao", {
    x: 378,
    y: signatureBaseY + 2,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.38),
  });

  page.drawText(`Protocolo interno: ${payload.protocol}`, {
    x: left,
    y: 66,
    size: 9,
    font,
    color: rgb(0.33, 0.33, 0.36),
  });

  page.drawText("VOID RP - Documento valido somente para ambiente de roleplay", {
    x: left,
    y: 50,
    size: 9,
    font,
    color: rgb(0.33, 0.33, 0.36),
  });

  const bytes = await pdfDoc.save();
  return bytes;
}
