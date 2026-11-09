# Vendored SheetJS CE

`xlsx-0.20.3.tgz` is the unmodified SheetJS CE 0.20.3 release, Apache-2.0.
Source: https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
SHA-256: `8dc73fc3b00203e72d176e85b50938627c7b086e607c682e8d3c22c02bb99fe8`

It replaces the vulnerable npm xlsx 0.18.5 release. The pnpm lockfile records
integrity. Vendoring avoids build failures when the upstream CDN is unavailable.
The application uses the writer for administrator usage exports. The upstream
license is reproduced in `SheetJS-LICENSE.txt` and inside the archive.
