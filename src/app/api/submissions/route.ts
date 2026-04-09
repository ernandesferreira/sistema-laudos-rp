import { laudosService } from "@/application/laudos/service";
import { asHttpError, ok } from "@/lib/http";

export async function GET() {
  try {
    const submissions = await laudosService.listSubmissions();
    return ok({ submissions });
  } catch (error) {
    return asHttpError(error);
  }
}
