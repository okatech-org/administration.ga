//
//  CardDesignerView.swift
//  AgentMacOS
//
//  Main card designer view with toolbar, canvas, and properties panel
//

import SwiftUI

struct CardDesignerView: View {
    @State private var viewModel = DesignerViewModel()
    @Environment(AppState.self) private var appState
    
    var body: some View {
        GeometryReader { geometry in
            let isCompact = geometry.size.width < 700
            
            ZStack(alignment: .top) {
                // Main content
                HStack(spacing: 0) {
                    // Canvas area
                    ScrollView([.horizontal, .vertical]) {
                        CanvasView(viewModel: viewModel)
                            .padding(40)
                            .padding(.top, 60) // Make room for floating toolbar
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.windowBackgroundColor))
                    
                    // Properties panel - hide when compact
                    if !isCompact {
                        Divider()
                        
                        PropertiesPanel(viewModel: viewModel)
                            .frame(width: min(260, geometry.size.width * 0.3))
                    }
                }
                
                // Floating toolbar - centered and scrollable when narrow
                HStack {
                    Spacer()
                    ScrollView(.horizontal, showsIndicators: false) {
                        DesignerToolbar(viewModel: viewModel)
                    }
                    Spacer()
                }
                .padding(.top, 12)
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: printCard) {
                    Label("Print", systemImage: "printer")
                }
                .disabled(!appState.isPrinterConnected)
            }
            
            ToolbarItem(placement: .primaryAction) {
                Button(action: saveTemplate) {
                    Label("Save", systemImage: "square.and.arrow.down")
                }
            }
        }
    }
    
    // MARK: - Actions
    
    private func printCard() {
        // TODO: Implement print
    }
    
    private func saveTemplate() {
        viewModel.saveTemplate()
    }
}

#Preview {
    CardDesignerView()
        .environment(AppState())
}
