# Dashboard design QA

## Source visual truth

- Current-dashboard problem capture: `C:\Users\jacks\AppData\Local\Temp\codex-clipboard-3ac6873a-6914-4e17-8a4e-4c274b055bdc.png`
- Source pixels: 3220 x 1782.
- The user's written correction is authoritative for the new information architecture: classes on the left, unclassified guides in the center below extension installation, and streak, focus, and AI chat bubbles on the right.

## Implementation evidence

- Default workspace: `docs/qa/dashboard-three-column-implementation-normalized.png`
- Default side-by-side comparison: `docs/qa/dashboard-three-column-implementation-comparison.png`
- Class flyout: `docs/qa/dashboard-class-flyout-implementation-normalized.png`
- Flyout side-by-side comparison: `docs/qa/dashboard-class-flyout-implementation-comparison.png`
- Browser CSS viewport: 1635 x 900 at device scale 1.
- Raw browser captures: 1620 x 980 and 1635 x 980. The desktop app host rendered page content at approximately 0.4 scale, so the visible 654 x 360 content region was normalized to 1635 x 900 before comparison.
- State: light theme, populated desktop dashboard; second capture has the first class flyout open through keyboard focus.

## Full-view comparison evidence

- The source's single long guide column and bottom study widgets are replaced by three stable desktop regions beneath the same top navigation.
- The center column retains the existing guide-row treatment but displays only guides not assigned to a class.
- The right rail keeps streak, focus, and AI chat controls visible without extending the central feed.

## Focused-region comparison evidence

- The class flyout comparison shows the raised pill-panel interaction, class title, guide count, individual guide actions, and open-class action at readable size.
- The navigation capture shows the supplied infinity-butterfly silhouette with the pixel cluster replaced by an open-book academic mark. The extracted project asset is `web/public/academic-butterfly-open-book.png`.

## Findings

- No actionable P0, P1, or P2 issues remain.
- Fonts and typography: Cordia's serif editorial headings and restrained sans-serif controls retain clear hierarchy and readable optical weight.
- Spacing and layout rhythm: desktop tracks resolve to 240 px / 558.8 px / 290 px at the QA viewport, with consistent 24 px gutters and sticky side rails. Cards no longer form one continuous mobile-like stack.
- Colors and visual tokens: the warm canvas, white surfaces, olive accents, thin lines, and restrained shadows match the established Cordia system.
- Image quality and asset fidelity: the butterfly-and-book mark is a transparent 512 px project asset derived from the supplied Cordia mark, with no placeholder or approximate inline icon.
- Copy and content: class, unclassified-guide, extension, streak, focus, and AI labels describe their actual behavior.
- Responsive state: at 900 x 900 the layout collapses to one column, the side rails become static, the study rail becomes two columns, and no horizontal overflow occurs.
- Accessibility and interaction: class flyouts work through hover and `:focus-within`; keyboard focus produced a visible flyout containing all three expected guide actions.
- Browser console: no application errors were present; only normal development and hot-reload messages appeared.

## Comparison history

- First comparison: no P0/P1/P2 differences were found after normalizing host display density. No post-capture visual correction loop was required.

## Follow-up polish

- P3: a future iteration could add a user-controlled collapsed state for either sidebar on smaller laptops, but it is not required for this desktop layout correction.

final result: passed
