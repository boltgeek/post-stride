import { useState } from "react";
import { Check, X, Copy, Clock, MessageCircle, Heart, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/store";
import { publishPost, skipPost, updatePostStats, updatePostContent, deletePost } from "@/lib/store";
import { useInvalidateAppData } from "@/hooks/use-app-data";
import { supabase } from "@/integrations/supabase/client";
import { PostEditor } from "@/components/PostEditor";
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const invalidate = useInvalidateAppData();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    try {
      await (supabase as any).rpc("increment_copy_count");
      invalidate();
    } catch (err) {
      console.error(err);
    }
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

  const handleSaveEdit = async (newText: string) => {
    setActing(true);
    try {
      await updatePostContent(post.id, newText);
      invalidate();
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const doDelete = async () => {
    setActing(true);
    try {
      await deletePost(post.id);
      invalidate();
      setConfirmDelete(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActing(false);
    }
  };

  const DeleteDialog = (
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce post ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le post sera supprimé définitivement.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={doDelete}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

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
      <>
        <div className="bg-card rounded-2xl p-4 shadow-card border border-border opacity-50 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-destructive" />
            </div>
            <span className="text-xs font-medium text-destructive">Ignoré</span>
            <button onClick={() => setConfirmDelete(true)} disabled={acting} className="ml-auto p-1 rounded-lg hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
        </div>
        {DeleteDialog}
      </>
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

  // Full-screen editing mode
  if (editing) {
    return (
      <PostEditor
        initialContent={post.content}
        onCancel={() => setEditing(false)}
        onSave={handleSaveEdit}
      />
    );
  }

  const PublishDialog = (
    <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>As-tu bien publié ce post sur Facebook ?</AlertDialogTitle>
          <AlertDialogDescription>
            On marque ce post comme publié dans ton calendrier uniquement si tu l'as déjà mis en ligne.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setConfirmPublish(false);
              await handlePublish();
            }}
            className="rounded-xl bg-success text-success-foreground hover:bg-success/90"
          >
            Oui, confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      <div className={`bg-card rounded-2xl p-5 shadow-card border animate-slide-up ${isNext ? "border-primary shadow-primary" : "border-border"}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {post.scheduledTime}
            {isNext && (
              <span className="ml-2 text-[10px] font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full animate-pulse-glow">MAINTENANT</span>
            )}
          </span>
          <button onClick={() => setConfirmDelete(true)} disabled={acting} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" aria-label="Supprimer">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-foreground leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

        <button
          onClick={() => setEditing(true)}
          className="w-full mb-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 text-primary text-sm font-semibold py-2.5 hover:bg-primary/5 transition-colors"
        >
          <Pencil className="w-4 h-4" /> Personnaliser ✏️
        </button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="flex-1 rounded-xl h-12 text-sm font-semibold border-primary text-primary hover:bg-primary/5 hover:text-primary"
          >
            {copied ? <Check className="w-4 h-4 mr-1 text-success" /> : <Copy className="w-4 h-4 mr-1" />}
            Copier
          </Button>
          <Button
            onClick={() => setConfirmPublish(true)}
            disabled={acting}
            className="flex-1 rounded-xl h-12 text-sm font-semibold bg-success text-success-foreground hover:bg-success/90"
          >
            <Check className="w-4 h-4 mr-1" /> Marquer comme publié
          </Button>
        </div>

        <button
          onClick={handleSkip}
          disabled={acting}
          className="w-full mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          Ignorer ce post
        </button>
      </div>
      {DeleteDialog}
      {PublishDialog}
    </>
  );
}

