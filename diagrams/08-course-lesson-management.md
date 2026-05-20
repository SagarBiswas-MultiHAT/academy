# Course and Lesson Management Flow

Content pipeline from source notebook to published course with quizzes.

```mermaid
flowchart TD
    start(["📓 Source notebook ready\n(.docx / .pdf)"]) --> convert["Convert to Markdown\n(Pandoc)"]
    convert --> structure["Split into chapters\n& define lesson order"]
    structure --> edit["Quality review & edit\n(formatting, examples, CTAs)"]
    edit --> free_preview["Mark first 3 chapters\nas free preview"]
    free_preview --> upload["Upload content to\nPostgreSQL via Prisma"]

    upload --> quiz_create["Create quiz questions\nfor the book"]
    quiz_create --> quiz_review["Set pass mark (≥ 70%)\n& review questions"]
    quiz_review --> cert_template["Prepare certificate template\n(Canva → PDF)"]

    cert_template --> preview["Preview in Next.js\n(/books/[slug])"]
    preview --> test["Test full flow:\nbuy → PDF → quiz → cert"]
    test --> publish{"Ready to\npublish?"}
    publish -- "Needs changes" --> edit
    publish -- "Approved" --> go_live["✅ Set is_published = true"]
    go_live --> notify["📢 Notify learners\n(email + social media)"]
    notify --> monitor["📊 Monitor sales & quiz stats\nin admin dashboard"]
```
