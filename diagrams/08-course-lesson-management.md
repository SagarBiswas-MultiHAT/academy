# Course and Lesson Management Flow

Content pipeline: from `.docx` source → Pandoc conversion → chapter metadata → DB seeding → runtime post-processing → access-gated delivery → PDF watermarking.

```mermaid
flowchart TD
    source(["📓 Source notebook\n(.docx — authored in Microsoft Word)"]) --> pandoc

    subgraph authoring["✍️ Content Authoring (Local — PowerShell)"]
        pandoc["Pandoc conversion\npandoc YourBook.docx\n  -f docx -t gfm\n  --wrap=none\n  --extract-media=media\n  -o YourBook.md\n\nOutputs:\n• YourBook.md  (GitHub-flavoured Markdown)\n• media/       (extracted images)"]
        review["Quality review\n• Fix broken tables\n• Normalise headings: # Chapter N: Title\n• Fix code blocks · callouts · CTAs"]
        pandoc --> review
    end

    review --> classify

    subgraph chapter_config["📋 Chapter Access Classification\n(chapterMetadata JSON array)"]
        direction LR
        free_ch["📖 Free Chapters\nisFree: true\n(first N chapters)\nSSG — no login required"]
        paid_ch["🔒 Paid Web Chapters\nisFree: false\nPurchase required\n(Wallet or Gateway)"]
    end

    classify["Define chapterMetadata\n[ {index, title, isFree}, … ]\nStored in books.chapter_metadata (JSON)"] --> chapter_config

    chapter_config --> db_seed

    subgraph db_seed["🗄️ Database Seeding / Admin API"]
        create_book["POST /api/v1/books (Admin)\n{title, slug, description, price,\nchapterMetadata, is_published: false}"]
        create_questions["POST /api/v1/quizzes/admin/questions\n(prompt, options[], correct_answer, sort_order)\nPass threshold: 70% — hardcoded in service"]
        store_md["Store .md file on Droplet filesystem\nbooks/BookFolder/BookName.md\nbooks/BookFolder/media/*.png"]
        create_book --> create_questions
        create_book --> store_md
    end

    db_seed --> pdf_config

    subgraph pdf_config["📕 Premium E-Book PDF Configuration\n(if product has a PDF tier)"]
        register_slug["Register slug in\nPREMIUM_PDF_PRODUCTS constant\n(premium-pdf.ts)\n{slug, sourcePdfPath, generatedDir,\nattachmentFilename, requiresGatewayPayment: true}"]
        source_pdf["Place source PDF on Droplet:\nbooks/BookFolder/BookName.pdf\n(master — never served directly)"]
        register_slug --> source_pdf
    end

    pdf_config --> preview
    db_seed --> preview

    preview["Test in Next.js\n/books/[slug] — book detail\n/books/[slug]/chapters/[index] — chapter reader"] --> test["Test full flow:\nbuy → chapter access → quiz → cert → showcase"]
    test --> publish{"Ready to\npublish?"}
    publish -- "Needs changes" --> review
    publish -- "Approved" --> go_live["PATCH /api/v1/books/:id\n{is_published: true}\nBook visible in GET /books (public)"]
    go_live --> notify["📢 Notify learners\n(email + social media)"]
    notify --> runtime

    subgraph runtime["⚙️ Runtime: Chapter Delivery (per request)\nGET /api/v1/books/:slug/chapters/:index"]
        access_gate{"chapter.isFree?"}
        gate_free["Return content directly\n(no auth required)"]
        gate_check["Verify PAID order\nfor userId + bookId\n→ 403 Forbidden if none"]
        read_md["Read BookName.md from Droplet filesystem\nDynamically detect chapter boundaries:\n  • Pattern: # Chapter N: or Appendix\n  • Scan for pandoc **CHAPTER N** marker\n  • Slice lines between boundaries"]

        subgraph postprocess["Post-Processing Pipeline (10 steps)"]
            step1["① Normalise CRLF → LF\n   Strip pandoc chapter heading duplicates\n   Strip **CHAPTER N** decorators"]
            step2["② Normalise escaped chars\n   \\\\ → '' · \\' → ' · \\* → *\n   Trailing backslash removal"]
            step3["③ ASCII flowchart → HTML\n   <div class='flowchart-container'>"]
            step4["④ Strip {.underline} spans (4 passes)\n   Collapse adjacent **bold** markers"]
            step5["⑤ Flatten deep blockquotes (>> → >)\n   Blockquote search queries → code fences"]
            step6["⑥ Detect callout types → typed divs\n   <div data-callout='note|important|\n   tip|critical|warning'>"]
            step7["⑦ Convert Pandoc grid tables\n   → GFM pipe tables (react-markdown)"]
            step8["⑧ Rewrite image URLs\n   media/*.png\n   → {API_URL}/books/{slug}/media/*"]
            step9["⑨ Typography polish\n   Extra spacing before headings\n   Collapse 3+ blank lines → 2"]
        end

        access_gate -- "true\n(public)" --> gate_free --> read_md
        access_gate -- "false\n(gated)" --> gate_check --> read_md
        read_md --> postprocess

        response["Return:\n{bookTitle, bookSlug, hasPremiumPdf,\nchapter: {index, title, isFree},\ncontent: processedMarkdown,\ntotalChapters}"]
        postprocess --> response
    end

    subgraph media_serve["🖼️ Media Serving\nGET /api/v1/books/:slug/media/*"]
        slug_allowlist["Slug → directory allowlist\n(prevents slug injection)\nSlug 'google-dorks-complete-handbook'\n→ 'Google_Dorks_Complete_Handbook'"]
        path_guard["Path-traversal guard:\nresolved path must stay\nwithin books/BookDir/media/"]
        serve_file["res.sendFile(fullPath)"]
        slug_allowlist --> path_guard --> serve_file
    end

    subgraph pdf_watermark["💧 E-Book PDF Watermarking\n(on first purchase — cached to disk)"]
        check_cache{"generated/ebooks/\n{slug}-{orderId}.pdf\nexists?"}
        serve_cached["Return cached file path\n(idempotent)"]
        do_watermark["watermarkPdf(sourcePath, destPath,\n  buyerEmail, orderRef)\n\nFor every page:\n• Tiled diagonal text (opacity 0.065, -45°):\n  'LICENSED TO {EMAIL.UPPER}'\n• Footer (opacity 0.85, size 7.5pt):\n  'Licensed to: {email} | Order: {ref}\n   | MultiHAT Academy'\n\nSaved to: generated/ebooks/{slug}-{orderId}.pdf"]
        check_cache -- "Yes" --> serve_cached
        check_cache -- "No" --> do_watermark
    end

    runtime -.-> media_serve
    go_live -.-> pdf_watermark
```
