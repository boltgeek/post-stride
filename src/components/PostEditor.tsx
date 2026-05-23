import { useState, useRef } from "react";
import { Bold, Italic, Underline, CaseUpper, Smile, Wand2, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { humanizePost } from "@/lib/humanize.functions";

interface PostEditorProps {
  initialContent: string;
  onCancel: () => void;
  onSave: (newContent: string) => void | Promise<void>;
}

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Les + utilisés en vente",
    emojis: ["🔥", "💯", "✅", "👇", "💪", "🛍️", "💰", "📦", "🤩", "😍", "👏", "🎯"],
  },
  {
    label: "Visages & Émotions",
    emojis: ["😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😘", "🤩", "😎", "🤗", "🤔", "😮", "😢", "😡", "🥳", "😴", "🤤"],
  },
  {
    label: "Mains & Gestes",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤝", "🙏", "👏", "💪", "👇", "👉", "👈", "☝️", "✋", "🤚", "👋"],
  },
  {
    label: "Cœurs & Amour",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💗", "💓", "💞", "💕", "💝", "💘", "💋"],
  },
  {
    label: "Feu & Succès",
    emojis: ["🔥", "✨", "⭐", "🌟", "💫", "💯", "🏆", "🥇", "🎉", "🎊", "🎯", "🚀", "⚡", "💥"],
  },
  {
    label: "Business & Shopping",
    emojis: ["🛍️", "🛒", "💰", "💵", "💴", "💶", "💷", "💳", "📦", "🎁", "🏷️", "📈", "📊", "💼", "🏪", "🏬"],
  },
  {
    label: "Flèches & Symboles",
    emojis: ["👇", "👆", "👉", "👈", "⬇️", "⬆️", "➡️", "⬅️", "↘️", "↙️", "✅", "❌", "⚠️", "❗", "❓", "💬"],
  },
];

export function PostEditor({ initialContent, onCancel, onSave }: PostEditorProps) {
  const [text, setText] = useState(initialContent);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showHumanize, setShowHumanize] = useState(false);
  const [detail, setDetail] = useState("");
  const [humanizing, setHumanizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const humanize = useServerFn(humanizePost);

  const wrapSelection = (before: string, after: string = before) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = text.slice(start, end) || "texte";
    const next = text.slice(0, start) + before + selected + after + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const transformSelectionUpper = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setText(text.toUpperCase());
      return;
    }
    const next = text.slice(0, start) + text.slice(start, end).toUpperCase() + text.slice(end);
    setText(next);
  };

  const insertAtCursor = (str: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText(text + str);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = text.slice(0, start) + str + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + str.length, start + str.length);
    });
  };

  const runHumanize = async () => {
    if (!detail.trim()) {
      toast.error("Ajoute un petit détail personnel");
      return;
    }
    setHumanizing(true);
    try {
      const res = await humanize({ data: { content: text, detail: detail.trim() } });
      setText(res.content);
      setShowHumanize(false);
      setDetail("");
      toast.success("✨ Post personnalisé !");
    } catch (e: any) {
      toast.error(e.message || "Impossible de personnaliser");
    } finally {
      setHumanizing(false);
    }
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-lg hover:bg-accent" aria-label="Fermer">
          <X className="w-5 h-5 text-foreground" />
        </button>
        <h2 className="text-sm font-semibold text-foreground">Personnaliser le post</h2>
        <div className="w-9" />
      </header>

      {/* Editable text */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={true}
          lang="fr"
          autoFocus
          className="w-full min-h-[40vh] bg-white text-foreground rounded-2xl border border-border p-4 text-base leading-relaxed resize-none focus:ring-2 focus:ring-primary outline-none whitespace-pre-wrap"
          style={{ fontSize: "16px" }}
        />

        {/* Humanize panel */}
        {showHumanize && (
          <div className="mt-4 bg-card rounded-2xl border-2 border-primary p-4 animate-slide-up">
            <label className="text-xs font-semibold text-foreground block mb-2">
              Rends ce post + humain 🪄
            </label>
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Ajoute un détail perso (ex : un·e client·e contente, un produit que tu vends...)"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm mb-3"
              maxLength={300}
            />
            <div className="flex gap-2">
              <Button
                onClick={runHumanize}
                disabled={humanizing}
                className="flex-1 rounded-xl gradient-primary text-primary-foreground h-10 text-sm font-semibold"
              >
                {humanizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>✨ Réécrire</>}
              </Button>
              <Button variant="ghost" onClick={() => setShowHumanize(false)} className="rounded-xl h-10">
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Emoji panel */}
        {showEmojis && (
          <div className="mt-4 bg-card rounded-2xl border border-border p-3 animate-slide-up max-h-[40vh] overflow-y-auto">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-3 last:mb-0">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{cat.label}</p>
                <div className="grid grid-cols-8 gap-1">
                  {cat.emojis.map((e, i) => (
                    <button
                      key={`${cat.label}-${i}`}
                      onClick={() => insertAtCursor(e)}
                      className="aspect-square text-xl rounded-lg hover:bg-accent transition-colors"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="border-t border-border bg-card px-3 py-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => wrapSelection("**")}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Gras"
        >
          <Bold className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => wrapSelection("_")}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Italique"
        >
          <Italic className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => wrapSelection("__")}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Souligné"
        >
          <Underline className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={transformSelectionUpper}
          className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="MAJUSCULES"
        >
          <CaseUpper className="w-5 h-5 text-foreground" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          onClick={() => {
            setShowEmojis((v) => !v);
            setShowHumanize(false);
          }}
          className={`flex-shrink-0 p-2 rounded-lg transition-colors ${showEmojis ? "bg-accent" : "hover:bg-accent"}`}
          aria-label="Emojis"
        >
          <Smile className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => {
            setShowHumanize((v) => !v);
            setShowEmojis(false);
          }}
          className={`flex-shrink-0 ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-primary text-primary ${showHumanize ? "bg-primary/10" : "hover:bg-primary/5"} transition-colors`}
        >
          <Wand2 className="w-4 h-4" />
          Rendre + humain 🪄
        </button>
      </div>

      {/* Bottom action buttons */}
      <div className="border-t border-border bg-card px-4 py-3 flex gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="flex-1 rounded-xl h-12 bg-muted text-foreground hover:bg-muted/80"
        >
          Annuler
        </Button>
        <Button
          onClick={doSave}
          disabled={saving || !text.trim()}
          className="flex-1 rounded-xl gradient-primary text-primary-foreground shadow-primary h-12 text-base font-semibold"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-1" /> Enregistrer</>}
        </Button>
      </div>
    </div>
  );
}
