"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DISCORD_EVENT_DEFINITIONS, type DiscordEventKey } from "@/application/discord/discordEvents";

type DiscordIntegrationView = {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  description: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type DiscordEventConfigView = {
  eventKey: DiscordEventKey;
  label: string;
  integrationId: string | null;
  isEnabled: boolean;
  messageTemplate: string;
};

type DiscordNotificationLogView = {
  id: string;
  eventKey: string;
  status: "SUCCESS" | "ERROR" | "SKIPPED";
  responseStatus: number | null;
  errorMessage: string | null;
  createdAt: string | Date;
  integration?: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
};

type Props = {
  initialIntegrations: DiscordIntegrationView[];
  initialEventConfigs: DiscordEventConfigView[];
  initialLogs: DiscordNotificationLogView[];
};

type IntegrationDraft = {
  name: string;
  webhookUrl: string;
  isActive: boolean;
  description: string;
};

const DISCORD_TEMPLATE_VARIABLES = [
  { name: "{{protocol}}", description: "Protocolo da solicitacao." },
  { name: "{{workflowStatus}}", description: "Status atual do workflow." },
  { name: "{{stepName}}", description: "Nome da etapa do workflow." },
  { name: "{{decision}}", description: "Decisao aplicada na etapa." },
  { name: "{{action}}", description: "Acao interna do evento de workflow." },
  { name: "{{currentStepOrder}}", description: "Indice da etapa atual no fluxo." },
  { name: "{{executedById}}", description: "ID de quem executou a etapa." },
  { name: "{{executedByName}}", description: "Nome de quem executou a etapa." },
  { name: "{{requestId}}", description: "ID interno da solicitacao." },
  { name: "{{citizenName}}", description: "Nome do cidadao da solicitacao." },
  { name: "{{citizenDocument}}", description: "Documento do cidadao." },
  { name: "{{requesterName}}", description: "Nome do solicitante/operador." },
  { name: "{{requesterDocument}}", description: "Passaporte do solicitante." },
  { name: "{{requesterOabNumber}}", description: "Numero da OAB do solicitante." },
  { name: "{{licenseNumber}}", description: "Numero da licenca, quando houver." },
  { name: "{{releasedAt}}", description: "Data de liberacao da licenca." },
  { name: "{{reason}}", description: "Motivo da revogacao, quando houver." },
  { name: "{{revocationType}}", description: "Tipo de revogacao da licenca." },
  { name: "{{revocationValue}}", description: "Prazo numerico da revogacao." },
  { name: "{{declarationUrl}}", description: "Link da declaracao PDF." },
  { name: "{{json}}", description: "Contexto completo do evento em JSON." },
] as const;

function toDraft(integration: DiscordIntegrationView): IntegrationDraft {
  return {
    name: integration.name,
    webhookUrl: integration.webhookUrl,
    isActive: integration.isActive,
    description: integration.description ?? "",
  };
}

function statusBadgeClasses(status: DiscordNotificationLogView["status"]) {
  if (status === "SUCCESS") {
    return "border-emerald-500/35 bg-emerald-500/20 text-emerald-200";
  }

  if (status === "ERROR") {
    return "border-rose-500/35 bg-rose-500/20 text-rose-200";
  }

  return "border-slate-500/35 bg-slate-500/20 text-slate-200";
}

export function DiscordSettingsPanel({
  initialIntegrations,
  initialEventConfigs,
  initialLogs,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [eventConfigs, setEventConfigs] = useState(initialEventConfigs);
  const [logs] = useState(initialLogs);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<IntegrationDraft>({
    name: "",
    webhookUrl: "",
    isActive: true,
    description: "",
  });

  const [drafts, setDrafts] = useState<Record<string, IntegrationDraft>>(() => {
    const entries = integrations.map((integration) => [integration.id, toDraft(integration)] as const);
    return Object.fromEntries(entries);
  });

  const integrationOptions = useMemo(
    () => integrations.map((integration) => ({ id: integration.id, name: integration.name, isActive: integration.isActive })),
    [integrations],
  );

  function updateDraft(integrationId: string, changes: Partial<IntegrationDraft>) {
    setDrafts((current) => ({
      ...current,
      [integrationId]: {
        ...current[integrationId],
        ...changes,
      },
    }));
  }

  function createIntegration() {
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/discord/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createForm),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao criar integracao");
        return;
      }

      const integration = payload.integration as DiscordIntegrationView;

      setIntegrations((current) => [integration, ...current]);
      setDrafts((current) => ({
        ...current,
        [integration.id]: toDraft(integration),
      }));
      setCreateForm({
        name: "",
        webhookUrl: "",
        isActive: true,
        description: "",
      });
      setFeedback("Integracao criada com sucesso.");
      router.refresh();
    });
  }

  function saveIntegration(integrationId: string) {
    setError(null);
    setFeedback(null);

    const draft = drafts[integrationId];

    startTransition(async () => {
      const response = await fetch(`/api/discord/integrations/${integrationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao salvar integracao");
        return;
      }

      const integration = payload.integration as DiscordIntegrationView;

      setIntegrations((current) =>
        current.map((entry) => (entry.id === integration.id ? integration : entry)),
      );
      setDrafts((current) => ({
        ...current,
        [integration.id]: toDraft(integration),
      }));
      setFeedback("Integracao atualizada.");
      router.refresh();
    });
  }

  function testIntegration(integrationId: string) {
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch(`/api/discord/integrations/${integrationId}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao testar webhook");
        return;
      }

      setFeedback("Mensagem de teste enviada para o webhook.");
      router.refresh();
    });
  }

  function updateEventConfig(eventKey: DiscordEventKey, changes: Partial<DiscordEventConfigView>) {
    setEventConfigs((current) =>
      current.map((entry) => (entry.eventKey === eventKey ? { ...entry, ...changes } : entry)),
    );
  }

  function saveEventConfigs() {
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/discord/event-configs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configs: eventConfigs.map((entry) => ({
            eventKey: entry.eventKey,
            integrationId: entry.integrationId ?? undefined,
            isEnabled: entry.isEnabled,
            messageTemplate: entry.messageTemplate,
          })),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Falha ao salvar configuracao de eventos");
        return;
      }

      setFeedback("Configuracoes de eventos salvas com sucesso.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="card p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-xl text-slate-100">Integracoes Discord</h2>
          <p className="text-sm text-slate-400">
            Cadastre webhooks e mantenha a ativacao por integracao para cada canal do Discord.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            className="input"
            placeholder="Nome da integracao"
            value={createForm.name}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Webhook URL"
            value={createForm.webhookUrl}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, webhookUrl: event.target.value }))}
          />
          <input
            className="input"
            placeholder="Descricao opcional"
            value={createForm.description}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Ativa
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary" disabled={isPending} onClick={createIntegration}>
            Cadastrar integracao
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Webhook URL</th>
                <th className="px-3 py-2">Descricao</th>
                <th className="px-3 py-2">Ativa</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((integration) => {
                const draft = drafts[integration.id] ?? toDraft(integration);

                return (
                  <tr key={integration.id} className="border-t border-slate-800/70 align-top">
                    <td className="px-3 py-2">
                      <input
                        className="input"
                        value={draft.name}
                        onChange={(event) => updateDraft(integration.id, { name: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input"
                        value={draft.webhookUrl}
                        onChange={(event) => updateDraft(integration.id, { webhookUrl: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="input"
                        value={draft.description}
                        onChange={(event) => updateDraft(integration.id, { description: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) => updateDraft(integration.id, { isActive: event.target.checked })}
                        />
                        {draft.isActive ? "Ativa" : "Inativa"}
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={isPending}
                          onClick={() => saveIntegration(integration.id)}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={isPending}
                          onClick={() => testIntegration(integration.id)}
                        >
                          Testar webhook
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-xl text-slate-100">Configuracao por evento</h2>
          <p className="text-sm text-slate-400">
            Defina se o evento envia notificacao, qual integracao usar e o template da mensagem.
          </p>
        </div>

        <div className="space-y-3">
          {DISCORD_EVENT_DEFINITIONS.map((eventDefinition) => {
            const config =
              eventConfigs.find((entry) => entry.eventKey === eventDefinition.key) ?? {
                eventKey: eventDefinition.key,
                label: eventDefinition.label,
                integrationId: null,
                isEnabled: false,
                messageTemplate: eventDefinition.defaultTemplate,
              };

            return (
              <article key={eventDefinition.key} className="rounded-xl border border-slate-800 bg-slate-900/35 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{eventDefinition.label}</p>
                    <p className="text-xs text-slate-400">{eventDefinition.key}</p>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={config.isEnabled}
                      onChange={(event) =>
                        updateEventConfig(eventDefinition.key, {
                          isEnabled: event.target.checked,
                        })
                      }
                    />
                    Enviar notificacao
                  </label>
                </div>

                <div className="grid gap-2 md:grid-cols-[320px_1fr]">
                  <select
                    className="input"
                    value={config.integrationId ?? ""}
                    onChange={(event) =>
                      updateEventConfig(eventDefinition.key, {
                        integrationId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Sem integracao</option>
                    {integrationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} {option.isActive ? "" : "(inativa)"}
                      </option>
                    ))}
                  </select>

                  <textarea
                    className="input min-h-[100px]"
                    value={config.messageTemplate}
                    onChange={(event) =>
                      updateEventConfig(eventDefinition.key, {
                        messageTemplate: event.target.value,
                      })
                    }
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-primary" disabled={isPending} onClick={saveEventConfigs}>
            Salvar configuracoes de eventos
          </button>
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-xl text-slate-100">Variaveis disponiveis</h2>
          <p className="text-sm text-slate-400">
            Use os placeholders abaixo nos templates dos eventos.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {DISCORD_TEMPLATE_VARIABLES.map((variableItem) => (
            <article key={variableItem.name} className="rounded-xl border border-slate-800 bg-slate-900/35 p-3">
              <p className="text-sm font-semibold text-sky-200">{variableItem.name}</p>
              <p className="mt-1 text-xs text-slate-300">{variableItem.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-xl text-slate-100">Logs de notificacao</h2>
          <p className="text-sm text-slate-400">Ultimos envios com sucesso, erro ou bloqueio por configuracao.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Integracao</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">HTTP</th>
                <th className="px-3 py-2">Erro</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-800/70 align-top">
                  <td className="px-3 py-2 text-slate-300">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(log.createdAt))}
                  </td>
                  <td className="px-3 py-2 text-slate-200">{log.eventKey}</td>
                  <td className="px-3 py-2 text-slate-300">{log.integration?.name ?? "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-xs ${statusBadgeClasses(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{log.responseStatus ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-300">{log.errorMessage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {feedback ? (
        <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          {feedback}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/35 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
