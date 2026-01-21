# Bemo Phase 3: Unified Screen Recording

## Overview

Transform Bemo into a full Loom replacement with one unified, beautiful recording experience.

**Key Changes:**
- Remove "quick mode" vs "studio mode" - single recording flow
- Add composited pipeline (background + styled frame + camera)
- Smart defaults, minimal configuration
- Beautiful output out of the box

## Progress Tracker

### Phase 3.1: Simplify CaptureMode ✅
- [x] Remove `.quickRecording` and `.studioRecording` from `CaptureMode`
- [x] Add unified `.recording` case
- [x] Update all references in codebase

### Phase 3.2: Build Models & BackgroundProvider ✅
- [x] Create `RecordingStyle.swift` model with BackgroundStyle, FrameStyle, CameraStyle
- [x] Create `BackgroundProvider.swift` service with wallpaper/blur/gradient support
- [x] Add `RecordingPreferences` for persisting user settings

### Phase 3.3: Build FrameRenderer ✅
- [x] Create `FrameRenderer.swift` with Core Image composition
- [x] Implement background compositing
- [x] Implement frame styling (scale, corners, shadow)
- [x] Implement camera bubble overlay with circular mask
- [x] Add pixel buffer pooling for performance

### Phase 3.4: Build CompositorService ✅
- [x] Create `CompositorService.swift` actor
- [x] Implement SCStream frame capture via SCStreamOutput delegate
- [x] Implement AVAssetWriter video/audio encoding
- [x] Integrate FrameRenderer for real-time composition
- [x] Add camera data capture via AVCaptureVideoDataOutput

### Phase 3.5: Update UI ✅
- [x] Update `RecordingControlsView` with style picker button
- [x] Create `StylePickerView` popover with background/frame/camera options
- [x] Update RecordingOptions to include RecordingStyle

### Phase 3.6: Camera Integration ✅
- [x] Camera frames captured via AVCaptureVideoDataOutput
- [x] Frames composited into video by FrameRenderer
- [x] Camera overlay hidden during recording (composited instead)

### Phase 3.7: AppDelegate Integration ✅
- [x] Wire up CompositorService in beginRecording()
- [x] Replace ScreenRecordingService usage with CompositorService
- [x] Add RecordingPreferences loading

### Phase 3.8: Post-Recording & Preferences ✅
- [x] Create `RecordingCompleteView` with copy/reveal/preview actions
- [x] Create `RecordingCompleteController` with auto-dismiss
- [x] Integrate into AppDelegate stopRecording flow
- [x] Preferences control whether to show post-recording panel

### Phase 3.9: Polish ✅
- [x] ESC key stops recording (via RecordingIndicatorController key monitor)
- [x] Mic toggle uses CompositorService
- [x] No linter errors
- [x] Build passes (with minor Swift 6 Sendable warnings - safe to ignore)

---

## Technical Notes

### Composition Pipeline
```
SCStream → CVPixelBuffer → FrameRenderer → AVAssetWriter
                              ↑
Camera → CVPixelBuffer ───────┘
                              ↑
BackgroundProvider ───────────┘
```

### Key APIs
- `SCStream` with `SCStreamOutput` delegate for raw frames
- `CIContext` with Metal for GPU-accelerated composition
- `AVAssetWriter` for encoding to MP4
- `AVCaptureVideoDataOutput` for camera frames

---

## New Files Created

| File | Purpose |
|------|---------|
| `Models/RecordingStyle.swift` | Style configuration (background, frame, camera) |
| `Services/BackgroundProvider.swift` | Wallpaper/blur/gradient loading |
| `Services/FrameRenderer.swift` | Core Image composition |
| `Services/CompositorService.swift` | Main recording orchestrator |
| `Views/StylePickerView.swift` | Style options popover |
| `Views/RecordingCompleteView.swift` | Post-recording panel |

## Modified Files

| File | Change |
|------|--------|
| `CaptureMode.swift` | Unified to single `.recording` case |
| `RecordingControlsView.swift` | Added style picker, RecordingStyle support |
| `RecordingIndicatorController.swift` | ESC key support, CompositorService |
| `AppDelegate.swift` | CompositorService integration, post-recording panel |
| `SelectionOverlayController.swift` | Updated for `.recording` mode |

---

## Status: ✅ COMPLETE
