# File Upload Support (UPLOADS)

## Goal
Enable multipart GraphQL uploads (per GraphQL multipart request spec) so users can pass `--file` flags mapped to `$variables` and send files (images, CSVs) along with operations.

## User stories
- As a user, I can run `gql api uploadAvatar --file avatar=@~/Pictures/me.png --input.id 123` and the CLI handles multipart encoding.
- As an integration tester, I can upload multiple files in one request by specifying repeated `--file varName=@path` flags.

## Assumptions
- Target servers implement multipart request spec.
- CLI uses Node streams or form-data builder to send files; respects headers/timeouts from HDRMGMT/TIMEOUT.
- VARMAPR handles non-file variables; UPLOADS wires files into `variables` map + `map` object per spec.

## Open issues & risks
- Large files require streaming; ensure we don't buffer entire file into memory.
- Need cross-platform path handling + `@-` to read from STDIN.
- Interaction with pagination/streaming not relevant; uploads typically single request.

## Clarifying questions
- Should we support `--file varName=/dev/stdin` shorthand? likely yes.
- Do we limit total file size or rely on OS/network settings?
- How do we surface progress for big uploads (progress bar)? optional later.

## Scope
**Include**
- Flag parsing for `--file <var>=@path` and JSON override for multiple parts.
- Multipart encoder abiding by GraphQL upload spec (operations, map, file streams).
- Validation ensuring variable type is `Upload` or list of Uploads.
- Tests with mock server verifying payload structure.
**Exclude**
- Chunked/resumable uploads.
- Storage service integrations (S3 pre-signed) beyond GraphQL server.
- Encryption/compression of files.

## Design notes
- Reuse libs like `form-data`/`undici` for multipart; ensure Node version supports Blob streams.
- Provide helpful errors when file path missing, unreadable, or incompatible with variable type.
- Document interplay with Windows paths and quoting.

## Tasks
- [ ] Implementation
- [ ] Docs/Help updates
- [ ] Tests:
  - [ ] Unit
  - [ ] Integration
  - [ ] Golden fixtures (if applicable)
- [ ] Telemetry (if enabled)
- [ ] Feature flag (if applicable)

## Acceptance criteria
- [ ] CLI correctly constructs multipart requests per spec and servers receive expected payload.
- [ ] Multiple file variables supported, including lists.
- [ ] Errors when file missing/inaccessible or variable type mismatch.
- [ ] Works with both ad-hoc and endpoint modes.

## Dependencies
- Blocks: advanced workflows requiring uploads.
- Blocked by: VARMAPR (variable metadata), CORECLI (flag parsing), HDRMGMT (headers), TESTFIX (fixtures/mocks).

## Rollout
- [ ] Behind flag? n
- [ ] Docs updated
- [ ] Changelog entry
