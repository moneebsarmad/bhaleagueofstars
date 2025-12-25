import SwiftUI

struct LoginView: View {
    let role: UserRole
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false

    var body: some View {
        ZStack {
            // Background
            AppTheme.Gradients.night
                .ignoresSafeArea()

            Circle()
                .fill(AppTheme.Colors.royalPurple.opacity(0.35))
                .frame(width: 240, height: 240)
                .blur(radius: 90)
                .offset(x: -120, y: -220)

            Circle()
                .fill(AppTheme.Colors.gold.opacity(0.2))
                .frame(width: 260, height: 260)
                .blur(radius: 110)
                .offset(x: 140, y: 240)

            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    headerSection
                        .padding(.top, 40)

                    // Login Form
                    formSection

                    // Sign In Button
                    signInButton

                    Spacer()
                }
                .padding(.horizontal, 24)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "arrow.left")
                        .foregroundColor(.white.opacity(0.9))
                }
            }
        }
        .toolbarBackground(AppTheme.Colors.nightTop, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {
            Circle()
                .fill(Color.white.opacity(0.08))
                .frame(width: 84, height: 84)
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(AppTheme.Gradients.gold)
                        .frame(width: 56, height: 56)
                        .overlay(
                            Image(systemName: role.icon)
                                .font(.system(size: 26, weight: .semibold))
                                .foregroundColor(AppTheme.Colors.charcoal)
                        )
                )

            Text("\(role.rawValue) Sign In")
                .font(AppTheme.Fonts.display(size: 24, weight: .bold))
                .foregroundColor(.white)

            Text(role.description)
                .font(AppTheme.Fonts.body(size: 14))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Form Section
    private var formSection: some View {
        VStack(spacing: 16) {
            // Name/Email Field
            VStack(alignment: .leading, spacing: 8) {
                Text(fieldLabel)
                    .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                    .foregroundColor(.white.opacity(0.5))

                HStack {
                    Image(systemName: role == .student ? "person.fill" : "envelope.fill")
                        .foregroundColor(.white.opacity(0.6))

                    TextField("", text: $email)
                        .foregroundColor(.white)
                        .autocapitalization(role == .student ? .words : .none)
                        .keyboardType(role == .student ? .default : .emailAddress)
                        .placeholder(when: email.isEmpty) {
                            Text(fieldPlaceholder)
                                .foregroundColor(.white.opacity(0.35))
                        }
                }
                .padding()
                .regalInputBackground(cornerRadius: 14)
            }

            // Password Field (for students only, others can use email only)
            if role == .student {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Password")
                        .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.5))

                    HStack {
                        Image(systemName: "lock.fill")
                            .foregroundColor(.white.opacity(0.6))

                        if showPassword {
                            TextField("", text: $password)
                                .foregroundColor(.white)
                                .placeholder(when: password.isEmpty) {
                                    Text("Enter your password")
                                        .foregroundColor(.white.opacity(0.35))
                                }
                        } else {
                            SecureField("", text: $password)
                                .foregroundColor(.white)
                                .placeholder(when: password.isEmpty) {
                                    Text("Enter your password")
                                        .foregroundColor(.white.opacity(0.35))
                                }
                        }

                        Button {
                            showPassword.toggle()
                        } label: {
                            Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                    .padding()
                    .regalInputBackground(cornerRadius: 14)
                }
            }

            if let error = authManager.errorMessage {
                Text(error)
                    .font(AppTheme.Fonts.body(size: 12, weight: .semibold))
                    .foregroundColor(.red.opacity(0.8))
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - Sign In Button
    private var signInButton: some View {
        Button {
            Task {
                await authManager.signIn(email: email, password: password, role: role)
            }
        } label: {
            HStack {
                if authManager.isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Sign In")
                        .font(AppTheme.Fonts.body(size: 15, weight: .semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                AppTheme.Gradients.royal
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(!isFormValid || authManager.isLoading)
        .opacity(!isFormValid ? 0.6 : 1)
    }

    // MARK: - Helpers

    private var fieldLabel: String {
        switch role {
        case .student:
            return "Full Name"
        default:
            return "Email"
        }
    }

    private var fieldPlaceholder: String {
        switch role {
        case .student:
            return "Enter your full name"
        default:
            return "Enter your email"
        }
    }

    private var isFormValid: Bool {
        if role == .student {
            return !email.isEmpty && !password.isEmpty
        } else {
            return !email.isEmpty
        }
    }
}

// MARK: - Placeholder Extension
extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
        }
    }
}

#Preview {
    NavigationStack {
        LoginView(role: .student)
            .environmentObject(AuthManager())
    }
}
