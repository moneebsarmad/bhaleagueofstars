import Foundation
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var selectedRole: UserRole?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let dataService = SupabaseService.shared

    // UserDefaults keys for persistence
    private let userKey = "savedUser"

    // MARK: - Initialization

    init() {
        // Load saved user on init
        loadSavedUser()
    }

    // MARK: - Persistence

    private func saveUser(_ user: User) {
        if let encoded = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(encoded, forKey: userKey)
        }
    }

    private func loadSavedUser() {
        if let data = UserDefaults.standard.data(forKey: userKey),
           let user = try? JSONDecoder().decode(User.self, from: data) {
            currentUser = user
        }
    }

    private func clearSavedUser() {
        UserDefaults.standard.removeObject(forKey: userKey)
    }

    // MARK: - Sign In

    func signIn(email: String, password: String, role: UserRole) async {
        isLoading = true
        errorMessage = nil

        print("DEBUG: Signing in as \(role.rawValue): '\(email)'")

        do {
            switch role {
            case .student:
                // Verify student credentials against Supabase
                let students = try await dataService.fetchStudents()
                print("DEBUG: Fetched \(students.count) students for verification")

                let nameLower = email.lowercased().trimmingCharacters(in: .whitespaces)
                let matchedStudent = students.first { student in
                    let studentNameLower = student.name.lowercased().trimmingCharacters(in: .whitespaces)
                    return studentNameLower == nameLower && student.password == password
                }

                if let student = matchedStudent {
                    print("DEBUG: Student verified: \(student.name)")

                    let user = User(
                        id: student.id,
                        email: "",
                        name: student.name,
                        role: .student,
                        house: student.house,
                        grade: student.grade,
                        section: student.section,
                        gender: student.gender
                    )

                    currentUser = user
                    isAuthenticated = true
                    saveUser(user)
                } else {
                    print("DEBUG: No matching student found")
                    errorMessage = "Invalid name or password. Please check your credentials."
                }

            case .parent:
                // Parents sign in with email
                let user = User(
                    id: UUID().uuidString,
                    email: email,
                    name: email.components(separatedBy: "@").first?.capitalized ?? "Parent",
                    role: .parent,
                    house: nil
                )

                currentUser = user
                isAuthenticated = true
                saveUser(user)

            case .staff:
                // Verify staff against Supabase
                let staffList = try await dataService.fetchStaff()
                let emailLower = email.lowercased().trimmingCharacters(in: .whitespaces)

                print("DEBUG: Looking for staff email: '\(emailLower)'")
                print("DEBUG: Available staff emails: \(staffList.map { $0.email })")

                let matchedStaff = staffList.first { staff in
                    let staffEmailLower = staff.email.lowercased().trimmingCharacters(in: .whitespaces)
                    print("DEBUG: Comparing '\(emailLower)' with '\(staffEmailLower)'")
                    return staffEmailLower == emailLower
                }

                if let staff = matchedStaff {
                    let user = User(
                        id: UUID().uuidString,
                        email: staff.email,
                        name: staff.name,
                        role: .staff,
                        house: staff.house
                    )

                    currentUser = user
                    isAuthenticated = true
                    saveUser(user)
                } else {
                    // Allow demo login for staff
                    let user = User(
                        id: UUID().uuidString,
                        email: email,
                        name: email.components(separatedBy: "@").first?.capitalized ?? "Staff",
                        role: .staff,
                        house: nil
                    )

                    currentUser = user
                    isAuthenticated = true
                    saveUser(user)
                }

            case .admin:
                print("DEBUG: Admin sign-in is disabled")
                errorMessage = "Admin access is disabled."
            }
        } catch {
            print("DEBUG: Sign-in error: \(error)")
            errorMessage = "Unable to sign in. Please try again."
        }

        isLoading = false
    }

    // MARK: - Restore Previous Sign In

    func restorePreviousSignIn() async {
        print("DEBUG: Attempting to restore previous sign-in...")

        // Simply check if we have a saved user
        if let savedUser = currentUser {
            print("DEBUG: Found saved user: \(savedUser.name), role: \(savedUser.role.rawValue)")
            isAuthenticated = true
            print("DEBUG: Auto-authenticated user: \(savedUser.name)")
        } else {
            print("DEBUG: No saved user found, user will need to log in")
        }
    }

    // MARK: - Sign Out

    func signOut() {
        clearSavedUser()
        currentUser = nil
        isAuthenticated = false
        selectedRole = nil
        print("DEBUG: User signed out and session cleared")
    }

    // MARK: - Role Selection

    func selectRole(_ role: UserRole) {
        selectedRole = role
    }

    func clearRoleSelection() {
        selectedRole = nil
    }
}
