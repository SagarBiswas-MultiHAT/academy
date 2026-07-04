"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BookOpen,
  ChevronDown,
  Pencil,
  PlusCircle,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

// ── Types ────────────────────────────────────────────────────────────────────

type Book = {
  id: string
  title: string
  slug: string
  isPublished: boolean
}

type Question = {
  id: string
  bookId: string
  prompt: string
  options: string[]
  correctAnswer: string
  sortOrder: number
}

const EMPTY_OPTION_ROWS = 4

const buildEmptyForm = () => ({
  prompt: "",
  options: Array(EMPTY_OPTION_ROWS).fill("") as string[],
  correctAnswer: "",
  sortOrder: "",
})

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminQuizzesPage() {
  // Book list
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string>("")

  // Questions for selected book
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [bookTitle, setBookTitle] = useState("")

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(buildEmptyForm())
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Edit form
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(buildEmptyForm())
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Load books ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setBooksLoading(true)
    api
      .get("/quizzes/admin/books")
      .then((res) => {
        const data = res.data.data as Book[]
        setBooks(data)
        if (data.length > 0) setSelectedSlug(data[0].slug)
      })
      .catch(() => setBooks([]))
      .finally(() => setBooksLoading(false))
  }, [])

  // ── Load questions ──────────────────────────────────────────────────────────

  const loadQuestions = useCallback((slug: string) => {
    if (!slug) return
    setQuestionsLoading(true)
    api
      .get(`/quizzes/admin/${slug}`)
      .then((res) => {
        const d = res.data.data
        setQuestions(d.questions as Question[])
        setBookTitle(d.bookTitle)
      })
      .catch(() => setQuestions([]))
      .finally(() => setQuestionsLoading(false))
  }, [])

  useEffect(() => {
    if (selectedSlug) loadQuestions(selectedSlug)
  }, [selectedSlug, loadQuestions])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const cleanOptions = (opts: string[]) => opts.map((o) => o.trim()).filter(Boolean)

  const validateForm = (form: typeof createForm): string | null => {
    if (!form.prompt.trim()) return "Question prompt is required."
    const opts = cleanOptions(form.options)
    if (opts.length < 2) return "At least 2 non-empty options are required."
    if (!form.correctAnswer.trim()) return "Correct answer is required."
    if (!opts.includes(form.correctAnswer.trim())) return "Correct answer must exactly match one of the options."
    return null
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    const err = validateForm(createForm)
    if (err) { setCreateError(err); return }
    setCreateError(null)
    setCreating(true)
    try {
      await api.post("/quizzes/admin/questions", {
        bookSlug: selectedSlug,
        prompt: createForm.prompt.trim(),
        options: cleanOptions(createForm.options),
        correctAnswer: createForm.correctAnswer.trim(),
        ...(createForm.sortOrder !== "" && { sortOrder: Number(createForm.sortOrder) }),
      })
      setShowCreate(false)
      setCreateForm(buildEmptyForm())
      loadQuestions(selectedSlug)
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setCreateError(typeof msg === "string" ? msg : "Failed to create question.")
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  const openEdit = (q: Question) => {
    const paddedOptions = [...q.options]
    while (paddedOptions.length < EMPTY_OPTION_ROWS) paddedOptions.push("")
    setEditId(q.id)
    setEditForm({
      prompt: q.prompt,
      options: paddedOptions,
      correctAnswer: q.correctAnswer,
      sortOrder: String(q.sortOrder),
    })
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    const err = validateForm(editForm)
    if (err) { setEditError(err); return }
    setEditError(null)
    setSaving(true)
    try {
      await api.patch(`/quizzes/admin/questions/${editId}`, {
        prompt: editForm.prompt.trim(),
        options: cleanOptions(editForm.options),
        correctAnswer: editForm.correctAnswer.trim(),
        ...(editForm.sortOrder !== "" && { sortOrder: Number(editForm.sortOrder) }),
      })
      setEditId(null)
      loadQuestions(selectedSlug)
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setEditError(typeof msg === "string" ? msg : "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question? This cannot be undone.")) return
    setDeletingId(id)
    try {
      await api.delete(`/quizzes/admin/questions/${id}`)
      loadQuestions(selectedSlug)
    } catch {
      alert("Failed to delete question.")
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="size-6 text-emerald-500" />
          Quiz Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, and delete quiz questions for each book. The quiz engine requires ≥70% to pass.
        </p>
      </div>

      {/* Book selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="size-4" /> Select a book
          </CardTitle>
          <CardDescription>Choose a book to manage its quiz questions.</CardDescription>
        </CardHeader>
        <CardContent>
          {booksLoading ? (
            <Skeleton className="h-10 w-72" />
          ) : (
            <div className="relative w-full max-w-sm">
              <select
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
                className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {books.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.title} {!b.isPublished ? "(draft)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions list */}
      {selectedSlug && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base">
                  {questionsLoading ? (
                    <Skeleton className="h-5 w-48" />
                  ) : (
                    <>Questions for <span className="text-emerald-500 dark:text-emerald-400">{bookTitle}</span></>
                  )}
                </CardTitle>
                <CardDescription>
                  {questionsLoading ? "" : `${questions.length} question${questions.length !== 1 ? "s" : ""} total`}
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                onClick={() => { setShowCreate(true); setCreateError(null); setCreateForm(buildEmptyForm()) }}
              >
                <PlusCircle className="size-4" /> Add question
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* Create form */}
            {showCreate && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">New question</p>
                  <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>

                <QuestionForm
                  form={createForm}
                  onChange={setCreateForm}
                  error={createError}
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? "Saving..." : "Save question"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Question rows */}
            {questionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))
            ) : questions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No questions yet. Click <strong>Add question</strong> to create the first one.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id}>
                  {idx > 0 && <Separator className="my-4" />}

                  {editId === q.id ? (
                    /* Edit inline */
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                      <p className="font-medium text-sm text-primary">Editing Q{idx + 1}</p>
                      <QuestionForm
                        form={editForm}
                        onChange={setEditForm}
                        error={editError}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save changes"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Question card */
                    <div className="flex items-start justify-between gap-4 group">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs shrink-0">Q{idx + 1}</Badge>
                          <Badge variant="outline" className="text-xs font-mono shrink-0">order: {q.sortOrder}</Badge>
                        </div>
                        <p className="text-sm font-medium">{q.prompt}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => (
                            <span
                              key={opt}
                              className={`rounded px-2 py-0.5 text-xs border ${
                                opt === q.correctAnswer
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                                  : "border-border bg-muted/50 text-muted-foreground"
                              }`}
                            >
                              {opt === q.correctAnswer ? "✓ " : ""}{opt}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => openEdit(q)}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(q.id)}
                          disabled={deletingId === q.id}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Shared form component ─────────────────────────────────────────────────────

type FormState = {
  prompt: string
  options: string[]
  correctAnswer: string
  sortOrder: string
}

function QuestionForm({
  form,
  onChange,
  error,
}: {
  form: FormState
  onChange: (f: FormState) => void
  error: string | null
}) {
  const setOption = (idx: number, val: string) => {
    const opts = [...form.options]
    opts[idx] = val
    onChange({ ...form, options: opts })
  }

  return (
    <div className="space-y-4">
      {/* Prompt */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Question prompt</Label>
        <Textarea
          value={form.prompt}
          onChange={(e) => onChange({ ...form, prompt: e.target.value })}
          placeholder="e.g. What does the -oN flag in Nmap mean?"
          rows={2}
          className="resize-none text-sm"
        />
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Answer options (min 2)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {form.options.map((opt, i) => (
            <Input
              key={i}
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="text-sm"
            />
          ))}
        </div>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => onChange({ ...form, options: [...form.options, ""] })}
        >
          + Add another option
        </button>
      </div>

      {/* Correct answer */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Correct answer</Label>
        <div className="relative max-w-sm">
          <select
            value={form.correctAnswer}
            onChange={(e) => onChange({ ...form, correctAnswer: e.target.value })}
            className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— select correct answer —</option>
            {form.options
              .map((o) => o.trim())
              .filter(Boolean)
              .map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">Must exactly match one of the options above.</p>
      </div>

      {/* Sort order */}
      <div className="space-y-1.5 max-w-[120px]">
        <Label className="text-xs font-medium">Sort order (optional)</Label>
        <Input
          type="number"
          min={1}
          value={form.sortOrder}
          onChange={(e) => onChange({ ...form, sortOrder: e.target.value })}
          placeholder="auto"
          className="text-sm"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  )
}
