//
//  PrintPageView.swift
//  AgentMacOS
//
//  Container for print-related tabs: card printing + test print
//

import SwiftUI

struct PrintPageView: View {
    @State private var selectedTab: PrintTab = .cards

    enum PrintTab: String, CaseIterable {
        case cards = "Cartes"
        case test = "Test"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab bar
            HStack(spacing: 0) {
                ForEach(PrintTab.allCases, id: \.self) { tab in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedTab = tab
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: tab == .cards ? "person.crop.rectangle.stack" : "printer.dotmatrix")
                            Text(tab.rawValue)
                        }
                        .font(.subheadline.weight(selectedTab == tab ? .semibold : .regular))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedTab == tab ? Color.blue.opacity(0.15) : Color.clear)
                        .foregroundStyle(selectedTab == tab ? .blue : .secondary)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(.windowBackgroundColor))

            Divider()

            // Content
            switch selectedTab {
            case .cards:
                ProfilePrintView()
            case .test:
                PrintTestView()
            }
        }
    }
}

#Preview {
    PrintPageView()
        .environment(AppState())
        .frame(width: 1000, height: 700)
}
