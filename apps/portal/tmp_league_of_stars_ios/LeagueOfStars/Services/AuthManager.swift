import Foundation
import SwiftUI
import GoogleSignIn

@MainActor
class AuthManager: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var selectedRole: UserRole?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let sheetsService = GoogleSheetsService.shared

    // Required scopes for Google Sheets access
    private let scopes = [
        "https://www.googleapis.com/auth/spreadsheets"
    ]

    // MARK: - Google Sign In

    func signInWithGoogle(role: UserRole) async {
        // Prevent multiple sign-in attempts
        guard !isLoading else {
            print("DEBUG: Already loading, ignoring tap")
            return
        }

        isLoading = true
        errorMessage = nil

        print("DEBUG: Starting Google Sign-In...")

        // Small delay to let the UI settle
        try? await Task.sleep(nanoseconds: 100_000_000)

        guard let windowScene = await UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = await windowScene.windows.first,
              let rootViewController = await window.rootViewController else {
            errorMessage = "Cannot find root view controller"
            print("DEBUG: Failed to find root view controller")
            isLoading = false
            return
        }

        // Get the topmost presented view controller
        var topController = rootViewController
        while let presented = topController.presentedViewController {
            topController = presented
        }

        print("DEBUG: Found view controller: \(type(of: topController))")

        do {
            // Configure Google Sign-In
            let config = GIDConfiguration(clientID: AppConfig.googleClientID)
            GIDSignIn.sharedInstance.configuration = config

            print("DEBUG: Calling GIDSignIn.signIn...")

            // Sign in with additional scopes for Sheets access
            let result = try await GIDSignIn.sharedInstance.signIn(
                withPresenting: topController,
                hint: nil,
                additionalScopes: scopes
            )

            print("DEBUG: Sign-in successful!")

            let googleUser = result.user
            let email = googleUser.profile?.email ?? ""
            let name = googleUser.profile?.name ?? "User"

            // Create user based on selected role
            let user = User(
                id: googleUser.userID ?? UUID().uuidString,
                email: email,
                name: name,
                role: role,
                house: nil
            )

            currentUser = user
            isAuthenticated = true
            isLoading = false

        } catch {
            print("DEBUG: Sign-in error: \(error)")
            errorMessage = error.localizedDescription
            isLoading = false
        }
    }

    // MARK: - Demo Sign In (for testing without Google)

    func signIn(email: String, password: String, role: UserRole) async {
        isLoading = true
        errorMessage = nil

        // Simulate network delay
        try? await Task.sleep(nanoseconds: 1_000_000_000)

        // Demo login
        let user = User(
            id: UUID().uuidString,
            email: email,
            name: email.components(separatedBy: "@").first?.capitalized ?? "User",
            role: role,
            house: role == .student ? .abuBakr : nil
        )

        currentUser = user
        isAuthenticated = true
        isLoading = false
    }

    // MARK: - Restore Previous Sign In

    func restorePreviousSignIn() async {
        do {
            let user = try await GIDSignIn.sharedInstance.restorePreviousSignIn()

            // Check if we have the required scopes
            let grantedScopes = user.grantedScopes ?? []
            let hasRequiredScopes = scopes.allSatisfy { grantedScopes.contains($0) }

            if hasRequiredScopes {
                // User is signed in with required scopes
                // We'd need to determine their role from the sheet
                // For now, don't auto-authenticate - let them pick a role
            }
        } catch {
            // No previous sign in or error - that's fine
        }
    }

    // MARK: - Sign Out

    func signOut() {
        GIDSignIn.sharedInstance.signOut()
        currentUser = nil
        isAuthenticated = false
        selectedRole = nil
    }

    // MARK: - Role Selection

    func selectRole(_ role: UserRole) {
        selectedRole = role
    }

    func clearRoleSelection() {
        selectedRole = nil
    }
}
