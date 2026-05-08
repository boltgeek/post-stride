import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { FileUp, FileText, Trash2, Pencil, Check, ArrowRight, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useInvalidateAppData } from "@/hooks/use-app-data";
import { addPosts, setPostsPerDay, fetchImportedDocuments, createImportedDocument, deleteImportedDocument, type ImportedDocument } from "@/lib/store";
import { extractTextFromFile } from "@/lib/document-parser";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
  head: () => ({
    meta: [
      { title: "Importer — Routine Post" },
      { name: "description", content: "Importe ton document pour analyser et planifier ton contenu" },
    ],
  }),
});

interface ExtractedPost {
  content: string;
  selected: boolean;
}

function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "analyzing" | "review" | "error">("upload");
  const [posts, setPosts] = useState<ExtractedPost[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [postsPerDay, setLocalPostsPerDay] = useState(3);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const invalidate = useInvalidateAppData();
  const queryClient = useQueryClient();
  const [docToDelete, setDocToDelete] = useState<ImportedDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["imported-documents"],
    queryFn: fetchImportedDocuments,
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [authLoading, user, navigate]);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setStep("analyzing");
    setError("");

    try {
      // 1. Extract text from document
      const text = await extractTextFromFile(f);

      if (text.trim().length < 20) {
        throw new Error("Le document semble vide ou illisible.");
      }

      // 2. Send to AI for analysis
      const { data, error: fnError } = await supabase.functions.invoke("analyze-document", {
        body: { text, fileName: f.name },
      });

      if (fnError) throw new Error(fnError.message || "Erreur d'analyse");
      if (data?.error) throw new Error(data.error);

      if (!data?.posts?.length) {
        throw new Error("Aucun post exploitable trouvé dans ce document.");
      }

      setSummary(data.documentSummary || "");
      setPosts(data.posts.map((p: { content: string }) => ({ content: p.content, selected: true })));
      setStep("review");
    } catch (err: any) {
      console.error("Processing error:", err);
      setError(err.message || "Erreur lors de l'analyse du document");
      setStep("error");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const togglePost = (idx: number) => {
    setPosts((prev) => prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p)));
  };

  const deletePost = (idx: number) => {
    setPosts((prev) => prev.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(posts[idx].content);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    setPosts((prev) => prev.map((p, i) => (i === editingIdx ? { ...p, content: editText } : p)));
    setEditingIdx(null);
    setEditText("");
  };

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      await setPostsPerDay(user.id, postsPerDay);

      const selectedPosts = posts.filter((p) => p.selected);
      const startDate = new Date();
      const times = ["09:00", "13:00", "18:00", "08:00", "11:00", "15:00", "17:00", "19:00"];

      const newPosts = selectedPosts.map((p, i) => {
        const dayOffset = Math.floor(i / postsPerDay);
        const timeIndex = i % postsPerDay;
        const date = new Date(startDate);
        date.setDate(date.getDate() + dayOffset);
        return {
          content: p.content,
          scheduledDate: date.toISOString().slice(0, 10),
          scheduledTime: times[timeIndex] || times[0],
          status: "pending" as const,
        };
      });

      const documentId = await createImportedDocument(
        user.id,
        file?.name || "Document",
        summary,
        newPosts.length
      );
      await addPosts(user.id, newPosts, documentId);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["imported-documents"] });
      navigate({ to: "/" });
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setDeletingId(docToDelete.id);
    const docId = docToDelete.id;
    try {
      // Optimistic update
      queryClient.setQueryData<ImportedDocument[]>(["imported-documents"], (old) =>
        (old || []).filter((d) => d.id !== docId)
      );
      await deleteImportedDocument(docId);
      // Posts cascade-delete via FK; refresh post lists too
      invalidate();
      toast.success("Document supprimé");
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error("Erreur lors de la suppression");
      queryClient.invalidateQueries({ queryKey: ["imported-documents"] });
    } finally {
      setDeletingId(null);
      setDocToDelete(null);
    }
  };

  if (authLoading || !user) return null;

  const selectedCount = posts.filter((p) => p.selected).length;
  const documents = documentsQuery.data || [];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Importer un document</h1>
        <p className="text-xs text-muted-foreground mb-6">
          Dépose ton fichier PDF ou Word. L'IA analyse et extrait les posts.
        </p>

        {/* STEP: Upload */}
        {step === "upload" && (
          <label
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
              dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary hover:bg-accent/50"
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
              <FileUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Dépose ton fichier ici</p>
            <p className="text-xs text-muted-foreground mb-3">ou clique pour sélectionner</p>
            <div className="flex gap-2">
              <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">PDF</span>
              <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">DOCX</span>
            </div>
            <input type="file" accept=".pdf,.docx,.doc" onChange={handleFileChange} className="hidden" />
          </label>
        )}

        {/* Imported documents list (visible on upload step) */}
        {step === "upload" && documents.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              Mes documents importés ({documents.length})
            </p>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-card rounded-2xl p-3 shadow-card border border-border flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {doc.postCount} posts · {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <button
                    onClick={() => setDocToDelete(doc)}
                    disabled={deletingId === doc.id}
                    aria-label={`Supprimer ${doc.fileName}`}
                    className="p-2 rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-destructive" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Analyzing */}
        {step === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1">Analyse en cours...</p>
            <p className="text-xs text-muted-foreground">{file?.name}</p>
            <p className="text-[10px] text-muted-foreground mt-3">L'IA lit, comprend et extrait les posts</p>
          </div>
        )}

        {/* STEP: Error */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-12 animate-slide-up">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Erreur d'analyse</p>
            <p className="text-xs text-muted-foreground text-center mb-6 max-w-xs">{error}</p>
            <Button onClick={() => { setStep("upload"); setFile(null); }} variant="outline" className="rounded-xl">
              Réessayer avec un autre fichier
            </Button>
          </div>
        )}

        {/* STEP: Review */}
        {step === "review" && (
          <div className="animate-slide-up">
            {/* File info */}
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file?.name}</p>
                <p className="text-[10px] text-muted-foreground">{summary}</p>
              </div>
              <button onClick={() => { setStep("upload"); setFile(null); setPosts([]); }} className="p-2 rounded-xl hover:bg-accent">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Posts per day */}
            <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-4">
              <p className="text-sm font-semibold text-foreground mb-3">Posts par jour</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLocalPostsPerDay(n)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                      postsPerDay === n ? "gradient-primary text-primary-foreground shadow-primary" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts list */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-3">
                {posts.length} posts extraits · {selectedCount} sélectionnés
              </p>
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {posts.map((post, i) => (
                  <div
                    key={i}
                    className={`bg-card rounded-xl p-3 border transition-all ${
                      post.selected ? "border-primary/30" : "border-border opacity-50"
                    }`}
                  >
                    {editingIdx === i ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground resize-none min-h-[100px] focus:ring-2 focus:ring-primary outline-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={saveEdit} className="rounded-lg text-xs h-8 gradient-primary text-primary-foreground">
                            <Check className="w-3 h-3 mr-1" /> Sauver
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)} className="rounded-lg text-xs h-8">
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2">
                          <button onClick={() => togglePost(i)} className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            post.selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                          }`}>
                            {post.selected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-muted-foreground">Post {i + 1}</span>
                            <p className="text-xs text-foreground mt-0.5 line-clamp-4">{post.content}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(i)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => deletePost(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Import button */}
            <Button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary h-14 text-base font-semibold"
            >
              {importing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              {importing ? "Importation..." : `Planifier ${selectedCount} posts`}
            </Button>
          </div>
        )}
      </div>
      <BottomNav />

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Es-tu sûr de vouloir supprimer ce document ? Cette action est irréversible.
              {docToDelete && docToDelete.postCount > 0 && (
                <span className="block mt-2 text-destructive">
                  ⚠️ {docToDelete.postCount} posts liés seront aussi supprimés.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
