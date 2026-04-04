//
//  PrintQueueManager.swift
//  AgentMacOS
//
//  Manages print job queue with progress tracking
//

import Foundation
import AppKit

// MARK: - Print Job

struct PrintJobItem: Identifiable {
    let id: UUID
    let template: CardTemplate
    let data: [String: String]
    let recordName: String
    let outputTray: OutputTrayOption
    let duplexType: DuplexType
    var status: PrintJobStatus
    var progress: Double
    var errorMessage: String?
    let createdAt: Date
    var completedAt: Date?
    
    var frontImage: NSImage?
    var backImage: NSImage?
    
    // Add NFC payload
    let nfcPayload: NFCPayload?
    
    init(
        template: CardTemplate,
        data: [String: String],
        recordName: String,
        nfcPayload: NFCPayload? = nil,
        outputTray: OutputTrayOption = .standard,
        duplexType: DuplexType = .colorColor
    ) {
        self.id = UUID()
        self.template = template
        self.data = data
        self.recordName = recordName
        self.nfcPayload = nfcPayload
        self.outputTray = outputTray
        self.duplexType = duplexType
        self.status = .pending
        self.progress = 0
        self.createdAt = Date()
    }
}

// MARK: - Print Queue Manager

@Observable
final class PrintQueueManager {
    
    // MARK: - Properties
    
    private(set) var jobs: [PrintJobItem] = []
    private(set) var isProcessing = false
    private(set) var currentJobId: UUID?
    
    private let renderer = CardRenderer()
    private let printerService = PrinterService.shared
    
    /// Helper to substitute variables in text (e.g. {{name}})
    private func resolveText(_ text: String, with data: [String: String]) -> String {
        var result = text
        for (key, value) in data {
            result = result.replacingOccurrences(of: "{{\(key)}}", with: value)
        }
        return result
    }
    
    // MARK: - Singleton
    
    static let shared = PrintQueueManager()
    private init() {}
    
    // MARK: - Computed Properties
    
    var pendingCount: Int {
        jobs.filter { $0.status == .pending }.count
    }
    
    var completedCount: Int {
        jobs.filter { $0.status == .completed }.count
    }
    
    var failedCount: Int {
        jobs.filter { if case .failed = $0.status { return true } else { return false } }.count
    }
    
    // MARK: - Queue Management
    
    /// Add a single print job to the queue
    /// Add a single print job to the queue
    func addJob(
        template: CardTemplate,
        data: [String: String],
        recordName: String,
        nfcPayload: NFCPayload? = nil,
        outputTray: OutputTrayOption = .standard,
        duplexType: DuplexType = .colorColor
    ) {
        let job = PrintJobItem(
            template: template,
            data: data,
            recordName: recordName,
            nfcPayload: nfcPayload,
            outputTray: outputTray,
            duplexType: duplexType
        )
        jobs.append(job)
    }
    
    /// Add multiple print jobs (batch)
    func addBatch(template: CardTemplate, records: [[String: String]]) {
        for (index, data) in records.enumerated() {
            let recordName = data["nom"] ?? data["name"] ?? "Record \(index + 1)"
            addJob(template: template, data: data, recordName: recordName)
        }
    }
    
    /// Remove a job from the queue
    func removeJob(id: UUID) {
        jobs.removeAll { $0.id == id }
    }
    
    /// Clear completed jobs
    func clearCompleted() {
        jobs.removeAll { $0.status == .completed }
    }
    
    /// Clear all jobs
    func clearAll() {
        guard !isProcessing else { return }
        jobs.removeAll()
    }
    
    /// Retry failed job
    func retryJob(id: UUID) {
        guard let index = jobs.firstIndex(where: { $0.id == id }) else { return }
        jobs[index].status = .pending
        jobs[index].progress = 0
        jobs[index].errorMessage = nil
    }
    
    /// Retry all failed jobs
    func retryAllFailed() {
        for index in jobs.indices where jobs[index].status != .completed {
            if case .failed = jobs[index].status {
                jobs[index].status = .pending
                jobs[index].progress = 0
                jobs[index].errorMessage = nil
            }
        }
    }
    
    // MARK: - Processing
    
    /// Start processing the queue
    func startProcessing() {
        print("📢 [PrintQueue] startProcessing called")
        print("📢 [PrintQueue] isProcessing: \(isProcessing)")
        print("📢 [PrintQueue] jobs count: \(jobs.count)")
        print("📢 [PrintQueue] pending jobs: \(pendingCount)")
        print("📢 [PrintQueue] printerService.isConnected: \(printerService.isConnected)")
        
        guard !isProcessing else {
            print("⚠️ [PrintQueue] Already processing, skipping")
            return
        }
        guard printerService.isConnected else {
            print("❌ [PrintQueue] Printer not connected, aborting")
            return
        }
        
        print("✅ [PrintQueue] Starting processing task...")
        isProcessing = true
        
        Task {
            await processQueue()
            await MainActor.run {
                isProcessing = false
                currentJobId = nil
                print("📢 [PrintQueue] Processing complete")
            }
        }
    }
    
    /// Stop processing (current job will complete)
    func stopProcessing() {
        isProcessing = false
    }
    
    private func processQueue() async {
        print("🔄 [PrintQueue] processQueue started")
        
        while isProcessing {
            // Find next pending job
            guard let index = await MainActor.run(body: {
                jobs.firstIndex { $0.status == .pending }
            }) else {
                print("🔄 [PrintQueue] No pending jobs found, exiting loop")
                break
            }
            
            print("🔄 [PrintQueue] Processing job at index \(index)")
            
            await MainActor.run {
                currentJobId = jobs[index].id
                jobs[index].status = .printing
                jobs[index].progress = 0.1
                print("🔄 [PrintQueue] Job status set to printing")
            }
            
            do {
                // Render front image
                await MainActor.run { jobs[index].progress = 0.2 }
                
                let frontImage = try await renderer.render(
                    template: jobs[index].template,
                    data: jobs[index].data,
                    side: .front,
                    backgroundImage: jobs[index].template.frontBackgroundImage
                )
                
                await MainActor.run {
                    jobs[index].frontImage = frontImage
                    jobs[index].progress = 0.4
                }
                
                // Render back image if duplex
                var backImage: NSImage?
                if jobs[index].template.printDuplex {
                    await MainActor.run { jobs[index].progress = 0.5 }
                    
                    backImage = try await renderer.render(
                        template: jobs[index].template,
                        data: jobs[index].data,
                        side: .back,
                        backgroundImage: jobs[index].template.backBackgroundImage
                    )
                    
                    await MainActor.run {
                        jobs[index].backImage = backImage
                        jobs[index].progress = 0.6
                    }
                }
                
                // Print
                await MainActor.run { jobs[index].progress = 0.7 }
                
                // Prepare Magnetic Tracks
                var magTracks: [Int: String]? = nil
                let templateTracks = jobs[index].template.magneticTracks
                if !templateTracks.isEmpty, templateTracks.contains(where: { !$0.isEmpty }) {
                    magTracks = [:]
                    // Map array (0-2) to tracks (1-3) and resolve variables
                    if templateTracks.indices.contains(0), !templateTracks[0].isEmpty {
                         magTracks?[1] = resolveText(templateTracks[0], with: jobs[index].data)
                    }
                    if templateTracks.indices.contains(1), !templateTracks[1].isEmpty {
                         magTracks?[2] = resolveText(templateTracks[1], with: jobs[index].data)
                    }
                    if templateTracks.indices.contains(2), !templateTracks[2].isEmpty {
                         magTracks?[3] = resolveText(templateTracks[2], with: jobs[index].data)
                    }
                }

                try await printerService.printCard(
                    frontImage: frontImage,
                    backImage: backImage,
                    nfcPayload: jobs[index].nfcPayload,
                    magTracks: magTracks,
                    outputTray: jobs[index].outputTray,
                    duplexType: jobs[index].duplexType
                )
                
                await MainActor.run {
                    jobs[index].status = .completed
                    jobs[index].progress = 1.0
                    jobs[index].completedAt = Date()
                }
                
            } catch {
                await MainActor.run {
                    jobs[index].status = .failed(error.localizedDescription)
                    jobs[index].errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    // MARK: - Preview Generation
    
    /// Generate preview images for a job without printing
    func generatePreview(for jobId: UUID) async throws -> (front: NSImage, back: NSImage?) {
        guard let job = jobs.first(where: { $0.id == jobId }) else {
            throw PrintError.notConnected
        }
        
        let frontImage = try await renderer.render(
            template: job.template,
            data: job.data,
            side: .front,
            backgroundImage: job.template.frontBackgroundImage
        )
        
        var backImage: NSImage?
        if job.template.printDuplex {
            backImage = try await renderer.render(
                template: job.template,
                data: job.data,
                side: .back,
                backgroundImage: job.template.backBackgroundImage
            )
        }
        
        return (frontImage, backImage)
    }
    
    /// Generate preview for a template and data (without adding to queue)
    func generatePreview(
        template: CardTemplate,
        data: [String: String]
    ) async throws -> (front: NSImage, back: NSImage?) {
        let frontImage = try await renderer.render(
            template: template,
            data: data,
            side: .front,
            backgroundImage: template.frontBackgroundImage
        )
        
        var backImage: NSImage?
        if template.printDuplex {
            backImage = try await renderer.render(
                template: template,
                data: data,
                side: .back,
                backgroundImage: template.backBackgroundImage
            )
        }
        
        return (frontImage, backImage)
    }
}
// Note: Callers of `generatePreview(for:)` and `generatePreview(template:data:)` need to be updated to handle async calls.
// Also callers of `processQueue()` are internal, used only in this file.
// The `startProcessing()` method launches `processQueue` in a Task, so no async change needed there.

