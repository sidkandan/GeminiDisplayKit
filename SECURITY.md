# Security Policy

## Supported versions

This is a hackathon project, currently at `0.1.0`. While we aim to keep
this published code safe to run, **do not deploy this framework to
production environments holding real user data or API keys without your
own security review**.

| Version | Supported |
|---|---|
| 0.1.x | ✓ (best-effort) |

## Reporting a vulnerability

If you discover a security vulnerability, please **do not** open a public
GitHub issue. Instead:

1. Email **siddharth.kandan@gmail.com** with a description of the issue
2. Allow up to 7 days for an initial response
3. We will work with you on a fix and a coordinated disclosure timeline

## What counts as a vulnerability

- API key leakage paths (e.g., a code path that prints `GEMINI_API_KEY` to logs)
- SSRF / path-traversal in the bridge's static file serving
- Cross-site scripting in display HUDs (these load user-controlled Gemini output)
- Code execution in the agent-sandbox path that escapes Google's sandbox
- Anything that lets a remote caller dump server-side state

## What does NOT count

- "The Cloudflare quick-tunnel is public" — by design; that's the install path
- "You can POST any image to `/api/analyze-media`" — by design; demos require it
- "The bridge accepts unauthenticated requests" — by design for the demo model;
  document an auth pattern in your own deployment

## Acknowledgements

We'll credit reporters in `SECURITY-HALL-OF-FAME.md` (created when the first
report comes in) unless you prefer to remain anonymous.
