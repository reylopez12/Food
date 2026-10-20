import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePreviewDirectoryImport,
  useConfirmDirectoryImport,
  DirectoryImportInputSource,
} from "@workspace/api-client-react";
import type {
  DirectoryImportFile,
  DirectoryImportInput,
  DirectoryImportPreview,
  DirectoryImportResult,
  DirectoryImportRow,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

const MAX_BYTES = 1024 * 1024;
const MAX_FILES = 6;
const CITIES = ["Albany", "Alameda", "Berkeley", "Oakland"] as const;
const PAGE_SIZE = 25;

type Source = "prepared" | "csv";
type Filter = "all" | "add" | "update" | "unchanged" | "blocked";

interface LoadedFile {
  name: string;
  content: string;
  size: number;
}

function decode(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

const ACTION_STYLES: Record<string, string> = {
  add: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  update: "border-primary/30 bg-primary/15 text-primary",
  unchanged: "border-border bg-muted text-muted-foreground",
  blocked: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default function DirectoryImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previewMut = usePreviewDirectoryImport();
  const confirmMut = useConfirmDirectoryImport();

  const [source, setSource] = useState<Source>("prepared");
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [city, setCity] = useState<string>("");
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DirectoryImportPreview | null>(null);
  const [requestUsed, setRequestUsed] = useState<DirectoryImportInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<DirectoryImportResult | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const readId = useRef(0);
  const inFlight = useRef(false);
  const previewSeq = useRef(0);

  const busy = previewMut.isPending || confirmMut.isPending || reading;
  const saving = confirmMut.isPending;

  useEffect(() => {
    if (!preview) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [preview]);

  const expired = preview ? new Date(preview.expiresAt).getTime() <= now : false;

  function discard() {
    previewSeq.current++;
    setPreview(null);
    setRequestUsed(null);
    setAcknowledged(false);
    setConfirmOpen(false);
    setResult(null);
    setError(null);
    setFilter("all");
    setPage(0);
  }

  function changeSource(s: Source) {
    if (busy || s === source) return;
    readId.current++;
    setSource(s);
    setFiles([]);
    setFileError(null);
    discard();
  }

  function changeCity(c: string) {
    if (busy) return;
    setCity(c);
    discard();
  }

  async function onPick(list: FileList | null) {
    const picked = list ? Array.from(list) : [];
    const id = ++readId.current;
    discard();
    setFileError(null);
    if (picked.length === 0) {
      setFiles([]);
      return;
    }
    if (picked.length > MAX_FILES) {
      setFiles([]);
      setFileError(`Too many files: ${picked.length} selected, the limit is ${MAX_FILES}.`);
      return;
    }
    const total = picked.reduce((n, f) => n + f.size, 0);
    if (total > MAX_BYTES) {
      setFiles([]);
      setFileError(`Too large: ${(total / 1024).toFixed(0)} KB selected, the limit is 1 MB in total.`);
      return;
    }
    const bad = picked.find((f) => !f.name.toLowerCase().endsWith(".csv"));
    if (bad) {
      setFiles([]);
      setFileError(`${bad.name} is not a .csv file.`);
      return;
    }
    setReading(true);
    try {
      const loaded = await Promise.all(
        picked.map(async (f) => ({ name: f.name, content: decode(await f.arrayBuffer()), size: f.size })),
      );
      if (id !== readId.current) return; // stale read
      setFiles(loaded);
    } catch {
      if (id !== readId.current) return;
      setFiles([]);
      setFileError("Couldn't read one of the files. Pick them again.");
    } finally {
      if (id === readId.current) setReading(false);
    }
  }

  function buildRequest(): DirectoryImportInput {
    if (source === "prepared") return { source: DirectoryImportInputSource.prepared };
    return {
      source: DirectoryImportInputSource.csv,
      files: files.map<DirectoryImportFile>((f) => ({
        name: f.name,
        content: f.content,
        ...(city ? { city } : {}),
      })),
    };
  }

  function runPreview() {
    if (inFlight.current || busy) return;
    if (source === "csv" && files.length === 0) return;
    inFlight.current = true;
    discard();
    const seq = previewSeq.current;
    const req = buildRequest();
    previewMut.mutate(
      { data: req },
      {
        onSuccess: (p) => {
          if (seq !== previewSeq.current) return;
          trackEvent("directory_import_previewed", {
            source: req.source, target: p.target,
            added: p.summary.added, updated: p.summary.updated,
            unchanged: p.summary.unchanged, blocked: p.summary.blocked,
          });
          setPreview(p);
          setRequestUsed(req);
          setNow(Date.now());
        },
        onError: (e) => {
          if (seq !== previewSeq.current) return;
          setError(errorText(e));
        },
        onSettled: () => {
          inFlight.current = false;
        },
      },
    );
  }

  function runConfirm() {
    if (inFlight.current || !preview || !requestUsed || !canSave) return;
    inFlight.current = true;
    const token = preview.previewToken;
    confirmMut.mutate(
      { data: { ...requestUsed, previewToken: token } },
      {
        onSuccess: async (r) => {
          trackEvent("directory_import_completed", {
            source: requestUsed.source, target: r.target,
            added: r.summary.added, updated: r.summary.updated,
            unchanged: r.summary.unchanged, blocked: r.summary.blocked,
          });
          setConfirmOpen(false);
          setPreview(null);
          setRequestUsed(null);
          setAcknowledged(false);
          setResult(r);
          await queryClient.invalidateQueries({
            predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/listings"),
          });
          toast({ title: "Import saved" });
        },
        onError: (e) => {
          setConfirmOpen(false);
          const status = (e as { status?: number }).status;
          setPreview(null);
          setRequestUsed(null);
          setAcknowledged(false);
          setError(
            status === 409
              ? "The database changed since this preview was made. Nothing was saved. Preview again to see current differences."
              : `${errorText(e)} Nothing was confirmed. Preview again before saving.`,
          );
        },
        onSettled: () => {
          inFlight.current = false;
        },
      },
    );
  }

  const s = preview?.summary;
  const canSave =
    !!preview && !!s && !expired && s.blocked === 0 && s.added + s.updated > 0 && acknowledged && !busy;

  const rows = preview?.rows ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.action === filter)),
    [rows, filter],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const canPreview = !busy && (source === "prepared" || files.length > 0);

  return (
    <div className="space-y-6" data-testid="panel-directory-import">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-lg font-bold">Import listings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview first. Nothing is saved until you review the changes and confirm. Previews never run automatically.
        </p>

        <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm" data-testid="text-protected-fields">
          <p className="font-semibold">Protected on existing listings</p>
          <p className="mt-1 text-muted-foreground">
            Ratings and review counts, verified status, featured status, broadcaster and payment flags, and videos are never
            changed by an import. Missing coordinates are left empty, never guessed.
          </p>
        </div>

        <fieldset className="mt-5" disabled={busy}>
          <legend className="mb-2 text-sm font-medium">Source</legend>
          <div className="flex flex-wrap gap-2">
            {([
              { id: "prepared", label: "Prepared directory (296 listings)" },
              { id: "csv", label: "Upload CSV files" },
            ] as const).map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={source === o.id}
                disabled={busy}
                onClick={() => changeSource(o.id)}
                data-testid={`button-source-${o.id}`}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
                  source === o.id ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>

        {source === "prepared" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Uses the bundled directory with validated coordinates. No upload needed.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="import-files">CSV files (up to 6, 1 MB total)</Label>
              <input
                id="import-files"
                type="file"
                accept=".csv,text/csv"
                multiple
                disabled={busy}
                onChange={(e) => {
                  void onPick(e.target.files);
                  e.target.value = "";
                }}
                data-testid="input-import-files"
                className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-60"
              />
            </div>
            <div>
              <Label htmlFor="import-city">City fallback</Label>
              <select
                id="import-city"
                value={city}
                disabled={busy}
                onChange={(e) => changeCity(e.target.value)}
                data-testid="select-import-city"
                className="mt-1.5 h-9 w-full rounded-md border bg-card px-3 text-sm disabled:opacity-60"
              >
                <option value="">Let the server infer the city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Used only when a row has no city.</p>
            </div>
            <div className="sm:col-span-2" aria-live="polite">
              {reading && <p className="text-sm text-muted-foreground">Reading files...</p>}
              {fileError && (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-file-error">
                  {fileError}
                </p>
              )}
              {!reading && !fileError && files.length === 0 && (
                <p className="text-sm text-muted-foreground">No files selected yet.</p>
              )}
              {files.length > 0 && (
                <ul className="divide-y rounded-lg border text-sm" data-testid="list-import-files">
                  {files.map((f) => (
                    <li key={f.name} className="flex justify-between gap-3 px-3 py-2">
                      <span className="truncate font-medium">{f.name}</span>
                      <span className="shrink-0 text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="mt-5">
          <Button onClick={runPreview} disabled={!canPreview} data-testid="button-preview-import">
            {previewMut.isPending ? "Building preview..." : preview ? "Refresh preview" : "Preview changes"}
          </Button>
        </div>
      </section>

      {previewMut.isPending && (
        <div className="space-y-3" aria-busy="true" data-testid="state-loading">
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {error && !previewMut.isPending && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm" data-testid="text-import-error">
          <p className="font-semibold text-destructive">Import problem</p>
          <p className="mt-1">{error}</p>
          <Button className="mt-3" variant="outline" size="sm" onClick={runPreview} disabled={!canPreview}>
            Preview again
          </Button>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5" role="status" data-testid="text-import-result">
          <p className="text-lg font-bold">
            Import saved to {result.target === "live" ? "the live directory" : "the development database"}
          </p>
          <p className="mt-1 text-sm">
            Added {result.summary.added}, updated {result.summary.updated}, unchanged {result.summary.unchanged}, blocked{" "}
            {result.summary.blocked}.
          </p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => setResult(null)} data-testid="button-new-preview">
            Start a new preview
          </Button>
        </div>
      )}

      {preview && s && (
        <section className="space-y-4" data-testid="section-preview">
          <div
            className={`rounded-xl border-2 p-4 ${
              preview.target === "live" ? "border-destructive/50 bg-destructive/10" : "border-primary/40 bg-primary/10"
            }`}
            data-testid="banner-target"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target environment</p>
            <p className="text-2xl font-bold">
              {preview.target === "live" ? "LIVE directory" : "Development database"}
            </p>
            <p className="text-sm text-muted-foreground">
              {preview.target === "live" ? "Confirming changes real listings that visitors see." : "Confirming changes test data only."}{" "}
              Preview expires {new Date(preview.expiresAt).toLocaleTimeString()}.
            </p>
          </div>

          {expired && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="text-expired">
              This preview has expired. Preview again to save.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {([
              { k: "add", label: "Additions", v: s.added },
              { k: "update", label: "Updates", v: s.updated },
              { k: "unchanged", label: "Unchanged", v: s.unchanged },
              { k: "blocked", label: "Blocked", v: s.blocked },
            ] as const).map((c) => (
              <div key={c.k} className="rounded-xl border bg-card p-4" data-testid={`count-${c.k}`}>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold">{c.v}</p>
              </div>
            ))}
          </div>

          {s.blocked > 0 && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {s.blocked} row{s.blocked === 1 ? " is" : "s are"} blocked, so saving is disabled. Fix the source and preview again.
            </p>
          )}
          {s.blocked === 0 && s.added + s.updated === 0 && (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground" data-testid="text-nothing-to-import">
              Nothing to import. Every row already matches the directory.
            </p>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "add", "update", "unchanged", "blocked"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => { setFilter(f); setPage(0); }}
                data-testid={`button-filter-${f}`}
                className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold capitalize transition-colors ${
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? `All ${rows.length}` : `${f} ${rows.filter((r) => r.action === f).length}`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
              No rows in this view.
            </div>
          ) : (
            <ul className="space-y-2" data-testid="list-preview-rows">
              {pageRows.map((r) => (
                <RowItem key={`${r.source}-${r.row}`} r={r} />
              ))}
            </ul>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} data-testid="button-prev-page">
                Previous
              </Button>
              <span className="text-muted-foreground">Page {page + 1} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} data-testid="button-next-page">
                Next
              </Button>
            </div>
          )}

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold">Add all listings</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground" data-testid="text-add-all-scope">
              Add all {s.added} new listings and apply all {s.updated} updates from this preview, across every file,
              page and filter. Unchanged listings are skipped.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={busy}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4"
                data-testid="checkbox-acknowledge"
              />
              <span>
                I reviewed every addition and before/after update above, and I understand protected fields (ratings, review counts,
                verified, featured, broadcaster and payment flags, video) will not change.
              </span>
            </label>
            <Button
              className="mt-4 w-full sm:w-auto"
              disabled={!canSave}
              onClick={() => setConfirmOpen(true)}
              data-testid="button-open-confirm"
            >
              {saving ? "Saving..." : `Add all listings (${s.added + s.updated})`}
            </Button>
          </div>
        </section>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !saving && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add all listings from this preview?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add {s?.added ?? 0} and update {s?.updated ?? 0} listings in{" "}
              {preview?.target === "live" ? "the LIVE directory" : "the development database"}, including every file and page
              regardless of the current filter. It is applied together or not at all.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSave || saving}
              onClick={(e) => {
                e.preventDefault();
                runConfirm();
              }}
              data-testid="button-confirm-import"
            >
              {saving ? "Saving..." : "Confirm and save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function errorText(e: unknown): string {
  const status = (e as { status?: number }).status;
  if (status === 401 || status === 403) return "You are not authorized to import listings.";
  if (status === 413) return "The input is too large for the server.";
  const msg = e instanceof Error ? e.message : "";
  return msg || "Request failed.";
}

function RowItem({ r }: { r: DirectoryImportRow }) {
  return (
    <li className="rounded-xl border bg-card p-4" data-testid={`row-import-${r.source}-${r.row}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{r.name || "(no name)"}</p>
          <p className="text-xs text-muted-foreground">
            {r.source}, row {r.row}
          </p>
        </div>
        <Badge variant="outline" className={`capitalize ${ACTION_STYLES[r.action] ?? ""}`}>
          {r.action}
        </Badge>
      </div>
      {r.reason && <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>}
      {r.changes.length > 0 && (
        <dl className="mt-3 space-y-2 text-sm">
          {r.changes.map((c, i) => (
            <div key={`${c.field}-${i}`} className="grid gap-1 sm:grid-cols-[8rem_1fr_1fr] sm:gap-3">
              <dt className="font-medium">{c.field}</dt>
              <dd className="break-words rounded bg-muted/50 px-2 py-1 text-muted-foreground">
                <span className="sr-only">Before: </span>
                {c.before || "(empty)"}
              </dd>
              <dd className="break-words rounded bg-emerald-500/10 px-2 py-1">
                <span className="sr-only">After: </span>
                {c.after || "(empty)"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
