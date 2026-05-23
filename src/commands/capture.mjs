/**
 * `gfmd capture --source dat|pixel` —
 *
 * Operator-gated frame capture for testing your bridge. NOT for unattended
 * use. Honors OPERATOR_PRESENT=1 and SID_GO_TOKEN=GO env conventions.
 *
 * Phase-1 stub: prints how to wire each capture lane. The actual capture
 * scripts (DAT CameraAccess REPL wrapper, Termux frame helper) live in the
 * GoogleIO/scripts/ tree on the Mac mini and require Sid's prior glasses
 * research corpus. Phase-2 work: vendor minimal wrappers under
 * <framework>/scripts/capture/ and shell out from here.
 */
export async function run({ flags }) {
  const source = flags.source || "demo";

  if (source === "demo") {
    console.log(
      "gfmd capture — Phase 1 stub.\n\n" +
      "Available sources (planned):\n" +
      "  --source dat     DAT CameraAccess REPL — glasses POV, operator-gated, LED-visible\n" +
      "  --source pixel   Termux:API still-frame from the paired Pixel\n" +
      "  --source file --path img.jpg   POST a local file to your bridge's /api/analyze-media\n"
    );
    return;
  }

  if (!process.env.OPERATOR_PRESENT || !process.env.SID_GO_TOKEN) {
    throw new Error(
      "live capture requires OPERATOR_PRESENT=1 SID_GO_TOKEN=GO in env. " +
      "Do not run this unattended. See docs/deploying.md."
    );
  }

  // Phase-2: vendor the wrappers and dispatch by source.
  console.log(`gfmd capture --source ${source}: implementation deferred to Phase 2.`);
  console.log(`Use the scripts at scripts/capture-${source}.sh for now (will be wrapped soon).`);
}
