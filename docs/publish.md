# Publishing to LinkedIn

Publishing is **optional** and **manual**. The content agent never auto-posts.

## 1. Login

Get cookies from browser DevTools → Application → Cookies → `linkedin.com`:

- `li_at`
- `JSESSIONID`

> **Browser logout:** LinkedIn invalidates your browser session when cookies are used here. Use login **only** to publish. For drafting and voice, skip login entirely.

```bash
linkedin login   # no API call by default — use --verify only if needed
```

> Using cookies in the CLI may log you out of your browser. Copy fresh cookies when needed.

## 2. Post a draft

**Text + single image:**
```bash
linkedin posts create \
  --text "$(linkedin agent show <draft-id> --fields humanized_text)" \
  --image ~/.linkedin-cli/drafts/<draft-id>/images/your-photo.jpg
```

**Text only:**
```bash
linkedin posts create --text "Your post text"
```

**Carousel:** Combine `images/slide-*.png` into a PDF (Preview, Canva), upload as a LinkedIn document post.

## 3. Verify session

```bash
linkedin status --verify
```

If expired, run `linkedin login` again.
