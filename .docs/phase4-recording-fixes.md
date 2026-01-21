# Phase 4: Recording Dock Polish & Critical Fixes

## Overview

This phase addresses critical bugs in audio/video synchronization, improves the recording dock UI/UX with proper button sizing and symmetry, and implements a redesigned audio level indicator that fills the microphone SF Symbol interior.

---

## Problem Summary

| ID | Issue | Type | Priority |
|----|-------|------|----------|
| P4-01 | Audio not present in recorded videos | **Critical Bug** | P0 |
| P4-02 | Video timestamps incorrect / `startSession` called twice | **Bug** | P0 |
| P4-03 | Camera preview disappears during recording | Design Issue | P1 |
| P4-04 | Audio indicator should fill mic SF Symbol interior | UI/UX | P1 |
| P4-05 | Button sizing and symmetry inconsistent in docks | UI/UX | P2 |
| P4-06 | No video trimming functionality | Missing Feature | P2 |

---

## Progress Tracker

| Ticket | Title | Status | Commit |
|--------|-------|--------|--------|
| P4-01 | Fix Audio Sample Buffer Timing | ✅ Complete | `fix(compositor): retime audio samples` |
| P4-02 | Fix Double startSession Call | ✅ Complete | `fix(compositor): remove duplicate startSession` |
| P4-03 | Remove Async Task Dispatch in Stream Delegate | ✅ Complete | `fix(compositor): synchronous sample processing` |
| P4-04 | Maintain Camera Preview During Recording | ✅ Complete | `feat(camera): share camera session` |
| P4-05 | Create MicLevelIcon Component | ✅ Complete | `feat(ui): add MicLevelIcon component` |
| P4-06 | Integrate MicLevelIcon in Pre-Recording Dock | ✅ Complete | `refactor(ui): use MicLevelIcon in dock` |
| P4-07 | Integrate MicLevelIcon in Recording Indicator | ✅ Complete | `refactor(ui): use MicLevelIcon in indicator` |
| P4-08 | Standardize Button Sizes in Pre-Recording Dock | ✅ Complete | `refactor(ui): standardize button sizes` |
| P4-09 | Redesign Recording Indicator Layout | ✅ Complete | `refactor(ui): redesign indicator layout` |
| P4-10 | Polish Dock Visual Consistency | ✅ Complete | `style(ui): polish dock consistency` |
| P4-11 | Add Video Trim UI to RecordingCompleteView | ⬜ Not Started | |
| P4-12 | Implement Video Trim Export | ⬜ Not Started | |

**Legend**: ⬜ Not Started | 🔄 In Progress | ✅ Complete | ⏸️ Blocked

---

## Part 1: Critical Audio/Video Fixes (P0)

### P4-01: Fix Audio Sample Buffer Timing

**Status**: ⬜ Not Started

**Priority**: P0 - Critical

**Description**: Audio samples are appended with their original presentation timestamps instead of adjusted relative timestamps. This causes audio to be missing or out of sync in the final video.

**Root Cause Analysis**:
```swift
// Current buggy code in CompositorService.swift:
fileprivate func processAudioSample(_ sampleBuffer: CMSampleBuffer) {
    // ...
    let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    let relativeTime = CMTimeSubtract(presentationTime, startTime)
    
    // BUG: append() uses the ORIGINAL sample buffer's timing, not relativeTime!
    audioInput.append(sampleBuffer)
}
```

**File**: `Bemo/Services/CompositorService.swift`

**Tasks**:
- [ ] Create helper function to retime CMSampleBuffer
- [ ] Adjust audio sample buffer timing before appending
- [ ] Add validation that audio timestamps are within valid range
- [ ] Add logging for audio sync debugging
- [ ] Test with both system audio and microphone enabled

**Code**:
```swift
// MARK: - Audio Timing Helpers

/// Create a new sample buffer with adjusted timing
private func retimeSampleBuffer(
    _ sampleBuffer: CMSampleBuffer,
    to newTime: CMTime
) -> CMSampleBuffer? {
    var timingInfo = CMSampleTimingInfo(
        duration: CMSampleBufferGetDuration(sampleBuffer),
        presentationTimeStamp: newTime,
        decodeTimeStamp: .invalid
    )
    
    var newSampleBuffer: CMSampleBuffer?
    
    let status = CMSampleBufferCreateCopyWithNewTiming(
        allocator: kCFAllocatorDefault,
        sampleBuffer: sampleBuffer,
        sampleTimingEntryCount: 1,
        sampleTimingArray: &timingInfo,
        sampleBufferOut: &newSampleBuffer
    )
    
    guard status == noErr else {
        print("[Compositor] Failed to retime audio sample: \(status)")
        return nil
    }
    
    return newSampleBuffer
}

/// Fixed audio processing with proper timing
fileprivate func processAudioSample(_ sampleBuffer: CMSampleBuffer) {
    guard state == .recording,
          let audioInput = audioInput,
          audioInput.isReadyForMoreMediaData else {
        return
    }
    
    // Get start time - if not set yet, skip this sample
    guard let startTime = recordingStartTime else {
        print("[Compositor] Skipping audio sample - no start time yet")
        return
    }
    
    let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    let relativeTime = CMTimeSubtract(presentationTime, startTime)
    
    // Skip if negative time (audio arrived before video started)
    if CMTimeCompare(relativeTime, .zero) < 0 {
        print("[Compositor] Skipping audio sample with negative time: \(relativeTime.seconds)s")
        return
    }
    
    // Retime the sample buffer to relative time
    guard let retimedBuffer = retimeSampleBuffer(sampleBuffer, to: relativeTime) else {
        print("[Compositor] Failed to retime audio buffer")
        return
    }
    
    // Append the retimed buffer
    if !audioInput.append(retimedBuffer) {
        print("[Compositor] Failed to append audio sample at \(relativeTime.seconds)s")
    }
}
```

**Verification**:
1. Record a 10-second video with microphone enabled
2. Play back and verify audio is present
3. Verify audio syncs with video (clap test)
4. Check file in QuickTime - audio track should be present

**Commit**: `fix(compositor): retime audio samples to relative timestamps`

---

### P4-02: Fix Double startSession Call

**Status**: ⬜ Not Started

**Priority**: P0 - Critical

**Description**: `assetWriter?.startSession(atSourceTime: .zero)` is called twice - once in `startRecording()` and again in `processScreenFrame()`. This can cause timing inconsistencies and potential encoder errors.

**Root Cause**:
```swift
// In startRecording() at line 175:
assetWriter?.startSession(atSourceTime: .zero)

// In processScreenFrame() at line 280:
if recordingStartTime == nil {
    recordingStartTime = presentationTime
    assetWriter?.startSession(atSourceTime: .zero)  // DUPLICATE!
}
```

**File**: `Bemo/Services/CompositorService.swift`

**Tasks**:
- [ ] Remove `startSession` call from `startRecording()`
- [ ] Keep only the call in `processScreenFrame()` on first frame
- [ ] Add `sessionStarted` flag to prevent duplicate calls
- [ ] Log when session actually starts

**Code**:
```swift
// Add property to track session state
private var sessionStarted: Bool = false

// In startRecording() - REMOVE this line:
// assetWriter?.startSession(atSourceTime: .zero)  // DELETE

// Guard against double-start in processScreenFrame():
fileprivate func processScreenFrame(_ sampleBuffer: CMSampleBuffer) {
    guard state == .recording,
          let videoInput = videoInput,
          videoInput.isReadyForMoreMediaData,
          let frameRenderer = frameRenderer else {
        return
    }
    
    guard let screenBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
        return
    }
    
    let presentationTime = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    
    // Start session on first frame only
    if !sessionStarted {
        recordingStartTime = presentationTime
        assetWriter?.startSession(atSourceTime: .zero)
        sessionStarted = true
        print("[Compositor] Session started at \(presentationTime.seconds)s")
    }
    
    // ... rest of frame processing
}

// In cleanup():
private func cleanup() async {
    // ... existing cleanup
    sessionStarted = false
}
```

**Commit**: `fix(compositor): remove duplicate startSession call`

---

### P4-03: Remove Async Task Dispatch in Stream Delegate

**Status**: ⬜ Not Started

**Priority**: P0 - Critical

**Description**: The stream delegate wraps sample processing in async Tasks, which can cause samples to be processed out of order and sample buffers to be released before processing completes.

**Root Cause**:
```swift
// Current problematic code:
MainActor.assumeIsolated {
    let buffer = sampleBuffer
    switch type {
    case .screen:
        Task { @MainActor in
            await compositor.processScreenFrame(buffer)  // Async = out of order!
        }
    case .audio, .microphone:
        Task { @MainActor in
            await compositor.processAudioSample(buffer)  // Sample may be released!
        }
    }
}
```

**File**: `Bemo/Services/CompositorService.swift`

**Tasks**:
- [ ] Make frame processing synchronous
- [ ] Use dedicated serial queues for video and audio processing
- [ ] Retain sample buffers properly before processing
- [ ] Remove async Task wrappers

**Code**:
```swift
// MARK: - Stream Output Delegate

private final class StreamOutputDelegate: NSObject, SCStreamOutput, @unchecked Sendable {
    private weak var compositor: CompositorService?
    private let processingQueue = DispatchQueue(label: "bemo.compositor.processing", qos: .userInteractive)
    
    init(compositor: CompositorService) {
        self.compositor = compositor
        super.init()
    }
    
    nonisolated func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of type: SCStreamOutputType
    ) {
        // Retain the sample buffer for the duration of processing
        CFRetain(sampleBuffer)
        
        processingQueue.async { [weak self] in
            defer { CFRelease(sampleBuffer) }
            
            guard let compositor = self?.compositor else { return }
            
            // Process synchronously on the processing queue
            switch type {
            case .screen:
                // Use unstructured task but wait for completion
                let semaphore = DispatchSemaphore(value: 0)
                Task { @MainActor in
                    await compositor.processScreenFrame(sampleBuffer)
                    semaphore.signal()
                }
                semaphore.wait()
                
            case .audio, .microphone:
                let semaphore = DispatchSemaphore(value: 0)
                Task { @MainActor in
                    await compositor.processAudioSample(sampleBuffer)
                    semaphore.signal()
                }
                semaphore.wait()
                
            @unknown default:
                break
            }
        }
    }
}
```

**Alternative Approach** (simpler, if actor isolation allows):
```swift
// If we can make the processing functions nonisolated:
nonisolated func stream(
    _ stream: SCStream,
    didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
    of type: SCStreamOutputType
) {
    guard let compositor = compositor else { return }
    
    switch type {
    case .screen:
        Task {
            await compositor.processScreenFrame(sampleBuffer)
        }
    case .audio, .microphone:
        Task {
            await compositor.processAudioSample(sampleBuffer)
        }
    @unknown default:
        break
    }
}

// Move the heavy processing off the actor
actor CompositorService {
    // Make these process synchronously within the actor
    // The actor serializes access automatically
}
```

**Commit**: `fix(compositor): synchronous sample buffer processing`

---

## Part 2: Camera Preview During Recording (P1)

### P4-04: Maintain Camera Preview During Recording

**Status**: ⬜ Not Started

**Priority**: P1

**Description**: The camera preview disappears when recording starts because the `CameraOverlayController` is explicitly hidden. Users want to see themselves during recording as a visual reference, even though the camera is being composited into the video.

**Current Behavior**:
```swift
// In AppDelegate.swift beginRecording():
cameraOverlayController?.hide()
cameraOverlayController = nil
```

**Solution**: Keep the camera preview visible during recording. Since `CompositorService` creates its own camera session, we have two options:

**Option A: Share Camera Session** (Recommended)
- Use a single `AVCaptureSession` for both preview and compositing
- More efficient, no resource conflicts

**Option B: Dual Camera Sessions**
- Keep both sessions running
- Simple to implement but uses more resources

**File**: `Bemo/App/AppDelegate.swift`, `Bemo/Services/CompositorService.swift`, `Bemo/Services/CameraService.swift`

**Tasks**:
- [ ] Option A: Modify `CompositorService` to use `CameraService.shared`
- [ ] Remove camera session creation in `CompositorService.setupCamera()`
- [ ] Add method to get frames from `CameraService` for compositing
- [ ] Keep `CameraOverlayController` visible during recording
- [ ] Update cleanup to not stop camera until recording ends
- [ ] Test that camera appears in both preview and final video

**Code for Option A**:

```swift
// CameraService.swift - Add frame callback support
@MainActor
final class CameraService {
    // ... existing code ...
    
    // Add delegate for frame callbacks
    private var frameDelegate: CameraFrameDelegate?
    private var videoDataOutput: AVCaptureVideoDataOutput?
    
    /// Set a delegate to receive camera frames for compositing
    func setFrameDelegate(_ delegate: CameraFrameDelegate?) {
        self.frameDelegate = delegate
        
        if delegate != nil && videoDataOutput == nil {
            setupVideoDataOutput()
        }
    }
    
    private func setupVideoDataOutput() {
        guard let session = captureSession else { return }
        
        let output = AVCaptureVideoDataOutput()
        output.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        output.setSampleBufferDelegate(self, queue: sessionQueue)
        
        if session.canAddOutput(output) {
            session.addOutput(output)
            videoDataOutput = output
        }
    }
}

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    nonisolated func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        Task { @MainActor in
            frameDelegate?.cameraService(self, didOutputPixelBuffer: pixelBuffer)
        }
    }
}

protocol CameraFrameDelegate: AnyObject {
    @MainActor func cameraService(_ service: CameraService, didOutputPixelBuffer: CVPixelBuffer)
}
```

```swift
// CompositorService.swift - Use CameraService instead of own session
actor CompositorService: CameraFrameDelegate {
    // Remove: private var cameraSession: AVCaptureSession?
    // Remove: private var cameraDataOutput: AVCaptureVideoDataOutput?
    // Remove: private var cameraDelegate: CameraOutputDelegate?
    
    // Keep:
    private var latestCameraFrame: CVPixelBuffer?
    
    private func setupCamera() async throws {
        // Instead of creating our own session, use CameraService
        let cameraService = await CameraService.shared
        
        // Set ourselves as the frame delegate
        await MainActor.run {
            cameraService.setFrameDelegate(self)
        }
        
        // If camera isn't already running (for preview), start it
        if !cameraService.isRunning {
            _ = try await cameraService.startCapture()
        }
    }
    
    // Implement CameraFrameDelegate
    nonisolated func cameraService(_ service: CameraService, didOutputPixelBuffer buffer: CVPixelBuffer) {
        Task {
            await self.storeCameraFrame(buffer)
        }
    }
    
    // Update cleanup
    private func cleanup() async {
        // Don't stop camera here - let CameraOverlayController manage it
        await MainActor.run {
            CameraService.shared.setFrameDelegate(nil)
        }
        // ... rest of cleanup
    }
}
```

```swift
// AppDelegate.swift - Keep camera preview visible
private func beginRecording(options: RecordingOptions) {
    // ...
    
    // REMOVE these lines:
    // cameraOverlayController?.hide()
    // cameraOverlayController = nil
    
    // Camera preview stays visible during recording!
    // CompositorService will share the camera session
    
    // ...
}

private func stopRecording() {
    Task { @MainActor in
        // ...
        
        // NOW hide camera preview after recording stops
        cameraOverlayController?.hide()
        cameraOverlayController = nil
        
        // ...
    }
}
```

**Verification**:
1. Enable camera in style picker
2. Verify camera preview appears
3. Start recording
4. Verify camera preview STAYS visible during recording
5. Stop recording
6. Verify camera appears in final video
7. Verify camera preview hides after recording stops

**Commit**: `feat(camera): share camera session between preview and compositor`

---

## Part 3: Audio Level Icon Redesign (P1)

### P4-05: Create MicLevelIcon Component

**Status**: ⬜ Not Started

**Priority**: P1

**Description**: Create a new `MicLevelIcon` component that renders a microphone SF Symbol with its interior filled based on audio level. The fill should animate from bottom to top.

**Design Spec**:
- Use `mic.fill` as base shape
- Interior fills with gradient based on audio level (0-100%)
- Fill color: green at low levels, transitions to yellow, then red at peak
- Smooth animation between levels
- When muted, show `mic.slash.fill` with red tint

**File**: `Bemo/Views/MicLevelIcon.swift` (new file)

**Tasks**:
- [ ] Create `MicLevelIcon` view component
- [ ] Implement fill animation using mask
- [ ] Add color gradient based on level
- [ ] Handle muted state
- [ ] Add smooth level animation
- [ ] Support configurable size

**Code**:
```swift
import SwiftUI

// MARK: - Mic Level Icon

/// Microphone icon with interior fill based on audio level
struct MicLevelIcon: View {
    let level: Float  // 0.0 to 1.0
    var size: CGFloat = 20
    var isMuted: Bool = false
    var isEnabled: Bool = true
    
    // Animate level changes smoothly
    @State private var animatedLevel: Float = 0
    
    var body: some View {
        ZStack {
            if isMuted {
                // Muted state - show slash icon in red
                Image(systemName: "mic.slash.fill")
                    .font(.system(size: size, weight: .medium))
                    .foregroundStyle(.red)
            } else if !isEnabled {
                // Disabled state - show slash icon in secondary
                Image(systemName: "mic.slash.fill")
                    .font(.system(size: size, weight: .medium))
                    .foregroundStyle(.secondary)
            } else {
                // Active state with level fill
                ZStack {
                    // Background mic outline (empty)
                    Image(systemName: "mic.fill")
                        .font(.system(size: size, weight: .medium))
                        .foregroundStyle(Color.primary.opacity(0.15))
                    
                    // Filled mic (masked by level)
                    Image(systemName: "mic.fill")
                        .font(.system(size: size, weight: .medium))
                        .foregroundStyle(levelGradient)
                        .mask(
                            // Mask from bottom based on level
                            GeometryReader { geo in
                                Rectangle()
                                    .frame(height: geo.size.height * CGFloat(animatedLevel))
                                    .frame(maxHeight: .infinity, alignment: .bottom)
                            }
                        )
                    
                    // Mic outline for definition
                    Image(systemName: "mic")
                        .font(.system(size: size, weight: .medium))
                        .foregroundStyle(Color.primary.opacity(0.4))
                }
            }
        }
        .frame(width: size * 1.5, height: size * 1.5)
        .onChange(of: level) { _, newLevel in
            withAnimation(.easeOut(duration: 0.08)) {
                animatedLevel = newLevel
            }
        }
        .onAppear {
            animatedLevel = level
        }
    }
    
    // MARK: - Level Gradient
    
    private var levelGradient: LinearGradient {
        // Color stops based on level
        let colors: [Color]
        
        if animatedLevel < 0.5 {
            // Low level - green
            colors = [.green.opacity(0.8), .green]
        } else if animatedLevel < 0.8 {
            // Medium level - yellow
            colors = [.green, .yellow]
        } else {
            // High level - red
            colors = [.yellow, .red]
        }
        
        return LinearGradient(
            colors: colors,
            startPoint: .bottom,
            endPoint: .top
        )
    }
}

// MARK: - Preview

#Preview {
    HStack(spacing: 20) {
        // Various states
        MicLevelIcon(level: 0.0, size: 24)
        MicLevelIcon(level: 0.3, size: 24)
        MicLevelIcon(level: 0.6, size: 24)
        MicLevelIcon(level: 0.9, size: 24)
        MicLevelIcon(level: 0.5, size: 24, isMuted: true)
        MicLevelIcon(level: 0.0, size: 24, isEnabled: false)
    }
    .padding()
    .background(Color.black.opacity(0.8))
}
```

**Commit**: `feat(ui): add MicLevelIcon component with fill animation`

---

### P4-06: Integrate MicLevelIcon in Pre-Recording Dock

**Status**: ⬜ Not Started

**Priority**: P1

**Description**: Replace the separate microphone toggle + audio meter with the new integrated `MicLevelIcon` in the pre-recording controls dock.

**File**: `Bemo/Views/RecordingControlsView.swift`

**Current Layout**:
```
[Speaker] [Mic][====Meter====] [Camera] [Style]  |  WxH  |  [X] [Record▾]
```

**New Layout**:
```
[Speaker] [MicLevelIcon] [Camera] [Style]  |  WxH  |  [X] [Record▾]
```

**Tasks**:
- [ ] Remove separate `CompactAudioLevelMeterView`
- [ ] Replace `ToolbarToggle` for mic with `MicLevelIcon`
- [ ] Wrap `MicLevelIcon` in a button for toggle behavior
- [ ] Maintain same tap-to-toggle functionality
- [ ] Remove fixed width spacer for meter (no longer needed)
- [ ] Update layout spacing

**Code**:
```swift
// In RecordingControlsView.swift

// Replace this:
// HStack(spacing: 4) {
//     ToolbarToggle(...)
//     ZStack { CompactAudioLevelMeterView(...) }.frame(width: 32)
// }

// With this:
// Microphone with integrated level
Button {
    if !disabled {
        options.captureMicrophone.toggle()
    }
} label: {
    MicLevelIcon(
        level: options.captureMicrophone && audioMonitor.isMonitoring 
            ? audioMonitor.level : 0,
        size: 16,
        isMuted: false,
        isEnabled: options.captureMicrophone
    )
    .frame(width: 36, height: 36)
    .background(
        RoundedRectangle(cornerRadius: 8)
            .fill(isHovered ? Color.primary.opacity(0.08) : Color.clear)
    )
}
.buttonStyle(.plain)
.opacity(micPermissionStatus == .denied ? 0.4 : 1)
.help("Microphone")
.onHover { isHovered = $0 }
.onChange(of: options.captureMicrophone) { _, newValue in
    if newValue {
        // ... existing permission/monitoring logic
    }
}
```

**Commit**: `refactor(ui): use MicLevelIcon in pre-recording dock`

---

### P4-07: Integrate MicLevelIcon in Recording Indicator

**Status**: ⬜ Not Started

**Priority**: P1

**Description**: Replace the separate microphone toggle + audio meter in the recording indicator with the integrated `MicLevelIcon`.

**File**: `Bemo/Views/RecordingIndicatorView.swift`

**Current Layout** (when mic enabled):
```
[Stop] 🔴 0:15  |  [Mic][====Meter====]
```

**New Layout**:
```
[Stop] 🔴 0:15  |  [MicLevelIcon]
```

**Tasks**:
- [ ] Remove separate `CompactAudioLevelMeterView`
- [ ] Replace mic button + meter with `MicLevelIcon`
- [ ] Support muted state toggle
- [ ] Maintain tap-to-mute functionality

**Code**:
```swift
// In RecordingIndicatorView.swift

// Mic toggle with level (only show if mic was enabled at start)
if isMicEnabled {
    Divider()
        .frame(height: 20)
        .opacity(0.3)
    
    Button {
        isMuted.toggle()
        onMicToggle()
    } label: {
        MicLevelIcon(
            level: audioMonitor.isMonitoring ? audioMonitor.level : 0,
            size: 16,
            isMuted: isMuted,
            isEnabled: true
        )
        .frame(width: 36, height: 36)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.primary.opacity(0.08))
        )
    }
    .buttonStyle(.plain)
    .help(isMuted ? "Unmute Microphone" : "Mute Microphone")
}
```

**Commit**: `refactor(ui): use MicLevelIcon in recording indicator`

---

## Part 4: Button Sizing & Symmetry (P2)

### P4-08: Standardize Button Sizes in Pre-Recording Dock

**Status**: ⬜ Not Started

**Priority**: P2

**Description**: Standardize all button sizes in the pre-recording dock for visual consistency and symmetry.

**Current Issues**:
- `ToolbarToggle` buttons: 36×36
- Cancel button: 28×28 (too small!)
- Record button: variable width
- Style button: custom padding (inconsistent)

**Target Design**:
- All icon buttons: 32×32
- All buttons same visual weight
- Consistent corner radius (8pt)
- Record button: fixed width capsule

**File**: `Bemo/Views/RecordingControlsView.swift`

**Tasks**:
- [ ] Define `buttonSize` constant (32)
- [ ] Update `ToolbarToggle` to use `buttonSize`
- [ ] Update cancel button to use `buttonSize`
- [ ] Update style button to match toggle style
- [ ] Standardize record button width
- [ ] Ensure consistent spacing

**Code**:
```swift
// MARK: - Design Constants

private enum DockMetrics {
    static let buttonSize: CGFloat = 32
    static let iconSize: CGFloat = 14
    static let buttonRadius: CGFloat = 8
    static let sectionSpacing: CGFloat = 8
    static let buttonSpacing: CGFloat = 4
    static let dividerHeight: CGFloat = 24
    static let dockPadding: CGFloat = 8
    static let dockRadius: CGFloat = 12
}

// Updated ToolbarToggle:
private struct ToolbarToggle: View {
    let icon: String
    @Binding var isOn: Bool
    var tooltip: String = ""
    var disabled: Bool = false
    
    @State private var isHovered = false
    
    private var isSlashIcon: Bool {
        icon.contains(".slash")
    }
    
    var body: some View {
        Button {
            if !disabled { isOn.toggle() }
        } label: {
            Image(systemName: icon)
                .font(.system(size: DockMetrics.iconSize, weight: .medium))
                .foregroundStyle(iconColor)
                .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
                .background(
                    RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                        .fill(isHovered ? Color.primary.opacity(0.08) : Color.clear)
                )
        }
        .buttonStyle(.plain)
        .opacity(disabled ? 0.4 : 1)
        .help(tooltip)
        .onHover { isHovered = $0 }
    }
    
    private var iconColor: Color {
        if isOn { return .primary }
        else if isSlashIcon { return .red }
        else { return .secondary }
    }
}

// Updated Cancel Button:
Button(action: {
    audioMonitor.stopMonitoring()
    onCancel()
}) {
    Image(systemName: "xmark")
        .font(.system(size: 12, weight: .semibold))
        .foregroundStyle(.secondary)
        .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
        .background(
            RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                .fill(Color.secondary.opacity(0.1))
        )
}
.buttonStyle(.plain)
.help("Cancel")

// Updated Style Button (match toggle style):
Button {
    showStylePicker.toggle()
} label: {
    Image(systemName: "sparkles")
        .font(.system(size: DockMetrics.iconSize, weight: .medium))
        .foregroundStyle(.primary)
        .frame(width: DockMetrics.buttonSize, height: DockMetrics.buttonSize)
        .background(
            RoundedRectangle(cornerRadius: DockMetrics.buttonRadius)
                .fill(isStyleHovered ? Color.primary.opacity(0.08) : Color.clear)
        )
}
.buttonStyle(.plain)
.help("Recording Style")
.onHover { isStyleHovered = $0 }

// Updated Record Button (fixed width):
private var recordButton: some View {
    HStack(spacing: 0) {
        Button {
            startRecording()
        } label: {
            HStack(spacing: 6) {
                Circle()
                    .fill(.red)
                    .frame(width: 14, height: 14)
                
                if options.delaySeconds > 0 {
                    Text("\(options.delaySeconds)s")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(width: options.delaySeconds > 0 ? 56 : 36, height: DockMetrics.buttonSize)
        }
        .buttonStyle(.plain)
        
        Divider()
            .frame(height: 16)
            .opacity(0.3)
        
        Button {
            showRecordMenu.toggle()
        } label: {
            Image(systemName: "chevron.down")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.secondary)
                .frame(width: 20, height: DockMetrics.buttonSize)
        }
        .buttonStyle(.plain)
    }
    .background(Color.primary.opacity(0.08))
    .clipShape(RoundedRectangle(cornerRadius: DockMetrics.buttonRadius))
}
```

**Commit**: `refactor(ui): standardize button sizes in pre-recording dock`

---

### P4-09: Redesign Recording Indicator Layout

**Status**: ⬜ Not Started

**Priority**: P2

**Description**: Redesign the during-recording indicator to match the pre-recording dock visual language and sizing.

**Current Issues**:
- Stop button (24×24) is smaller than other buttons
- Inconsistent with pre-recording dock design
- Timer and elements feel cramped

**Target Design**:
```
┌─────────────────────────────────────────────┐
│  [■ Stop]  🔴 0:15  │  [MicLevelIcon]       │
└─────────────────────────────────────────────┘
```

**File**: `Bemo/Views/RecordingIndicatorView.swift`

**Tasks**:
- [ ] Import `DockMetrics` or use same constants
- [ ] Update stop button to 32×32
- [ ] Standardize spacing with pre-recording dock
- [ ] Align visual language (radius, opacity, etc.)

**Code**:
```swift
struct RecordingIndicatorView: View {
    let isMicEnabled: Bool
    let onStop: () -> Void
    let onMicToggle: () -> Void
    
    @StateObject private var audioMonitor = AudioLevelMonitor.shared
    @State private var elapsedSeconds: Int = 0
    @State private var isPulsing: Bool = false
    @State private var isMuted: Bool = false
    
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    // Use same metrics as pre-recording dock
    private let buttonSize: CGFloat = 32
    private let buttonRadius: CGFloat = 8
    
    var body: some View {
        HStack(spacing: 12) {
            // Stop button - matches other button sizes
            Button(action: onStop) {
                Image(systemName: "stop.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: buttonSize, height: buttonSize)
                    .background(Circle().fill(.red))
            }
            .buttonStyle(.plain)
            .help("Stop Recording (ESC)")
            
            // Recording indicator + time
            HStack(spacing: 8) {
                // Pulsing dot
                Circle()
                    .fill(.red)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isPulsing ? 1.0 : 0.7)
                    .opacity(isPulsing ? 1.0 : 0.6)
                
                // Timer - wider for readability
                Text(formattedTime)
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .foregroundStyle(.primary)
                    .frame(minWidth: 44, alignment: .leading)
            }
            
            // Mic toggle with level (only show if mic was enabled at start)
            if isMicEnabled {
                Divider()
                    .frame(height: 20)
                    .opacity(0.3)
                
                Button {
                    isMuted.toggle()
                    onMicToggle()
                } label: {
                    MicLevelIcon(
                        level: audioMonitor.isMonitoring ? audioMonitor.level : 0,
                        size: 16,
                        isMuted: isMuted,
                        isEnabled: true
                    )
                    .frame(width: buttonSize, height: buttonSize)
                    .background(
                        RoundedRectangle(cornerRadius: buttonRadius)
                            .fill(Color.primary.opacity(0.08))
                    )
                }
                .buttonStyle(.plain)
                .help(isMuted ? "Unmute (M)" : "Mute (M)")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.primary.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.15), radius: 12, y: 6)
        .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                isPulsing = true
            }
        }
        .onReceive(timer) { _ in
            elapsedSeconds += 1
        }
    }
    
    private var formattedTime: String {
        let minutes = elapsedSeconds / 60
        let seconds = elapsedSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}
```

**Commit**: `refactor(ui): redesign recording indicator layout`

---

### P4-10: Polish Dock Visual Consistency

**Status**: ⬜ Not Started

**Priority**: P2

**Description**: Final polish pass to ensure both docks have consistent visual language.

**File**: `Bemo/Views/RecordingControlsView.swift`, `Bemo/Views/RecordingIndicatorView.swift`

**Tasks**:
- [ ] Audit shadow values (match between docks)
- [ ] Verify border stroke consistency
- [ ] Check padding values match
- [ ] Test on light and dark mode
- [ ] Verify animation timings are consistent
- [ ] Add hover states where missing

**Verification Checklist**:
- [ ] Both docks have same corner radius (12pt)
- [ ] Both docks have same border stroke (0.5pt, 0.1 opacity)
- [ ] Both docks have same shadow (0.15-0.2 opacity, 12-20 radius)
- [ ] All buttons have same size (32×32)
- [ ] All button backgrounds have same corner radius (8pt)
- [ ] Hover states are consistent
- [ ] Animations feel smooth and intentional

**Commit**: `style(ui): polish dock visual consistency`

---

## Part 5: Video Trimming (P2)

### P4-11: Add Video Trim UI to RecordingCompleteView

**Status**: ⬜ Not Started

**Priority**: P2

**Description**: Add a timeline scrubber with trim handles to the post-recording panel, allowing users to trim the start and end of recordings.

**File**: `Bemo/Views/RecordingCompleteView.swift`

**Tasks**:
- [ ] Create `VideoTrimmerView` component
- [ ] Add timeline with frame thumbnails
- [ ] Add draggable start/end trim handles
- [ ] Show current playhead position
- [ ] Display trim range timestamps
- [ ] Add preview playback within trim range
- [ ] Add "Trim" button to export trimmed version

**Code**:
```swift
// MARK: - Video Trimmer View

struct VideoTrimmerView: View {
    let asset: AVAsset
    let duration: TimeInterval
    
    @Binding var trimStart: TimeInterval
    @Binding var trimEnd: TimeInterval
    
    @State private var thumbnails: [NSImage] = []
    @State private var isDraggingStart = false
    @State private var isDraggingEnd = false
    
    private let height: CGFloat = 44
    private let handleWidth: CGFloat = 12
    
    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let startX = CGFloat(trimStart / duration) * (width - handleWidth * 2) + handleWidth
            let endX = CGFloat(trimEnd / duration) * (width - handleWidth * 2) + handleWidth
            
            ZStack(alignment: .leading) {
                // Thumbnail strip
                HStack(spacing: 0) {
                    ForEach(Array(thumbnails.enumerated()), id: \.offset) { _, thumb in
                        Image(nsImage: thumb)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: width / CGFloat(max(thumbnails.count, 1)))
                            .clipped()
                    }
                }
                .frame(height: height)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                
                // Dimmed areas outside trim range
                HStack(spacing: 0) {
                    // Left dim
                    Rectangle()
                        .fill(Color.black.opacity(0.6))
                        .frame(width: startX)
                    
                    Spacer()
                    
                    // Right dim
                    Rectangle()
                        .fill(Color.black.opacity(0.6))
                        .frame(width: width - endX)
                }
                .frame(height: height)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .allowsHitTesting(false)
                
                // Trim handles
                TrimHandle(isStart: true)
                    .offset(x: startX - handleWidth)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                let newX = value.location.x
                                let newTime = max(0, min(trimEnd - 1, TimeInterval(newX / width) * duration))
                                trimStart = newTime
                            }
                    )
                
                TrimHandle(isStart: false)
                    .offset(x: endX)
                    .gesture(
                        DragGesture()
                            .onChanged { value in
                                let newX = value.location.x
                                let newTime = max(trimStart + 1, min(duration, TimeInterval(newX / width) * duration))
                                trimEnd = newTime
                            }
                    )
                
                // Selection border
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color.accentColor, lineWidth: 2)
                    .frame(width: endX - startX + handleWidth * 2, height: height)
                    .offset(x: startX - handleWidth)
                    .allowsHitTesting(false)
            }
        }
        .frame(height: height)
        .onAppear {
            generateThumbnails()
        }
    }
    
    private func generateThumbnails() {
        Task {
            let generator = AVAssetImageGenerator(asset: asset)
            generator.appliesPreferredTrackTransform = true
            generator.maximumSize = CGSize(width: 80, height: height * 2)
            
            let count = 8
            var images: [NSImage] = []
            
            for i in 0..<count {
                let time = CMTime(seconds: duration * Double(i) / Double(count), preferredTimescale: 600)
                do {
                    let cgImage = try generator.copyCGImage(at: time, actualTime: nil)
                    images.append(NSImage(cgImage: cgImage, size: NSSize(width: 80, height: 44)))
                } catch {
                    // Skip failed thumbnails
                }
            }
            
            await MainActor.run {
                thumbnails = images
            }
        }
    }
}

struct TrimHandle: View {
    let isStart: Bool
    
    var body: some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(Color.accentColor)
            .frame(width: 12, height: 44)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.white)
                    .frame(width: 3, height: 20)
            )
    }
}
```

**Commit**: `feat(ui): add video trimmer UI component`

---

### P4-12: Implement Video Trim Export

**Status**: ⬜ Not Started

**Priority**: P2

**Description**: Implement the backend logic to export a trimmed version of the recording.

**File**: `Bemo/Services/VideoTrimService.swift` (new file)

**Tasks**:
- [ ] Create `VideoTrimService`
- [ ] Implement trim export using `AVAssetExportSession`
- [ ] Preserve original file, create trimmed copy
- [ ] Show progress indicator during export
- [ ] Handle errors gracefully
- [ ] Update clipboard with trimmed file

**Code**:
```swift
import AVFoundation

// MARK: - Video Trim Service

actor VideoTrimService {
    static let shared = VideoTrimService()
    
    private init() {}
    
    /// Trim a video to the specified time range
    /// - Parameters:
    ///   - sourceURL: Original video file URL
    ///   - startTime: Trim start time in seconds
    ///   - endTime: Trim end time in seconds
    /// - Returns: URL to the trimmed video file
    func trim(
        sourceURL: URL,
        startTime: TimeInterval,
        endTime: TimeInterval
    ) async throws -> URL {
        let asset = AVAsset(url: sourceURL)
        
        // Create output URL
        let outputURL = sourceURL
            .deletingLastPathComponent()
            .appendingPathComponent(
                sourceURL.deletingPathExtension().lastPathComponent + " (trimmed).mp4"
            )
        
        // Remove existing file
        try? FileManager.default.removeItem(at: outputURL)
        
        // Create export session
        guard let exportSession = AVAssetExportSession(
            asset: asset,
            presetName: AVAssetExportPresetHighestQuality
        ) else {
            throw TrimError.exportSessionCreationFailed
        }
        
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        
        // Set time range
        let start = CMTime(seconds: startTime, preferredTimescale: 600)
        let end = CMTime(seconds: endTime, preferredTimescale: 600)
        exportSession.timeRange = CMTimeRange(start: start, end: end)
        
        // Export
        await exportSession.export()
        
        switch exportSession.status {
        case .completed:
            return outputURL
        case .failed:
            throw exportSession.error ?? TrimError.exportFailed
        case .cancelled:
            throw TrimError.exportCancelled
        default:
            throw TrimError.exportFailed
        }
    }
}

enum TrimError: Error, LocalizedError {
    case exportSessionCreationFailed
    case exportFailed
    case exportCancelled
    
    var errorDescription: String? {
        switch self {
        case .exportSessionCreationFailed:
            return "Failed to create export session"
        case .exportFailed:
            return "Video export failed"
        case .exportCancelled:
            return "Video export was cancelled"
        }
    }
}
```

**Commit**: `feat(video): add video trim export service`

---

## Definition of Done

### Critical Fixes (P0)
- [ ] Record 30-second video with microphone - audio is present and synced
- [ ] Record 30-second video with system audio - audio is present and synced
- [ ] No duplicate `startSession` calls in logs
- [ ] Audio samples logged with correct relative timestamps

### Camera Preview (P1)
- [ ] Camera preview visible before recording
- [ ] Camera preview stays visible during recording
- [ ] Camera appears in final video
- [ ] Camera preview hides after recording stops

### Audio Icon (P1)
- [ ] `MicLevelIcon` fills from bottom based on audio level
- [ ] Color gradient visible (green → yellow → red)
- [ ] Muted state shows red slash icon
- [ ] Smooth animation between levels
- [ ] Icon works in both pre-recording and during-recording docks

### Button Sizing (P2)
- [ ] All buttons are 32×32
- [ ] All buttons have 8pt corner radius
- [ ] Record button has consistent width
- [ ] Cancel button matches other button sizes
- [ ] Style button matches toggle button style

### Video Trimming (P2)
- [ ] Trim UI visible in post-recording panel
- [ ] Can drag start/end handles
- [ ] Timestamps update as handles move
- [ ] "Trim" button exports trimmed version
- [ ] Original file preserved

---

## File Changes Summary

### New Files
- `Bemo/Views/MicLevelIcon.swift`
- `Bemo/Services/VideoTrimService.swift`

### Modified Files
- `Bemo/Services/CompositorService.swift` - Audio timing fixes, session fixes, camera sharing
- `Bemo/Services/CameraService.swift` - Add frame delegate support
- `Bemo/App/AppDelegate.swift` - Keep camera preview during recording
- `Bemo/Views/RecordingControlsView.swift` - Button sizing, MicLevelIcon integration
- `Bemo/Views/RecordingIndicatorView.swift` - Button sizing, MicLevelIcon integration
- `Bemo/Views/RecordingCompleteView.swift` - Add video trimmer UI

---

## Implementation Order

1. **P4-01, P4-02, P4-03** - Fix audio timing (must be first - blocking issue)
2. **P4-04** - Camera preview during recording
3. **P4-05** - Create MicLevelIcon component
4. **P4-06, P4-07** - Integrate MicLevelIcon
5. **P4-08, P4-09, P4-10** - Button sizing polish
6. **P4-11, P4-12** - Video trimming (can be deferred)

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-21 | Initial plan created |
| 2026-01-21 | Completed P4-01 to P4-10: Audio fixes, camera sharing, MicLevelIcon, button sizing |
