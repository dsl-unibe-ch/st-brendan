# *Brandans Meerfahrt* - Digital Edition of the *Reisefassung M*

Digital edition of the Middle High German travel account of Brandans Meerfahrt (The Voyage of Saint Brendan).

Collaborative edition project resulting from the course "Der Heilige Brendan auf Reisen" (Fall Semester 2024, University of Bern).  
Led by: Dr. M. Strieder | Team: E. Beuggert, N. Bruhin, E. Forster, M. Frey, S Gasser, E. Konjuhaj, M. Nazifi, J. Roggen, J. Rubin, A. Schmoldt, A. Schubarth | Technical support: P. Dängeli (Data Science Lab) 

Funded by the Collegium Decanale of the University of Bern, funding line [Inspirierte Lehre](https://www.philhist.unibe.ch/ueber_uns/finanzielle_unterstuetzung/inspirierte_lehre/index_ger.html).

## Digital edition

**https://dsl-unibe-ch.github.io/st-brendan/**

---

## Setup

- **[EditionCrafter](https://github.com/cu-mkp/editioncrafter)** – TEI-XML processing and rendering
- **[Hugo](https://gohugo.io/)** – Static site generation
- **Custom JavaScript** – Interactive notes drawer with context-aware matching
- **GitHub Pages** – Automated deployment via Actions


## Custom annotation rendering

This edition uses a custom-built interactive notes drawer that enhances EditionCrafter's default annotation system. The build-in mechanism of the EditionCrafter viewer that renders TEI `<note>` elements as simple tooltips (red asterisks `*` that show text on hover) proved insufficient for scholarly annotations requiring structured content, references, and comfortable reading.

Instead, annotations are presented in a sidebar/drawer that is populated by intercepting EditionCrafter's note markers. Since the EC viewers processed HTML is not a good base for content retrieval and processing, the custom JavaScript (`notes-drawer.js`) fetches the full HTML output from EditionCrafter, extracts all `<tei-note>` elements with their content, and matches them to the visible markers in the text using a context-aware algorithm. This algorithm compares the text preceding each note marker with the text preceding each note in the source, ensuring accurate pairing even when multiple notes share the same ID. Users can click discrete middot markers (·) in the text to open the corresponding annotation in a collapsible drawer, or click entries in the drawer to jump to their location in the text. The system supports deep linking via URL parameters (`?note=X`), preserves EditionCrafter's page navigation, and automatically adapts to different deployment environments (local vs. GitHub Pages with base path; with the deployment at brandans-meerfahrt.digitaleditions.ch this is no longer needed).


---

## Local development

<details>
<summary><strong>Basics</strong></summary>

### Prerequisites
- Hugo Extended (latest)
- Node.js 20+
- EditionCrafter CLI: `npm install -g @cu-mkp/editioncrafter-cli`

### Build & serve
```bash
./build.sh
hugo server -D --environment development -p 8000
# Open: http://localhost:8000/
```
</details>

<details>
<summary><strong>Configuration</strong></summary>

- Environment-specific Hugo configs (`config/development/` vs `config/production/`)
- Automatic base path detection for GitHub Pages deployment (`/st-brendan/` prefix) [deactivated after configuring brandans-meerfahrt.digitaleditions.ch]
</details>

---

## Features

- **Interactive notes drawer** 
  - Click `·` markers to open annotations in sidebar
  - Click notes to jump to text
- **Deep Linking** 
  - Share specific notes with `?note=X` URL parameters
- **Context-Aware Matching** 
  - Algorithm reliably pairs note markers with content
- **TEI Rendering** 
  - Custom styling for emphasis, page breaks, line numbers, editorial annotations
- **Responsive Design** 
  - Optimized for desktop, tablet, and mobile devices

---

## Deployment

Push to `main` → GitHub Actions builds and deploys automatically.

<details>
<summary><strong>Workflow details</strong></summary>

1. Installs Hugo Extended and EditionCrafter CLI
2. Runs `./build.sh production` (processes TEI + builds Hugo site)
3. Creates `.nojekyll` file (disables Jekyll processing on GitHub Pages)
4. Uploads and deploys to GitHub Pages

**Important:** Without the `.nojekyll` file GitHub Pages' default Jekyll processing risks to block JavaScript files and to break the notes system.
</details>

---

## Content curation and customisation of presentation

<details>
<summary><strong>Key files to edit</strong></summary>

- **TEI source**: `st-brendan.xml` – Main edition content and annotations
- **Hugo content**: `content/*.md` – Homepage, introduction, supplementary pages
- **TEI styling**: `themes/rtc/assets/scss/st-brendan.scss` defines the rendering of TEI elements
- **Notes drawer**: `themes/rtc/assets/js/notes-drawer.js` – note retrieval, matching and presentation
- **Templates**: `themes/rtc/layouts/` – HTML structure and includes

</details>

<details>
<summary><strong>Base Path Configuration</strong></summary>

Changing the repository name or deployment location requires updating:
- `config/production/config.toml` – `baseURL` pointing to GitHub Pages URL
- `notes-drawer.js` `getBasePath()` method – Update path detection logic
</details>

---

## License

Content: **CC BY-NC-SA 4.0** | Code: **MIT License**

## Contact

@pdaengeli, Data Science Lab, University of Bern

---

*Built with [EditionCrafter](https://github.com/cu-mkp/editioncrafter) and [Hugo](https://gohugo.io/)*.
