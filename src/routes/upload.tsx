import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Clipboard, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { parseContent, addPosts, useStore, setPostsPerDay } from "@/lib/store";

export const Route = createFileRoute("/upload")({
  component: UploadPage,
  head: () => ({
    meta: [
      { title: "Importer — PostPilot" },
      { name: "description", content: "Importe ton contenu pour commencer à poster" },
    ],
  }),
});

function UploadPage() {
  const [text, setText] = useState("");
  const [postsPerDay, setLocalPostsPerDay] = useState(3);
  const [preview, setPreview] = useState<string[]>([]);
  const navigate = useNavigate();
  const state = useStore();

  const handlePaste = async () => {
    const clip = await navigator.clipboard.readText();
    setText(clip);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    const blocks = text
      .split(/\n{2,}|\r\n{2,}/)
      .map((b) => b.trim())
      .filter((b) => b.length > 10);
    setPreview(blocks);
  };

  const handleImport = () => {
    setPostsPerDay(postsPerDay);
    const posts = parseContent(text, postsPerDay);
    addPosts(posts);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Importer du contenu</h1>
        <p className="text-xs text-muted-foreground mb-6">
          Colle ton texte de Manus AI ou importe un fichier. Sépare chaque post par une ligne vide.
        </p>

        {/* Input Area */}
        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Post 1 : Votre texte ici...\n\nPost 2 : Un autre texte...\n\nPost 3 : Encore un texte..."}
            className="w-full h-48 rounded-2xl border border-input bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
          <button
            onClick={handlePaste}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </div>

        {/* File Upload */}
        <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-border p-4 mb-6 cursor-pointer hover:border-primary hover:bg-accent/50 transition-all">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Ou importer un fichier (.txt)</span>
          <input type="file" accept=".txt,.text" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Posts per day */}
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Posts par jour</p>
          <div className="flex gap-2">
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setLocalPostsPerDay(n)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                  postsPerDay === n
                    ? "gradient-primary text-primary-foreground shadow-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {text.length > 0 && preview.length === 0 && (
          <Button
            onClick={handlePreview}
            variant="outline"
            className="w-full rounded-xl h-12 mb-4"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Prévisualiser ({text.split(/\n{2,}/).filter(b => b.trim().length > 10).length} posts détectés)
          </Button>
        )}

        {preview.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              {preview.length} posts détectés
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {preview.map((block, i) => (
                <div key={i} className="bg-card rounded-xl p-3 border border-border">
                  <span className="text-[10px] text-muted-foreground">Post {i + 1}</span>
                  <p className="text-xs text-foreground line-clamp-3 mt-1">{block}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import Button */}
        {text.length > 0 && (
          <Button
            onClick={handleImport}
            className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary h-14 text-base font-semibold"
          >
            <ArrowRight className="w-5 h-5 mr-2" /> Importer et planifier
          </Button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
