# st-brendan

This repository contains an experimental digital edition created in the course of a seminar at the Institute of Germanic Languages and Literatures in autumn/winter 2024/25.

* main data file: [`st-brendan.xml`](st-brendan.xml)
  * (parts of) this may be prepared using `editioncrafter-cli`; take care not to overwrite a file with uncommitted changes in the process
* create assets for inclusion in the hugo page, and run hugo
  ```bash
  mkdir -p public/edition/st-brendan && editioncrafter process -i ./st-brendan.xml -o ./public/edition -u /st-brendan/edition && hugo --minify
  ```
  for local development (assuming a web server at port 8000):
  ```bash
  mkdir -p public/st-brendan/edition/st-brendan && editioncrafter process -i ./st-brendan.xml -o ./public/edition -u /st-brendan/edition && cp -r public/edition public/st-brendan/ && hugo --minify -b http://localhost:8000
  ```

## Github Pages deployment

* run the [build and deploy action](https://github.com/dsl-unibe-ch/st-brendan/actions/workflows/editioncrafter-hugo-deploy.yml)
