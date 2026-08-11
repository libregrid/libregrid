# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Report privately via [GitHub Security Advisories](https://github.com/libregrid/libregrid/security/advisories/new).

Please include: affected package and version, the `ag-grid-community` version in use, reproduction steps, and impact assessment.

**Response targets:** acknowledgement within 3 working days; initial assessment within 10; fix and coordinated disclosure timeline agreed with the reporter.

## Supported versions

Pre-`1.0.0`, only the latest published minor receives security fixes.

## Scope

**In scope:** XSS via cell renderers, editors or tool panels; prototype pollution in option/state parsing; malicious data causing code execution during Excel export, clipboard paste or filter-expression parsing; dependency vulnerabilities in `fflate` or `ag-charts-community`.

**Out of scope:** vulnerabilities in `ag-grid-community` itself — report those to [AG Grid](https://github.com/ag-grid/ag-grid/security); issues requiring an already-compromised host application.

## Supply chain

LibreGrid keeps its dependency surface deliberately small: **`fflate`** (Excel export) and **`ag-charts-community`** (charts) are the only permitted runtime dependencies outside `@libregrid/*`. Adding another requires explicit sign-off.

Packages are published with npm provenance.
