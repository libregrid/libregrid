# @libregrid/ai-toolkit

## Unreleased

- Breaking: make the package a pure `GridApi.getStructuredSchema()` module,
  remove experimental model/provider/action APIs, and cover all seven live
  GridState feature schemas. BYOM runtime support moves to the protocol,
  client, and gateway packages.
- Constrain sort type, date/date-time separators, set values, service gates,
  and custom filter options to the exact live AG Grid 36.1 contract; restore
  the root all-column definition and full/excluded/capability golden schemas.

## 1.2.3

Version synced with the lockstep release.
