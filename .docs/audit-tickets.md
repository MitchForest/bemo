# Audit Tickets

Goal: simplify the codebase, keep APIs minimal and explicit, ensure consistent behavior, and provide clear visual feedback on success or error.

## AT-01 Fix unsafe sample buffer lifetimes in the recording pipeline
Problem:
- CMSampleBuffer and CVPixelBuffer are passed across async Tasks without a guaranteed lifetime, risking crashes and corrupted frames.

Scope:
- Retain or copy sample buffers before crossing actor boundaries.
- Remove reliance on @unchecked Sendable wrappers for lifetime safety.
- Ensure buffers are released when processing is complete.

Acceptance criteria:
- No non-Sendable buffer is passed across Tasks without an explicit retain/copy.
- Stream output processing is safe under load (no crashes or corrupted frames).
- Concurrency warnings related to sample buffers are resolved.

Files/areas:
- Bemo/Services/CompositorService.swift
- Bemo/Services/CameraService.swift

## AT-02 Normalize screen recording permission errors
Problem:
- Permission denial is not consistently surfaced; SelectionOverlayController expects permissionDenied but ScreenCaptureService never maps to it.

Scope:
- Map SCShareableContent/SCScreenshotManager errors to ScreenCaptureError.permissionDenied.
- Ensure SelectionOverlayController shows a permission prompt on denial and does not surface generic errors for this case.

Acceptance criteria:
- Denied screen recording permission triggers a clear, user-facing alert every time.
- SelectionOverlayController only shows a generic error for non-permission failures.

Files/areas:
- Bemo/Services/ScreenCaptureService.swift
- Bemo/Views/SelectionOverlayController.swift
- Bemo/Services/PermissionService.swift

## AT-03 Centralize user feedback for success and error
Problem:
- Feedback behavior is inconsistent and settings (showToast) are not honored.
- The app should always provide visual confirmation for capture success, capture error, and copy success.

Scope:
- Define a single feedback entry point (keep it simple; a tiny FeedbackService wrapper around ToastController is enough).
- Remove the unused showToast setting or wire it consistently (prefer removal for simplicity since feedback is required).
- Ensure all user-triggered actions route through the same feedback mechanism.

Acceptance criteria:
- Capture success, capture error, and copy success always show a toast.
- No user-triggered action fails silently.
- Settings UI does not expose unused toggles.

Files/areas:
- Bemo/Views/ToastController.swift
- Bemo/Views/SettingsView.swift
- Bemo/App/AppDelegate.swift
- Bemo/Views/ClipboardDockPanel.swift
- Bemo/Views/FilePreviewWindow.swift

## AT-04 Align hotkeys, labels, and documentation with a single source of truth
Problem:
- Hotkeys are inconsistent across AppDelegate, Settings, Menubar UI, and README.
- A "Copy File" hotkey is advertised but not implemented.

Scope:
- Create a single hotkey definition source (enum or struct) used for registration and UI labels.
- Update UI labels and README to match actual hotkeys.
- Remove or implement the "Copy File" shortcut; keep only what exists.

Acceptance criteria:
- All displayed shortcuts match registered hotkeys.
- README and Settings reflect the same hotkey set.
- No UI mentions non-existent actions.

Files/areas:
- Bemo/App/AppDelegate.swift
- Bemo/Views/MenubarView.swift
- Bemo/Views/SettingsView.swift
- README.md

## AT-05 Complete or remove the file drag-and-drop flow
Problem:
- The status item registers for file drag, but there is no drag handler or entry point to FilePreviewWindow.

Scope:
- Either implement drag-and-drop handling on the status item and show FilePreviewWindow, or remove drag registration and unused preview code.
- Keep the flow simple and explicit.

Acceptance criteria:
- Dragging a file onto the menubar icon yields a visible, working result (preview + copy actions) OR the feature is removed completely.
- No dead code remains for the chosen path.

Files/areas:
- Bemo/App/AppDelegate.swift
- Bemo/Views/FilePreviewWindow.swift
- Bemo/Services/ClipboardService.swift

## AT-06 Fix multi-display selection and scaling correctness
Problem:
- Selection overlays map panels to screens by index, which can drift when a display capture fails.
- Scaling assumes 2x or main-screen backing scale, which breaks on mixed DPI setups.

Scope:
- Map each panel to its exact screen/display ID rather than relying on array indices.
- Use the correct backing scale factor per display for capture and cropping.
- Ensure source rect calculations use the correct screen metrics for that display.

Acceptance criteria:
- Selection, OCR, screenshot, and recording regions are correct on all displays (including mixed DPI).
- No off-by-one or wrong-display captures when a display capture fails.

Files/areas:
- Bemo/Views/SelectionOverlayController.swift
- Bemo/Services/ScreenCaptureService.swift
- Bemo/Services/CompositorService.swift
- Bemo/Shared/ImageCropper.swift

## AT-07 Simplify recording pipeline surface area
Problem:
- ScreenRecordingService exists but is unused; RecordingState is shared with CompositorService, which expands API surface and creates confusion.

Scope:
- Choose one recording pipeline (likely CompositorService) and remove the other path and its configuration types.
- Keep RecordingState and configuration types in the active pipeline only.

Acceptance criteria:
- Only one recording service remains.
- No unused recording types or duplicate state enums are left in the codebase.

Files/areas:
- Bemo/Services/ScreenRecordingService.swift
- Bemo/Services/CompositorService.swift

## AT-08 Make recording preferences explicit and consistent
Problem:
- RecordingPreferences is loaded but not used to initialize UI defaults or save user choices.

Scope:
- Either wire RecordingPreferences into RecordingControlsView (defaults and persistence) or remove preferences entirely.
- Keep the behavior explicit and minimal.

Acceptance criteria:
- Recording defaults are consistent across sessions OR preferences are removed.
- No unused preference fields remain.

Files/areas:
- Bemo/Models/RecordingStyle.swift
- Bemo/Views/RecordingControlsView.swift
- Bemo/App/AppDelegate.swift

## AT-09 Update README to match the actual product
Problem:
- README architecture and requirements are out of date (e.g., non-existent BemoPackage, macOS version mismatch, hotkey mismatches).

Scope:
- Update README architecture, requirements, and hotkeys to match the current codebase.
- Keep the README minimal and accurate.

Acceptance criteria:
- README matches actual folder layout, macOS target, and hotkeys.
- No references to non-existent modules or features.

Files/areas:
- README.md
- Config/Shared.xcconfig

## AT-10 Run swiftlint and fix all issues
Scope:
- Run swiftlint.
- Fix all warnings and errors until the report is clean.

Acceptance criteria:
- swiftlint completes with zero warnings/errors.

## AT-11 Run priphery and remove all unused code
Scope:
- Run priphery.
- Remove or fix all unused code and warnings; iterate until clean.

Acceptance criteria:
- priphery completes with zero warnings/errors.
