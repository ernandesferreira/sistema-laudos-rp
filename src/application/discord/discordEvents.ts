export const DISCORD_EVENT_DEFINITIONS = [
  {
    key: "request.created",
    label: "Solicitacao criada",
    defaultTemplate:
      "[Solicitacao criada]\nProtocolo: {{protocol}}\nCidadao: {{citizenName}}\nDocumento: {{citizenDocument}}\nOperador: {{requesterName}}",
  },
  {
    key: "request.final_approved",
    label: "Solicitacao aprovada",
    defaultTemplate:
      "[Solicitacao aprovada]\nProtocolo: {{protocol}}\nCidadao: {{citizenName}}\nDocumento: {{citizenDocument}}",
  },
  {
    key: "request.rejected",
    label: "Solicitacao rejeitada",
    defaultTemplate:
      "[Solicitacao rejeitada]\nProtocolo: {{protocol}}\nCidadao: {{citizenName}}\nMotivo/observacao: {{observations}}",
  },
  {
    key: "workflow.step_completed",
    label: "Etapa do workflow concluida",
    defaultTemplate:
      "[Workflow]\nEtapa concluida: {{stepName}}\nProtocolo: {{protocol}}\nDecisao: {{decision}}\nExecutado por: {{executedById}}",
  },
  {
    key: "workflow.step_rejected",
    label: "Etapa do workflow rejeitada",
    defaultTemplate:
      "[Workflow]\nEtapa rejeitada: {{stepName}}\nProtocolo: {{protocol}}\nDecisao: {{decision}}\nObservacoes: {{observations}}",
  },
  {
    key: "approval.final",
    label: "Aprovacao final",
    defaultTemplate:
      "[Aprovacao final]\nProtocolo: {{protocol}}\nResultado: {{workflowStatus}}\nSolicitacao: {{requestId}}",
  },
  {
    key: "license.released",
    label: "Licenca liberada",
    defaultTemplate:
      "[Licenca liberada]\nLicenca: {{licenseNumber}}\nProtocolo: {{protocol}}\nCidadao: {{citizenName}}",
  },
  {
    key: "license.revoked",
    label: "Licenca revogada",
    defaultTemplate:
      "[Licenca revogada]\nLicenca: {{licenseNumber}}\nProtocolo: {{protocol}}\nMotivo: {{reason}}",
  },
] as const;

export type DiscordEventDefinition = (typeof DISCORD_EVENT_DEFINITIONS)[number];
export type DiscordEventKey = DiscordEventDefinition["key"];

export function isDiscordEventKey(value: string): value is DiscordEventKey {
  return DISCORD_EVENT_DEFINITIONS.some((eventDefinition) => eventDefinition.key === value);
}

export function getDiscordEventLabel(eventKey: DiscordEventKey) {
  return (
    DISCORD_EVENT_DEFINITIONS.find((eventDefinition) => eventDefinition.key === eventKey)?.label ??
    eventKey
  );
}

export function getDefaultTemplateForEvent(eventKey: DiscordEventKey) {
  return (
    DISCORD_EVENT_DEFINITIONS.find((eventDefinition) => eventDefinition.key === eventKey)?.defaultTemplate ??
    "{{json}}"
  );
}
