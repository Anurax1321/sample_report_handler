# PDF Flow

How PDFs move through the system, from Report Handling to Sample Entry.

## Overview

There are two storage systems for files:

| System | DB Table | Purpose |
|--------|----------|---------|
| **Report Files** | `report_files` | Raw NBS report files (AA, AC, AC_EXT) uploaded through Report Handling |
| **Sample PDFs** | `sample_pdfs` | Individual patient PDFs that can be linked to samples |

## Flow

```
Report Handling                        Sample Entry Form
─────────────────                      ──────────────────
1. Upload AA, AC, AC_EXT files
        │
2. Files saved to report_files table
   (uploads/{report_id}/raw/)
        │
3. Processing extracts patient data
        │
4. Review & edit in AG-Grid
        │
5. "Approve & Generate PDF"
        │
   ┌────┴────┐
   │ For each patient, a PDF is      ──►  6. "Browse existing PDFs" section
   │ generated and a SamplePdf            shows unlinked PDFs (sample_id=NULL)
   │ record is auto-created               with patient name matching
   │ (sample_id=NULL)
   └─────────┘                            7. User selects PDFs to link
                                              │
                                          8. On "Create Sample", selected PDFs
                                             are linked (sample_id is set)
                                              │
                                          9. PDFs appear in patient card modal
                                             under "Uploaded PDFs"
```

## Key Details

### Auto-creation of SamplePdf records

When Report Handling generates PDFs (`POST /reports/{id}/approve`), each generated patient PDF is automatically inserted into the `sample_pdfs` table with `sample_id=NULL`. This makes them available for linking in the Sample Entry Form.

**Backend:** `routes_reports.py` → `approve_report()` endpoint

### Deduplication

If the same report is re-processed (generating PDFs with the same filenames), the `GET /samples/pdfs/unlinked` endpoint returns only the most recent record per filename. Older duplicates are hidden.

**Backend:** `routes_samples.py` → `list_unlinked_pdfs()` uses `GROUP BY filename` + `MAX(id)`

### Patient name matching

Both the Sample Entry Form and the patient card modal sort unlinked PDFs so that files whose filename contains the patient name appear at the top, with a "Name match" badge.

### Linking PDFs to Samples

PDFs can be linked to samples in two places:

1. **Sample Entry Form** — "Browse existing PDFs" section, select during sample creation
2. **Patient Card Modal** — "Link PDF" button in footer, select and link to existing sample

**API:** `POST /samples/{sample_id}/link-pdf/{pdf_id}`

When linked, the PDF's `sample_id` is updated and the file is moved from `uploads/sample_pdfs/unlinked/` to `uploads/sample_pdfs/{sample_id}/`.

## Database Tables

### `sample_pdfs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int | Primary key |
| `sample_id` | int (nullable) | FK to `samples.id`. NULL = unlinked |
| `filename` | string | Original filename |
| `file_path` | string | Path on disk |
| `file_size` | int | Size in bytes |
| `uploaded_at` | datetime | Upload timestamp |

### `report_files`

| Column | Type | Description |
|--------|------|-------------|
| `id` | int | Primary key |
| `report_id` | int | FK to `reports.id` |
| `filename` | string | Original filename |
| `file_type` | string | AA, AC, or AC_EXT |
| `file_path` | string | Path on disk |
| `file_size` | int | Size in bytes |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/samples/upload-pdf` | POST | Upload a PDF (creates unlinked SamplePdf) |
| `/samples/pdfs/unlinked` | GET | List unlinked PDFs (deduplicated by filename) |
| `/samples/{id}/pdfs` | GET | List PDFs linked to a sample |
| `/samples/{id}/link-pdf/{pdf_id}` | POST | Link an unlinked PDF to a sample |
| `/samples/pdfs/{id}/download` | GET | Download a PDF |
| `/samples/pdfs/{id}` | DELETE | Delete a PDF |
| `/reports/{id}/approve` | POST | Approve report, generate PDFs, auto-create SamplePdf records |
