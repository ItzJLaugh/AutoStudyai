# Navigation control audit

Scope: `03-navigation-cleanup.md`. This audit covers visible navigation and repeated actions only; it does not remove routes, data, or product capabilities.

| Control | Observed behavior | Decision | Affected routes |
| --- | --- | --- | --- |
| Workspace in the profile menu | Duplicated the persistent Dashboard navigation and only returned to `/dashboard`. | **Removed.** | Shared header on authenticated Classroom pages |
| Billing in the profile menu | Opens the subscription section through the existing `/billing` compatibility redirect to `/settings`. It remains the clearest direct route to subscription management. | Keep. | `/billing`, `/settings` |
| Appearance in the profile menu | Duplicates the Appearance section in Settings, but provides an immediate theme toggle without leaving the current task. | Keep. | Shared header, `/settings` |
| Chrome extension in the profile menu | Opens the dedicated install/help flow. Dashboard capture actions and empty states depend on that flow being discoverable. | Keep. | `/install-extension`, `/dashboard`, guide empty states |
| Feedback in the header and Settings | Both open the same feedback workflow. The header makes reporting a problem available at the point of failure; Settings provides an account-level fallback. | Keep for now; reconsider only after mobile discoverability is observed. | Shared header, `/settings` |
| New study guide and Create guide on Dashboard | Both reach `/create`, but one is the page-level primary action and the other belongs to the compact quick-action group. | Keep for now; assess with real student usage rather than removing by duplication alone. | `/dashboard`, `/create` |
| Extension onboarding component | No current route imports the older overlay component; the live product uses the dedicated install page. | Candidate for later code cleanup, not a visible control removal in this change. | Internal component only |

No additional product controls were removed. The remaining account menu retains profile, subscription, extension, feedback-review (for authorized reviewers), appearance, and sign-out access.
