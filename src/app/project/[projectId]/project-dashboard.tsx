"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, FileText, FolderOpen, PencilLine, Trash2, Users2 } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { ProjectHero } from "@/components/project-hero";
import { formatMilestoneDueDisplay } from "@/lib/assignment-milestones";
import { memberWorkloadPoints } from "@/lib/member-workload";
import { useProjectDashboard } from "@/lib/use-project-dashboard";
import type { DashboardDocument } from "@/lib/types";

type Props = {
  projectId: string;
};

export function ProjectDashboard({ projectId }: Props) {
  const [editingFocus, setEditingFocus] = useState(false);
  const { data, error, refresh } = useProjectDashboard(projectId, { pausePolling: editingFocus });

  const docs = useMemo(() => data?.documents ?? [], [data?.documents]);
  const canEdit = Boolean(data?.me) && !data?.isGuest;

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef("");
  const contentRef = useRef("");

  const selectedDoc = useMemo(() => {
    if (!docs.length) return null;
    return docs.find((doc) => doc.id === selectedDocId) ?? docs[0] ?? null;
  }, [docs, selectedDocId]);

  useEffect(() => {
    if (!docs.length) {
      setSelectedDocId(null);
      return;
    }
    setSelectedDocId((prev) => (prev && docs.some((d) => d.id === prev) ? prev : docs[0]!.id));
  }, [docs]);

  useEffect(() => {
    const doc = docs.find((d) => d.id === selectedDocId);
    if (!doc) {
      if (!editingFocus) {
        setLocalTitle("");
        setLocalContent("");
      }
      return;
    }
    if (!editingFocus) {
      setLocalTitle(doc.title);
      setLocalContent(doc.content);
      titleRef.current = doc.title;
      contentRef.current = doc.content;
    }
  }, [docs, selectedDocId, editingFocus]);

  const persistDoc = useCallback(
    async (docId: string, title: string, content: string) => {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        console.error(payload.error || "保存失败");
        return;
      }
      await refresh();
    },
    [projectId, refresh]
  );

  const schedulePersist = useCallback(() => {
    if (!canEdit || !selectedDocId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistDoc(selectedDocId, titleRef.current, contentRef.current);
    }, 750);
  }, [canEdit, selectedDocId, persistDoc]);

  const flushSave = useCallback(() => {
    if (!canEdit || !selectedDocId) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    void persistDoc(selectedDocId, titleRef.current, contentRef.current);
  }, [canEdit, selectedDocId, persistDoc]);

  const contributionRanking = useMemo(
    () => [...(data?.members ?? [])].sort((a, b) => b.accumulatedPoints - a.accumulatedPoints),
    [data?.members]
  );

  const files = useMemo(() => {
    return docs.map((doc, index) => ({
      id: `file-${doc.id}`,
      name: `${doc.title}.${index === 0 ? "md" : index === 1 ? "docx" : "pdf"}`,
      owner: doc.author.name
    }));
  }, [docs]);

  async function addDocument() {
    if (!canEdit) return;
    const res = await fetch(`/api/projects/${projectId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const payload = await res.json();
    if (!res.ok) {
      console.error(payload.error || "创建失败");
      return;
    }
    const doc = payload.document as DashboardDocument;
    await refresh();
    setSelectedDocId(doc.id);
    setLocalTitle(doc.title);
    setLocalContent(doc.content);
    titleRef.current = doc.title;
    contentRef.current = doc.content;
  }

  async function deleteDocument(id: string) {
    if (!canEdit) return;
    if (!window.confirm("确定删除该文档？")) return;
    const res = await fetch(`/api/projects/${projectId}/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      console.error(payload.error || "删除失败");
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await refresh();
    setSelectedDocId((prev) => (prev === id ? null : prev));
  }

  function onTitleChange(value: string) {
    setLocalTitle(value);
    titleRef.current = value;
    schedulePersist();
  }

  function onContentChange(value: string) {
    setLocalContent(value);
    contentRef.current = value;
    schedulePersist();
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white p-8">
        <p className="text-critical">{error}</p>
      </main>
    );
  }

  if (!data) {
    return <main className="min-h-screen bg-white p-8">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <TopNav />
      <div className="shell py-6">
        {data.isGuest || !data.me ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            你正以访客身份浏览（未携带成员登录态）。请返回首页使用已注册账号登录，并通过「加入项目」或队长邀请加入本项目后，即可编辑与操作。
          </div>
        ) : null}

        <ProjectHero project={data.project} title={data.project.title} />

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="line-card rounded-[28px] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">一、项目概述</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">共享概况</h2>
                </div>
                <Users2 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-4 rounded-[22px] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                <div>截止时间：{new Date(data.project.deadline).toLocaleString()}</div>
                <div>邀请码：{data.project.inviteCode}</div>
                <div className="mt-3 whitespace-pre-wrap font-medium text-slate-800">共享共识（摘要）</div>
                <div className="mt-1 whitespace-pre-wrap">{data.project.contextSummary}</div>
                {data.project.assignmentMilestones && data.project.assignmentMilestones.length > 0 ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="font-medium text-slate-800">关键时间节点</div>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5">
                      {data.project.assignmentMilestones.map((m, i) => (
                        <li key={`${i}-${m.label}`}>
                          <span className="font-medium text-slate-700">{m.label}</span>
                          <span className="text-slate-500"> — {formatMilestoneDueDisplay(m)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {data.project.keyDeliverables && data.project.keyDeliverables.length > 0 ? (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="font-medium text-slate-800">所需产出物</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {data.project.keyDeliverables.map((item, i) => (
                        <li key={`${i}-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium text-slate-800">AI 团队进度简报</div>
                    {data.project.progressDigestAt ? (
                      <span className="text-xs text-slate-500">
                        {new Date(data.project.progressDigestAt).toLocaleString("zh-CN", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    ) : null}
                  </div>
                  {data.project.progressDigest ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {data.project.progressDigest}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      暂无简报。成员在项目管理页更新任务状态后，系统会自动汇总生成。
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/project/${projectId}/manage`}
                className="mt-4 inline-flex rounded-full border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white"
              >
                进入项目管理
              </Link>
            </section>

            <section className="line-card rounded-[28px] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">二、文档列表</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">成员文档</h2>
                </div>
                <button
                  type="button"
                  onClick={() => void addDocument()}
                  disabled={!canEdit}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-900 px-3 py-2 text-sm font-medium text-slate-900 transition enabled:hover:bg-slate-900 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FilePlus2 className="h-4 w-4" />
                  添加
                </button>
              </div>

              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-[22px] border p-4 transition ${selectedDoc?.id === doc.id ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                  >
                    <button type="button" onClick={() => setSelectedDocId(doc.id)} className="w-full text-left">
                      <div className="text-base font-semibold text-slate-900">{doc.title}</div>
                      <div className="mt-1 text-sm text-slate-500">作者：{doc.author.name}</div>
                    </button>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDocId(doc.id)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        打开
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDocument(doc.id)}
                        disabled={!canEdit}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="line-card rounded-[28px] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">三、文件列表</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">项目文件</h2>
                </div>
                <FolderOpen className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{file.name}</div>
                      <div className="text-xs text-slate-500">作者：{file.owner}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="line-card rounded-[28px] p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-500">四、贡献度概要</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">成员得分</h2>
                </div>
                <Link
                  href={`/project/${projectId}/analytics`}
                  className="rounded-full border border-slate-900 px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-900 hover:text-white"
                >
                  查看详情
                </Link>
              </div>
              <div className="space-y-3">
                {contributionRanking.map((member, index) => (
                  <div key={member.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium text-slate-800">
                          {index + 1}. {member.name}
                        </span>
                        <span
                          className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-800 shadow-sm"
                          title="当前进行中任务所承担的工作量点数"
                        >
                          {data?.tasks ? memberWorkloadPoints(data.tasks, member.id) : 0} 点进行中
                        </span>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-slate-900">{member.accumulatedPoints}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="line-card flex min-h-[960px] flex-col rounded-[32px] bg-white">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-8 py-6">
              <div>
                <div className="text-sm font-medium text-slate-500">工作区</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">具体文档编辑</h2>
                <p className="mt-2 text-sm text-slate-500">在这里查看和编辑当前选中的项目文档。</p>
              </div>
              {selectedDoc ? (
                <div className="rounded-[22px] bg-slate-50 px-4 py-3 text-right">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">当前文档</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">{localTitle}</div>
                  <div className="text-sm text-slate-500">作者：{selectedDoc.author.name}</div>
                </div>
              ) : null}
            </div>

            {selectedDoc ? (
              <div className="flex flex-1 flex-col px-8 py-6">
                <div className="mb-4 flex items-center gap-3 rounded-[22px] bg-slate-50 p-4">
                  <PencilLine className="h-5 w-5 text-slate-500" />
                  <input
                    value={localTitle}
                    onChange={(event) => onTitleChange(event.target.value)}
                    onFocus={() => setEditingFocus(true)}
                    onBlur={() => {
                      flushSave();
                      setEditingFocus(false);
                    }}
                    readOnly={!canEdit}
                    className="w-full border-0 bg-transparent text-xl font-semibold tracking-tight outline-none read-only:cursor-default"
                    placeholder="输入文档标题"
                  />
                </div>
                <textarea
                  value={localContent}
                  onChange={(event) => onContentChange(event.target.value)}
                  onFocus={() => setEditingFocus(true)}
                  onBlur={() => {
                    flushSave();
                    setEditingFocus(false);
                  }}
                  readOnly={!canEdit}
                  className="min-h-[720px] w-full flex-1 resize-none rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-base leading-8 text-slate-700 outline-none transition focus:border-slate-300 read-only:cursor-default"
                  placeholder="在这里输入文档内容..."
                />
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void deleteDocument(selectedDoc.id)}
                    disabled={!canEdit}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除当前文档
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-12 text-center text-slate-500">
                {canEdit
                  ? "暂无文档，请点击左侧「添加」或使用成员账号首次进入以自动生成默认文档。"
                  : "暂无文档。加入项目后可查看与编辑团队文档。"}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
