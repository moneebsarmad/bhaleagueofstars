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
            LinearGradient(
                colors: [
                    Color(hex: "1a1a2e"),
                    Color(hex: "16213e")
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 32) {
                    // Header
                    headerSection
                        .padding(.top, 40)

                    // Login Form
                    formSection

                    // Sign In Button
                    signInButton

                    // Google Sign In (placeholder)
                    googleSignInSection

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
                        .foregroundColor(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 16) {
            Circle()
                .fill(Color(hex: role.accentColor).opacity(0.2))
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: role.icon)
                        .font(.system(size: 36))
                        .foregroundColor(Color(hex: role.accentColor))
                )

            Text("\(role.rawValue) Sign In")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text(role.description)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Form Section
    private var formSection: some View {
        VStack(spacing: 16) {
            // Email Field
            VStack(alignment: .leading, spacing: 8) {
                Text("Email")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))

                HStack {
                    Image(systemName: "envelope.fill")
                        .foregroundColor(.white.opacity(0.5))

                    TextField("", text: $email)
                        .foregroundColor(.white)
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                        .placeholder(when: email.isEmpty) {
                            Text("Enter your email")
                                .foregroundColor(.white.opacity(0.3))
                        }
                }
                .padding()
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)
            }

            // Password Field
            VStack(alignment: .leading, spacing: 8) {
                Text("Password")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))

                HStack {
                    Image(systemName: "lock.fill")
                        .foregroundColor(.white.opacity(0.5))

                    if showPassword {
                        TextField("", text: $password)
                            .foregroundColor(.white)
                            .placeholder(when: password.isEmpty) {
                                Text("Enter your password")
                                    .foregroundColor(.white.opacity(0.3))
                            }
                    } else {
                        SecureField("", text: $password)
                            .foregroundColor(.white)
                            .placeholder(when: password.isEmpty) {
                                Text("Enter your password")
                                    .foregroundColor(.white.opacity(0.3))
                            }
                    }

                    Button {
                        showPassword.toggle()
                    } label: {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding()
                .background(Color.white.opacity(0.1))
                .cornerRadius(12)
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
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: [Color(hex: role.accentColor), Color(hex: role.accentColor).opacity(0.8)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .disabled(email.isEmpty || password.isEmpty || authManager.isLoading)
        .opacity(email.isEmpty || password.isEmpty ? 0.6 : 1)
    }

    // MARK: - Google Sign In Section
    private var googleSignInSection: some View {
        VStack(spacing: 16) {
            HStack {
                Rectangle()
                    .fill(Color.white.opacity(0.2))
                    .frame(height: 1)

                Text("or")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))

                Rectangle()
                    .fill(Color.white.opacity(0.2))
                    .frame(height: 1)
            }

            Button {
                Task {
                    await authManager.signInWithGoogle(role: role)
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: "g.circle.fill")
                        .font(.title2)

                    Text("Continue with Google")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white)
                .foregroundColor(.black)
                .cornerRadius(12)
            }
            .disabled(authManager.isLoading)

            Text("Sign in with your Google account to access the spreadsheet")
                .font(.caption2)
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)

            if let error = authManager.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }
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
