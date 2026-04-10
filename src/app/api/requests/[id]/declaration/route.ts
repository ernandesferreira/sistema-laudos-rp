import { requireApiPermission } from "@/auth/guards";
import { requestService } from "@/application/requests/requestService";
import { buildDeclarationAptidaoPdf } from "@/lib/declarationAptidaoPdf";
import { asHttpError } from "@/lib/http";

type Context = {
  params: Promise<{ id: string }>;
};

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(request: Request, context: Context) {
  try {
    await requireApiPermission(request, "requests.details.read");

    const { id } = await context.params;
    const declarationData = await requestService.getDeclarationData(id);

    const pdfBytes = await buildDeclarationAptidaoPdf({
      citizenName: declarationData.citizenName,
      passportNumber: declarationData.passportNumber,
      requestName: declarationData.requestName,
      workflowStatus: declarationData.workflowStatus,
      steps: declarationData.steps,
      cityName: "VOID RP",
    });

    const safeProtocol = sanitizeFileNamePart(declarationData.protocol);
    const safeCitizen = sanitizeFileNamePart(declarationData.citizenName);

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="declaracao-aptidao-${safeProtocol}-${safeCitizen}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return asHttpError(error);
  }
}
