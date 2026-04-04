//
//  BetterAuthProvider.swift
//  AgentMacOS
//
//  Better Auth authentication provider for Convex integration.
//  Replaces ClerkAuthProvider — communicates with the Better Auth
//  HTTP endpoints on the Convex site URL.
//

import Foundation
import ConvexMobile
import Security

// MARK: - Configuration

/// Better Auth server base URL (Convex site URL)
private let authBaseURL = "https://acrobatic-mole-132.eu-west-1.convex.site/api/auth"

// MARK: - Auth Result

public struct BetterAuthResult: Sendable {
    public let token: String
    public let userId: String?

    public init(token: String, userId: String? = nil) {
        self.token = token
        self.userId = userId
    }
}

// MARK: - Better Auth Provider

/// Authentication provider that integrates Better Auth with Convex.
/// Implements the ConvexMobile AuthProvider protocol.
///
/// Flow:
/// 1. User enters email → sendOTP()
/// 2. User enters OTP code → verifyOTP() → sets session cookie
/// 3. getConvexToken() → calls cross-domain endpoint to get JWT
/// 4. JWT is passed to Convex via extractIdToken()
public class BetterAuthProvider: AuthProvider {
    public typealias T = BetterAuthResult

    /// URLSession configured with cookie storage for session persistence
    private let session: URLSession

    /// Shared cookie storage (persists across app launches via macOS cookie jar)
    private static let cookieStorage = HTTPCookieStorage.shared

    /// Stored callback for pushing fresh tokens to ConvexClientWithAuth
    private var onIdTokenCallback: (@Sendable (String?) -> Void)?

    /// Timer for periodic token refresh (JWT valid 30 min, refresh every 25 min)
    private var refreshTask: Task<Void, Never>?

    public init() {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = BetterAuthProvider.cookieStorage
        config.httpCookieAcceptPolicy = .always
        self.session = URLSession(configuration: config)
    }

    // MARK: - AuthProvider Protocol (ConvexMobile v0.8+)

    /// Login — attempts to get a Convex JWT from an existing session.
    /// Stores the onIdToken callback and starts periodic refresh.
    public func login(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> BetterAuthResult {
        self.onIdTokenCallback = onIdToken
        let result = try await getConvexToken()
        onIdToken(result.token)
        startTokenRefresh()
        return result
    }

    /// Logout — calls Better Auth sign-out endpoint
    public func logout() async throws {
        refreshTask?.cancel()
        refreshTask = nil

        let url = URL(string: "\(authBaseURL)/sign-out")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (_, response) = try await session.data(for: request)
        let httpResponse = response as? HTTPURLResponse
        print("[BetterAuth] Sign out: \(httpResponse?.statusCode ?? 0)")

        // Clear keychain token and notify Convex
        KeychainHelper.delete(key: "convex_jwt")
        onIdTokenCallback?(nil)
    }

    /// Login from cache — try to refresh the Convex JWT using existing session cookies.
    /// Stores the onIdToken callback and starts periodic refresh.
    public func loginFromCache(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> BetterAuthResult {
        self.onIdTokenCallback = onIdToken

        // First try cached JWT from Keychain
        if let cachedToken = KeychainHelper.read(key: "convex_jwt") {
            if !isTokenExpired(cachedToken) {
                onIdToken(cachedToken)
                startTokenRefresh()
                return BetterAuthResult(token: cachedToken)
            }
        }

        // Try to get a fresh token using session cookies
        let result = try await getConvexToken()
        onIdToken(result.token)
        startTokenRefresh()
        return result
    }

    /// Extracts the JWT token from the auth result
    public func extractIdToken(from authResult: BetterAuthResult) -> String {
        return authResult.token
    }

    // MARK: - Token Refresh

    /// Start a background task that refreshes the JWT every 25 minutes
    private func startTokenRefresh() {
        refreshTask?.cancel()
        refreshTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 25 * 60 * 1_000_000_000) // 25 min
                guard !Task.isCancelled else { break }
                do {
                    let result = try await getConvexToken()
                    onIdTokenCallback?(result.token)
                    print("[BetterAuth] Token refreshed")
                } catch {
                    print("[BetterAuth] Token refresh failed: \(error)")
                    onIdTokenCallback?(nil)
                }
            }
        }
    }

    // MARK: - OTP Flow (called from SignInView)

    /// Send OTP to email address
    func sendOTP(email: String) async throws {
        let url = URL(string: "\(authBaseURL)/email-otp/send-verification-otp")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("fr", forHTTPHeaderField: "X-App-Language")

        let body = ["email": email, "type": "sign-in"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw BetterAuthError.networkError("Invalid response")
        }

        if httpResponse.statusCode != 200 {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw BetterAuthError.otpSendFailed("Status \(httpResponse.statusCode): \(errorBody)")
        }

        print("[BetterAuth] OTP sent to \(email)")
    }

    /// Verify OTP code and sign in (establishes session)
    func verifyOTP(email: String, otp: String) async throws -> BetterAuthResult {
        let url = URL(string: "\(authBaseURL)/sign-in/email-otp")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["email": email, "otp": otp]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw BetterAuthError.networkError("Invalid response")
        }

        if httpResponse.statusCode != 200 {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw BetterAuthError.otpVerifyFailed(errorBody)
        }

        print("[BetterAuth] OTP verified, session established")

        // Now get the Convex JWT using the session
        return try await getConvexToken()
    }

    // MARK: - Token Management

    /// Get Convex JWT from the cross-domain token endpoint.
    /// This endpoint reads the Better Auth session cookie and returns a signed JWT.
    private func getConvexToken() async throws -> BetterAuthResult {
        let url = URL(string: "\(authBaseURL)/convex/token")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw BetterAuthError.networkError("Invalid response")
        }

        guard httpResponse.statusCode == 200 else {
            throw BetterAuthError.tokenFetchFailed("Status \(httpResponse.statusCode)")
        }

        // Parse response — expecting { "token": "eyJ..." }
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["token"] as? String else {
            throw BetterAuthError.tokenFetchFailed("Invalid token response")
        }

        // Cache in Keychain
        KeychainHelper.save(key: "convex_jwt", value: token)

        print("[BetterAuth] Got Convex JWT")
        return BetterAuthResult(token: token)
    }

    /// Check if a JWT token is expired (with 2-minute buffer)
    private func isTokenExpired(_ token: String) -> Bool {
        let parts = token.split(separator: ".")
        guard parts.count == 3,
              let payloadData = Data(base64URLEncoded: String(parts[1])),
              let payload = try? JSONSerialization.jsonObject(with: payloadData) as? [String: Any],
              let exp = payload["exp"] as? TimeInterval else {
            return true
        }
        return Date().timeIntervalSince1970 > (exp - 120) // 2 min buffer
    }
}

// MARK: - Keychain Helper

private enum KeychainHelper {
    static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "ga.consulat.agent-macos",
            kSecAttrAccount as String: key,
        ]

        // Delete existing
        SecItemDelete(query as CFDictionary)

        // Add new
        var addQuery = query
        addQuery[kSecValueData as String] = data
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "ga.consulat.agent-macos",
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "ga.consulat.agent-macos",
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Base64URL Decoding

private extension Data {
    init?(base64URLEncoded string: String) {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        self.init(base64Encoded: base64)
    }
}

// MARK: - Errors

public enum BetterAuthError: LocalizedError {
    case noActiveSession
    case tokenFetchFailed(String)
    case otpSendFailed(String)
    case otpVerifyFailed(String)
    case networkError(String)

    public var errorDescription: String? {
        switch self {
        case .noActiveSession:
            return "Aucune session active. Veuillez vous connecter."
        case .tokenFetchFailed(let detail):
            return "Échec de récupération du token: \(detail)"
        case .otpSendFailed(let detail):
            return "Échec d'envoi du code OTP: \(detail)"
        case .otpVerifyFailed(let detail):
            return "Code OTP invalide: \(detail)"
        case .networkError(let detail):
            return "Erreur réseau: \(detail)"
        }
    }
}
