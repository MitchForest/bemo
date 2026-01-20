import Vision
import AppKit

enum OCRError: Error, LocalizedError {
    case noTextFound
    case processingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .noTextFound:
            return "No text found in selection"
        case .processingFailed(let error):
            return "OCR failed: \(error.localizedDescription)"
        }
    }
}

actor OCRService {
    static let shared = OCRService()

    enum RecognitionLevel: Sendable {
        case fast
        case accurate

        var vnLevel: VNRequestTextRecognitionLevel {
            switch self {
            case .fast: return .fast
            case .accurate: return .accurate
            }
        }
    }

    private init() {}

    func recognize(
        image: CGImage,
        level: RecognitionLevel = .accurate,
        languages: [String] = ["en-US"]
    ) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: OCRError.processingFailed(error))
                    return
                }

                guard let observations = request.results as? [VNRecognizedTextObservation],
                      !observations.isEmpty else {
                    continuation.resume(throwing: OCRError.noTextFound)
                    return
                }

                // Sort by position (top to bottom, left to right)
                let sortedObservations = observations.sorted { first, second in
                    let firstY = 1 - first.boundingBox.midY
                    let secondY = 1 - second.boundingBox.midY
                    if abs(firstY - secondY) < 0.02 {
                        return first.boundingBox.minX < second.boundingBox.minX
                    }
                    return firstY < secondY
                }

                let text = sortedObservations
                    .compactMap { $0.topCandidates(1).first?.string }
                    .joined(separator: "\n")

                continuation.resume(returning: text)
            }

            request.recognitionLevel = level.vnLevel
            request.recognitionLanguages = languages
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: image, options: [:])

            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: OCRError.processingFailed(error))
            }
        }
    }
}
