# st-brendan

This repository contains an experimental digital edition created in the course of a seminar at the Institute of Germanic Languages and Literatures in autumn/winter 2024/25.

* main data file: [`st-brendan.xml`](st-brendan.xml)
  * (parts of) this may be prepared using `editioncrafter-cli`; take care not to overwrite a file with uncommitted changes in the process
* create assets for inclusion in the hugo page
  ```bash
  editioncrafter process -i st-brendan.xml -o content/edition -u /edition
  ```
* copy assets to content directory
  ```bash
  cp -r content/edition/st-brendan public/edition/
  ```
  (We should investigabe why the files are not being picked up by hugo and perhaps take a shortcut: 
  `mkdir -p public/edition && editioncrafter process -i st-brendan.xml -o public/edition -u /edition && hugo`).
* run `hugo` (or `hugo -b http://localhost:8000` for local development)

## Github Pages deployment

* run the [build and deploy action](https://github.com/dsl-unibe-ch/st-brendan/actions/workflows/editioncrafter-hugo-deploy.yml)
