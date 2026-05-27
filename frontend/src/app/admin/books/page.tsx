"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, Pencil, PlusCircle } from "lucide-react"

import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type ChapterMeta = {
  index: number
  title: string
  isFree: boolean
}

type Book = {
  id: string
  title: string
  slug: string
  description: string
  price: number | string
  isPublished: boolean
  chapterMetadata?: ChapterMeta[]
}

const defaultChapterJson = JSON.stringify(
  [
    { index: 1, title: "Introduction", isFree: true },
    { index: 2, title: "Core Concepts", isFree: true },
    { index: 3, title: "Advanced Techniques", isFree: false },
  ],
  null,
  2
)

const parseChapters = (value: string) => {
  if (!value.trim()) return []
  const parsed = JSON.parse(value)
  if (!Array.isArray(parsed)) {
    throw new Error("Chapter metadata must be a JSON array")
  }
  return parsed as ChapterMeta[]
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    title: "",
    slug: "",
    description: "",
    price: "",
    isPublished: true,
    chapterMetadata: defaultChapterJson,
  })

  const [editForm, setEditForm] = useState({
    title: "",
    slug: "",
    description: "",
    price: "",
    isPublished: true,
    chapterMetadata: "",
  })

  const loadBooks = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get("/books", { params: { page: 1, limit: 100 } })
      const payload = res.data.data as { books: Book[] }
      setBooks(payload.books || [])
    } catch {
      setError("Unable to load books.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  const handleCreate = async () => {
    setCreateError(null)
    setCreating(true)
    try {
      const chapterMetadata = parseChapters(createForm.chapterMetadata)
      await api.post("/books", {
        title: createForm.title,
        slug: createForm.slug,
        description: createForm.description,
        price: Number(createForm.price),
        isPublished: createForm.isPublished,
        chapterMetadata,
      })
      setCreateForm({
        title: "",
        slug: "",
        description: "",
        price: "",
        isPublished: true,
        chapterMetadata: defaultChapterJson,
      })
      await loadBooks()
    } catch {
      setCreateError("Unable to create book. Check fields and chapter JSON.")
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (book: Book) => {
    setEditId(book.id)
    setEditForm({
      title: book.title,
      slug: book.slug,
      description: book.description,
      price: String(book.price),
      isPublished: book.isPublished,
      chapterMetadata: JSON.stringify(book.chapterMetadata ?? [], null, 2),
    })
  }

  const handleSave = async () => {
    if (!editId) return
    setEditError(null)
    setSaving(true)
    try {
      const chapterMetadata = parseChapters(editForm.chapterMetadata)
      await api.patch(`/books/${editId}`, {
        title: editForm.title,
        slug: editForm.slug,
        description: editForm.description,
        price: Number(editForm.price),
        isPublished: editForm.isPublished,
        chapterMetadata,
      })
      setEditId(null)
      await loadBooks()
    } catch {
      setEditError("Unable to update book. Check fields and chapter JSON.")
    } finally {
      setSaving(false)
    }
  }

  const displayBooks: Array<Book | null> = loading
    ? Array.from({ length: 3 }).map(() => null)
    : books

  const selectedBook = useMemo(
    () => books.find((book) => book.id === editId) ?? null,
    [books, editId]
  )

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
          Admin books
        </h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, and publish books with chapter metadata.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="size-5 text-primary" /> Create book
            </CardTitle>
            <CardDescription>All fields are required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={createForm.slug}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, slug: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price (BDT)</Label>
                <Input
                  id="price"
                  type="number"
                  value={createForm.price}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="published"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={createForm.isPublished}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, isPublished: event.target.checked }))
                  }
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapters">Chapter metadata (JSON)</Label>
              <Textarea
                id="chapters"
                value={createForm.chapterMetadata}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, chapterMetadata: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Provide an array of chapters with index, title, and isFree fields.
              </p>
            </div>
            {createError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "Create book"}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Pencil className="size-5 text-primary" /> Edit book
            </CardTitle>
            <CardDescription>Choose a book to update its details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit">Select book</Label>
              <select
                id="edit"
                value={editId ?? ""}
                onChange={(event) => {
                  const selected = books.find((book) => book.id === event.target.value)
                  if (selected) startEdit(selected)
                }}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <option value="" disabled>
                  Select a book
                </option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </div>

            {editId && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-slug">Slug</Label>
                  <Input
                    id="edit-slug"
                    value={editForm.slug}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, slug: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price (BDT)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editForm.price}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, price: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="edit-published"
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={editForm.isPublished}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, isPublished: event.target.checked }))
                      }
                    />
                    <Label htmlFor="edit-published">Published</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-chapters">Chapter metadata (JSON)</Label>
                  <Textarea
                    id="edit-chapters"
                    value={editForm.chapterMetadata}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, chapterMetadata: event.target.value }))
                    }
                  />
                </div>
                {editError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {editError}
                  </div>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            )}
            {!editId && (
              <p className="text-sm text-muted-foreground">
                Select a book to edit its details.
              </p>
            )}
            {selectedBook && (
              <p className="text-xs text-muted-foreground">
                Current chapters: {selectedBook.chapterMetadata?.length ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <p className="text-sm font-semibold">Published books</p>
          {error && <Badge variant="warning">{error}</Badge>}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {displayBooks.map((book, index) => (
            <Card key={book?.id ?? index}>
              <CardHeader>
                {book ? (
                  <>
                    <CardTitle className="text-lg">{book.title}</CardTitle>
                    <CardDescription>{book.description}</CardDescription>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                {book ? (
                  <>
                    <Badge variant={book.isPublished ? "success" : "secondary"}>
                      {book.isPublished ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="secondary">BDT {book.price}</Badge>
                    <Badge variant="outline">
                      Chapters {book.chapterMetadata?.length ?? 0}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-20" />
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
