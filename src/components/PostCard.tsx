import { useState } from "react";
import { Check, X, Copy, Clock, MessageCircle, Heart, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/store";
import { publishPost, skipPost, updatePostStats, updatePostContent, deletePost } from "@/lib/store";
import { useInvalidateAppData } from "@/hooks/use-app-data";

interface PostCardProps {
  post: Post;
  isNext?: boolean;
}

export function PostCard({ post, isNext }: PostCardProps) {
  const [copied, setCopied] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [reactions, setReactions] = useState(post.reactions?.toString() || "");
  const [comments, setComments] = useState(post.comments?.toString() || "");
  const [acting, setActing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const invalidate = useInvalidateAppData();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    setActing(true);
    try {
      await publishPost(post.id);
      invalidate();
      setShowStats(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const handleSkip = async () => {
    setActing(true);
    try {
      await skipPost(post.id);
      invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const handleSaveStats = async () => {
    setActing(true);
    try {
      await updatePostStats(post.id, parseInt(reactions) || 0, parseInt(comments) || 0);
      invalidate();
      setShowStats(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const handleSaveEdit = async () => {
    setActing(true);
    try {
      await updatePostContent(post.id, editText);
      invalidate();
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    setActing(true);
    try {
      await deletePost(post.id);
      invalidate();
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  if (post.status === "published" && !showStats) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border opacity-75 animate-slide-up">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full gradient-success flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-success-foreground" />
          </div>
          <span className="text-xs font-medium text-success">Publié</span>
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" /> {post.scheduledTime}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
        {(post.reactions !== undefined || post.comments !== undefined) && (
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.reactions || 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments || 0}</span>
          </div>
        )}
      </div>
    );
  }

  if (post.status === "skipped") {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card border border-border opacity-50 animate-slide-up">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-destructive" />
          </div>
          <span className="text-xs font-medium text-destructive">Ignoré</span>
          <button onClick={handleDelete} disabled={acting} className="ml-auto p-1 rounded-lg hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
      </div>
    );
  }

  if (showStats) {
    return (
      <div className="bg-card rounded-2xl p-5 shadow-card border-2 border-success animate-confetti-pop">
        <div className="text-center mb-4">
          <span className="text-3xl">🎉</span>
          <p className="text-sm font-semibold text-foreground mt-1">Bravo ! +10 points</p>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-4">Comment ça s'est passé ?</p>
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
              <Heart className="w-3 h-3" /> Réactions
            </label>
            <input type="number" min="0" value={reactions} onChange={(e) => setReactions(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-center" placeholder="0" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
              <MessageCircle className="w-3 h-3" /> Commentaires
            </label>
            <input type="number" min="0" value={comments} onChange={(e) => setComments(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-center" placeholder="0" />
          </div>
        </div>
        <Button onClick={handleSaveStats} disabled={acting} className="w-full rounded-xl gradient-primary text-primary-foreground shadow-primary">
          Enregistrer
        </Button>
      </div>
    );
  }

  // Editing mode
  if (editing) {
    return (
      <div className={`bg-card rounded-2xl p-5 shadow-card border-2 border-primary animate-slide-up`}>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground resize-none min-h-[120px] focus:ring-2 focus:ring-primary outline-none"
        />
        <div className="flex gap-2 mt-3">
          <Button onClick={handleSaveEdit} disabled={acting} className="flex-1 rounded-xl gradient-primary text-primary-foreground h-10 text-sm font-semibold">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Sauver</>}
          </Button>
          <Button variant="ghost" onClick={() => { setEditing(false); setEditText(post.content); }} className="rounded-xl h-10">
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-2xl p-5 shadow-card border animate-slide-up ${isNext ? "border-primary shadow-primary" : "border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {post.scheduledTime}
        </span>
        <div className="flex items-center gap-1">
          {isNext && (
            <span className="text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full animate-pulse-glow">MAINTENANT</span>
          )}
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={handleDelete} disabled={acting} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
      <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
      <div className="flex gap-2">
        <Button onClick={handlePublish} disabled={acting} className="flex-1 rounded-xl gradient-primary text-primary-foreground shadow-primary h-12 text-base font-semibold">
          <Check className="w-5 h-5 mr-1" /> Publié ✓
        </Button>
        <Button variant="outline" onClick={handleCopy} className="rounded-xl h-12 px-4">
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" onClick={handleSkip} disabled={acting} className="rounded-xl h-12 px-4 text-muted-foreground">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
