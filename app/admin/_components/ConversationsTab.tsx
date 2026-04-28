"use client";

import {
  listSupportMessagesAction,
  postAdminSupportReplyAction,
} from "@/app/admin/actions";
import type { SupportMessageRow, SupportSessionRow } from "@/types/database";
import { LoaderCircle, MessageSquare, Send, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  initialSessions: SupportSessionRow[];
};

export function ConversationsTab({ initialSessions }: Props) {
  const router = useRouter();
  const closedSessions = useMemo(
    () => initialSessions.filter((s) => s.status === "closed"),
    [initialSessions],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);

  const [allowReply, setAllowReply] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoadingMsg(true);
    setMsgErr(null);
    try {
      const res = await listSupportMessagesAction(sessionId);
      if (!res.ok) {
        setMsgErr(res.error);
        setMessages([]);
        return;
      }
      setMessages(res.data);
    } finally {
      setLoadingMsg(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  async function onSendReply() {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    setMsgErr(null);
    try {
      const res = await postAdminSupportReplyAction(selectedId, replyText);
      if (!res.ok) {
        setMsgErr(res.error);
        return;
      }
      setReplyText("");
      await loadMessages(selectedId);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const selected = closedSessions.find((s) => s.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[var(--card)] p-5 shadow-[0_0_36px_-18px_rgba(147,112,219,0.2)] lg:col-span-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-200/90">
          Atendimentos finalizados
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Sessões com estado <code className="text-violet-300/80">closed</code>{" "}
          na tabela <code className="text-violet-300/80">support_sessions</code>.
        </p>
        <div className="mt-4 max-h-[min(70vh,520px)] overflow-auto rounded-xl border border-[rgba(147,112,219,0.15)]">
          <table className="w-full min-w-[260px] text-left text-sm">
            <thead className="sticky top-0 border-b border-[rgba(147,112,219,0.2)] bg-black/50 text-xs text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">E-mail</th>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {closedSessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-8 text-center text-sm text-[var(--muted)]"
                  >
                    Nenhum atendimento finalizado. Quando o app gravar sessões
                    fechadas, elas aparecem aqui.
                  </td>
                </tr>
              ) : (
                closedSessions.map((s) => {
                  const active = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      className={`cursor-pointer border-t border-[rgba(147,112,219,0.08)] transition ${
                        active ? "bg-violet-950/40" : "hover:bg-black/30"
                      }`}
                      onClick={() => setSelectedId(s.id)}
                    >
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-xs">
                        {s.user_email || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[var(--muted)]">
                        {new Date(s.closed_at ?? s.created_at).toLocaleString(
                          "pt-BR",
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs capitalize text-violet-200/90">
                        {s.status}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgba(147,112,219,0.25)] bg-[var(--card)] p-5 shadow-[0_0_36px_-18px_rgba(147,112,219,0.2)] lg:col-span-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-300" aria-hidden />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-200/90">
            Histórico
          </h2>
        </div>
        {!selectedId ? (
          <p className="mt-6 text-sm text-[var(--muted)]">
            Selecione um atendimento à esquerda para ver as mensagens.
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {selected?.user_email} · user_id:{" "}
              <span className="font-mono text-violet-200/70">
                {selected?.user_id ?? "—"}
              </span>
            </p>
            {msgErr ? (
              <p className="mt-2 text-sm text-amber-200/90">{msgErr}</p>
            ) : null}
            <div className="mt-4 flex max-h-[min(50vh,400px)] flex-col gap-2 overflow-y-auto rounded-xl border border-[rgba(147,112,219,0.12)] bg-black/25 p-3">
              {loadingMsg ? (
                <div className="flex justify-center py-8">
                  <LoaderCircle className="h-8 w-8 animate-spin text-violet-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--muted)]">
                  Sem mensagens nesta sessão.
                </p>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender === "admin";
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                        isAdmin
                          ? "ml-auto bg-violet-800/50 text-violet-50"
                          : "mr-auto bg-zinc-800/80 text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {isAdmin ? "Staff" : "Utilizador"} ·{" "}
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 space-y-3 border-t border-[rgba(147,112,219,0.15)] pt-4">
              {selected?.video_url && (
                <div className="flex items-center gap-2">
                  <a
                    href={selected.video_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-950/20 px-4 py-2 text-sm font-semibold text-green-100 hover:border-green-400/40"
                  >
                    <Download className="h-4 w-4" />
                    💎 Baixar meu Vídeo
                  </a>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--muted)]">
                <input
                  type="checkbox"
                  className="rounded border-violet-500/40 bg-black/40"
                  checked={allowReply}
                  onChange={(e) => setAllowReply(e.target.checked)}
                />
                Permitir resposta do admin nesta sessão
              </label>
              {allowReply ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <textarea
                    className="min-h-[72px] flex-1 rounded-xl border border-[rgba(147,112,219,0.25)] bg-black/40 px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-violet-500/20 focus:ring-2"
                    placeholder="Escreva uma resposta…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={sending || !replyText.trim()}
                    onClick={() => void onSendReply()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {sending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  Modo só leitura — marque a opção acima para enviar respostas.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
