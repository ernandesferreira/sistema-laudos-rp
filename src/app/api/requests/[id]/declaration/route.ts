import { requireApiPermission } from "@/auth/guards";
import { hasAnyRole } from "@/auth/authorization";
import { getAuthIdentityFromRequest, resolveAuthUser } from "@/auth/session";
import { requestService } from "@/application/requests/requestService";
import { buildDeclarationAptidaoPdf } from "@/lib/declarationAptidaoPdf";
import { asHttpError } from "@/lib/http";
import { AppError } from "@/lib/errors";

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
    let authUser = await requireApiPermission(request, "requests.details.read");

    if (!authUser) {
      const identity = getAuthIdentityFromRequest(request);
      authUser = await resolveAuthUser(identity);
    }

    if (authUser && hasAnyRole(authUser, ["operador", "medico"])) {
      throw new AppError("Perfil sem permissao para baixar declaracao em PDF", 403);
    }

    const { id } = await context.params;
    const declarationData = await requestService.getDeclarationData(id);

    const pdfBytes = await buildDeclarationAptidaoPdf({
      protocol: declarationData.protocol,
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
