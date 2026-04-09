//
//  Theme.swift
//  AgentMacOS
//
//  Centralized design system for premium UI
//

import SwiftUI

// MARK: - AppTheme

enum AppTheme {
    
    // MARK: - Colors
    
    enum Colors {
        // Backgrounds
        static let sidebarBackground = Color(nsColor: .controlBackgroundColor)
        static let contentBackground = Color(nsColor: .windowBackgroundColor)
        static let cardBackground = Color(nsColor: .controlBackgroundColor)
        
        // Glass effects
        static let glassBackground = Color.white.opacity(0.05)
        static let glassBorder = Color.white.opacity(0.1)
        static let glassBorderLight = Color.white.opacity(0.15)
        
        // Glow effects
        static let canvasGlow = Color.blue.opacity(0.12)
        static let selectionGlow = Color.accentColor.opacity(0.4)
        
        // Accent variations
        static let accentSubtle = Color.accentColor.opacity(0.1)
        static let accentMedium = Color.accentColor.opacity(0.3)
        
        // Text
        static let textPrimary = Color.primary
        static let textSecondary = Color.secondary
        static let textTertiary = Color(nsColor: .tertiaryLabelColor)
        
        // Status
        static let success = Color.green
        static let warning = Color.orange
        static let error = Color.red
    }
    
    // MARK: - Animation
    
    enum Animation {
        /// Standard spring for most UI transitions
        static let spring = SwiftUI.Animation.spring(response: 0.35, dampingFraction: 0.7)
        
        /// Quick micro-bounce for hover effects
        static let microBounce = SwiftUI.Animation.spring(response: 0.25, dampingFraction: 0.6)
        
        /// Snappy spring for selection changes
        static let snappy = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.8)
        
        /// Smooth ease for fades
        static let smooth = SwiftUI.Animation.easeInOut(duration: 0.2)
    }
    
    // MARK: - Spacing
    
    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
    }
    
    // MARK: - Radius
    
    enum Radius {
        static let sm: CGFloat = 6
        static let md: CGFloat = 8
        static let lg: CGFloat = 12
        static let xl: CGFloat = 16
        static let pill: CGFloat = 100
    }
    
    // MARK: - Shadows
    
    enum Shadows {
        /// Floating element shadow (toolbar, modals)
        static func floating(_ color: Color = .black.opacity(0.25)) -> some View {
            Color.clear
                .shadow(color: color, radius: 20, x: 0, y: 8)
        }
        
        /// Subtle lift shadow for cards
        static func lift(_ isActive: Bool = true) -> some View {
            Color.clear
                .shadow(color: .black.opacity(isActive ? 0.15 : 0.08), radius: isActive ? 12 : 6, y: isActive ? 6 : 3)
        }
        
        /// Glow effect for selected/active elements
        static func glow(_ color: Color, intensity: CGFloat = 1.0) -> some View {
            Color.clear
                .shadow(color: color.opacity(0.4 * intensity), radius: 15, x: 0, y: 0)
        }
    }
    
    // MARK: - Dimensions
    
    enum Dimensions {
        static let sidebarWidth: CGFloat = 220
        static let propertiesPanelWidth: CGFloat = 260
        static let toolbarHeight: CGFloat = 44
        static let iconButtonSize: CGFloat = 32
    }
}

// MARK: - View Extensions

extension View {
    /// Apply floating toolbar style
    func floatingToolbarStyle() -> some View {
        self
            .padding(.horizontal, AppTheme.Spacing.xl)
            .padding(.vertical, AppTheme.Spacing.md)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(AppTheme.Colors.glassBorder, lineWidth: 1))
            .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
    }
    
    /// Apply glass card style
    func glassCardStyle(isHovered: Bool = false) -> some View {
        self
            .background(AppTheme.Colors.glassBackground)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.Radius.lg)
                    .stroke(isHovered ? AppTheme.Colors.glassBorderLight : AppTheme.Colors.glassBorder, lineWidth: 1)
            )
            .shadow(color: .black.opacity(isHovered ? 0.15 : 0.08), radius: isHovered ? 12 : 6, y: isHovered ? 6 : 3)
    }
    
    /// Apply premium hover effect
    func premiumHover(isHovered: Bool, scale: CGFloat = 1.03, glowColor: Color? = nil) -> some View {
        self
            .scaleEffect(isHovered ? scale : 1.0)
            .shadow(color: (glowColor ?? .clear).opacity(isHovered ? 0.3 : 0), radius: 15, y: 5)
            .animation(AppTheme.Animation.microBounce, value: isHovered)
    }
    
    /// Apply sidebar item style
    func sidebarItemStyle(isSelected: Bool, isHovered: Bool) -> some View {
        self
            .padding(.horizontal, AppTheme.Spacing.md)
            .padding(.vertical, AppTheme.Spacing.sm)
            .background(
                isSelected ? Color.accentColor : (isHovered ? AppTheme.Colors.glassBackground : .clear)
            )
            .foregroundStyle(isSelected ? .white : AppTheme.Colors.textPrimary)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.md))
            .scaleEffect(isHovered && !isSelected ? 1.02 : 1.0)
            .animation(AppTheme.Animation.microBounce, value: isHovered)
            .animation(AppTheme.Animation.snappy, value: isSelected)
    }
}

// MARK: - Gradient Backgrounds

extension AppTheme {
    enum Gradients {
        /// Subtle canvas background gradient
        static var canvasBackground: LinearGradient {
            LinearGradient(
                colors: [
                    Color(nsColor: .windowBackgroundColor),
                    Color(nsColor: .windowBackgroundColor).opacity(0.95)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        
        /// Premium accent gradient
        static var accent: LinearGradient {
            LinearGradient(
                colors: [Color.accentColor, Color.accentColor.opacity(0.8)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}
