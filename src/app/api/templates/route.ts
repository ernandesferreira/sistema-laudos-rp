import { requireApiPermission } from "@/auth/guards";
import { laudosService } from "@/application/laudos/service";
import {
  createTemplateSchema,
  listTemplatesQuerySchema,
} from "@/application/laudos/schemas";
import { asHttpError, ok } from "@/lib/http";

export async function GET(request: Request) {
  try {
    await requireApiPermission(request, "templates.read");

    const { searchParams } = new URL(request.url);

    const query = listTemplatesQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      active: searchParams.get("active") ?? undefined,
    });

    const templates = await laudosService.listTemplates(query);
    return ok({ templates });
  } catch (error) {
    return asHttpError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireApiPermission(request, "templates.create");

    const body = await request.json();
    const input = createTemplateSchema.parse(body);

    const template = await laudosService.createTemplate(input);
    return ok({ template }, { status: 201 });
  } catch (error) {
    return asHttpError(error);
  }
}
