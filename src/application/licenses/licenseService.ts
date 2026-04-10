import {
  releasedLicenseIdParamSchema,
  listReleasedLicensesQuerySchema,
  revokeLicensePayloadSchema,
} from "@/application/licenses/licenseSchemas";
import {
  getReleasedLicenseById,
  listReleasedLicensesPaginated,
  revokeReleasedLicense,
} from "@/infra/repositories/licensesRepository";
import { sendDiscordNotification } from "@/application/discord/discordService";

export const licenseService = {
  async listReleasedLicenses(rawInput: unknown) {
    const parsed = listReleasedLicensesQuerySchema.parse(rawInput);
    return listReleasedLicensesPaginated(parsed);
  },

  async getReleasedLicenseById(idRaw: string) {
    const { id } = releasedLicenseIdParamSchema.parse({ id: idRaw });
    return getReleasedLicenseById(id);
  },

  async revokeLicense(idRaw: string, payloadRaw: unknown, revokedByUserId: string) {
    const { id } = releasedLicenseIdParamSchema.parse({ id: idRaw });
    const payload = revokeLicensePayloadSchema.parse(payloadRaw);

    const revoked = await revokeReleasedLicense({
      id,
      revokedByUserId,
      type: payload.type,
      value: payload.value,
      reason: payload.reason,
    });

    try {
      const releasedLicense = await getReleasedLicenseById(id);

      await sendDiscordNotification("license.revoked", {
        licenseId: id,
        licenseNumber: releasedLicense?.licenseNumber ?? null,
        protocol: releasedLicense?.protocol ?? null,
        citizenName: releasedLicense?.citizenName ?? null,
        citizenDocument: releasedLicense?.citizenDocument ?? null,
        reason: payload.reason ?? null,
        revocationType: payload.type,
        revocationValue: payload.value ?? null,
        revokedByUserId,
      });
    } catch {
      // Falha de notificacao nao pode impedir a revogacao.
    }

    return revoked;
  },
};
