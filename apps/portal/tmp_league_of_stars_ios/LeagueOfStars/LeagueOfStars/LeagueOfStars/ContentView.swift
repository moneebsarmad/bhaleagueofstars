import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var isRestoring = true

    var body: some View {
        Group {
            if isRestoring {
                // Show loading while restoring session
                ZStack {
                    AppTheme.Colors.background
                        .ignoresSafeArea()

                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading...")
                            .font(AppTheme.Fonts.body(size: 14))
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }
                }
            } else if authManager.isAuthenticated {
                DashboardView()
            } else {
                LandingView()
            }
        }
        .animation(.easeInOut, value: authManager.isAuthenticated)
        .animation(.easeInOut, value: isRestoring)
        .task {
            // Try to restore previous sign-in on app launch
            await authManager.restorePreviousSignIn()
            isRestoring = false
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
}
