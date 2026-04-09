import { laudosService } from "@/application/laudos/service";
import { asHttpError, fail, ok } from "@/lib/http";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { slug } = await context.params;
    const template = await laudosService.getTemplateBySlug(slug);

    if (!template || !template.isActive) {
      return fail("Template unavailable", 404);
    }

    return ok({ template });
  } catch (error) {
    return asHttpError(error);
  }
}
