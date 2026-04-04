//
//  SignInView.swift
//  AgentMacOS
//
//  Sign-in view using Better Auth email OTP flow
//

import SwiftUI

struct SignInView: View {
    @Environment(AppState.self) private var appState

    enum Step {
        case enterEmail
        case enterOTP
    }

    @State private var step: Step = .enterEmail
    @State private var email = ""
    @State private var otpCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @FocusState private var isOTPFocused: Bool

    private let authProvider = BetterAuthProvider()

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: 32) {
                // Logo & Title
                VStack(spacing: 12) {
                    Image(systemName: "building.columns.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(.accent)

                    Text("Agent macOS")
                        .font(.largeTitle.weight(.bold))

                    Text("Portail Agent Consulaire")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                }

                // Form
                VStack(spacing: 20) {
                    switch step {
                    case .enterEmail:
                        emailStep
                    case .enterOTP:
                        otpStep
                    }

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }
                }
                .frame(width: 340)
            }

            Spacer()

            // Footer
            Text("Diplomate.ga — Plateforme Consulaire")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }

    // MARK: - Email Step

    private var emailStep: some View {
        VStack(spacing: 16) {
            Text("Entrez votre adresse email")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            TextField("votre@email.com", text: $email)
                .textFieldStyle(.roundedBorder)
                .font(.body)
                .multilineTextAlignment(.center)
                .onSubmit {
                    Task { await sendOTP() }
                }

            Button {
                Task { await sendOTP() }
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Text("Envoyer le code")
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(email.isEmpty || isLoading)
        }
    }

    // MARK: - OTP Step

    private var otpStep: some View {
        VStack(spacing: 16) {
            Text("Code envoyé à \(email)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // 6-digit code display
            HStack(spacing: 8) {
                ForEach(0..<6, id: \.self) { index in
                    let char = index < otpCode.count
                        ? String(otpCode[otpCode.index(otpCode.startIndex, offsetBy: index)])
                        : ""
                    Text(char)
                        .font(.title.monospaced())
                        .frame(width: 40, height: 52)
                        .background(Color(nsColor: .controlBackgroundColor))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(
                                    index == otpCode.count ? Color.accentColor : Color.secondary.opacity(0.3),
                                    lineWidth: index == otpCode.count ? 2 : 1
                                )
                        )
                }
            }

            // Hidden text field for keyboard input
            TextField("", text: $otpCode)
                .textFieldStyle(.plain)
                .frame(width: 1, height: 1)
                .opacity(0.01)
                .focused($isOTPFocused)
                .onChange(of: otpCode) { _, newValue in
                    let filtered = newValue.filter { $0.isNumber }
                    if filtered != newValue { otpCode = filtered }
                    if otpCode.count > 6 { otpCode = String(otpCode.prefix(6)) }
                    if otpCode.count == 6 {
                        Task { await verifyOTP() }
                    }
                }

            Button {
                Task { await verifyOTP() }
            } label: {
                Group {
                    if isLoading {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Text("Vérifier")
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(otpCode.count < 6 || isLoading)

            HStack {
                Button("Modifier l'email") {
                    withAnimation {
                        step = .enterEmail
                        otpCode = ""
                        errorMessage = nil
                    }
                }
                .buttonStyle(.plain)
                .font(.caption)

                Spacer()

                Button("Renvoyer le code") {
                    Task { await sendOTP() }
                }
                .buttonStyle(.plain)
                .font(.caption)
            }
        }
        .onAppear { isOTPFocused = true }
    }

    // MARK: - Actions

    private func sendOTP() async {
        isLoading = true
        errorMessage = nil

        do {
            try await authProvider.sendOTP(email: email)
            withAnimation {
                step = .enterOTP
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func verifyOTP() async {
        isLoading = true
        errorMessage = nil

        do {
            let result = try await authProvider.verifyOTP(email: email, otp: otpCode)
            print("[SignInView] Auth successful, token: \(result.token.prefix(20))...")

            // Authenticate with Convex
            let convexResult = await convex.loginFromCache()
            switch convexResult {
            case .success:
                appState.isAuthenticated = true
            case .failure(let error):
                errorMessage = "Erreur Convex: \(error.localizedDescription)"
            }
        } catch {
            errorMessage = error.localizedDescription
            otpCode = ""
        }

        isLoading = false
    }
}

#Preview {
    SignInView()
        .environment(AppState())
        .frame(width: 500, height: 600)
}
