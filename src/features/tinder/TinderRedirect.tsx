// TinderRedirect — every /tinder/* route now redirects to the Flask scraper's
// /floorplans page. The /tinder pages (review, shortlist, comps, pipeline,
// agents) are deprecated — Hugo runs the BRRRR workflow from the scraper UI
// now, and the "Potential" button there auto-pushes leads into the BRRRR
// pipeline at /crm/pipelines + the dialer at /crm/dialer-pro via the
// brrrr-promote-to-pipeline edge function.
//
// Top-level navigation from HTTPS to HTTP is allowed by browsers (mixed-
// content rules only apply to fetched resources). The address bar will show
// a "not secure" warning on the scraper page, which is expected.

import { useEffect } from "react";

const TARGET = "http://187.124.117.193:5001/floorplans";

export default function TinderRedirect(): null {
  useEffect(() => {
    window.location.replace(TARGET);
  }, []);
  return null;
}
