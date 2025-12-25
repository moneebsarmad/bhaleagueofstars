import SwiftUI

struct LandingView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showHouseAnimation = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [
                        Color(hex: "1a1a2e"),
                        Color(hex: "16213e")
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    headerSection
                        .padding(.top, 60)

                    Spacer()

                    // Houses Display
                    housesSection
                        .padding(.vertical, 30)

                    Spacer()

                    // Role Selection
                    roleSelectionSection
                        .padding(.bottom, 40)
                }
            }
            .navigationDestination(item: $authManager.selectedRole) { role in
                LoginView(role: role)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.0)) {
                showHouseAnimation = true
            }
        }
    }

    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 12) {
            Image(systemName: "star.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.yellow, .orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: .yellow.opacity(0.5), radius: 10)

            Text("League of Stars")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Text("BHA House System")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
        }
    }

    // MARK: - Houses Section
    private var housesSection: some View {
        VStack(spacing: 16) {
            Text("Our Houses")
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))

            HStack(spacing: 16) {
                ForEach(House.allCases) { house in
                    HouseIcon(house: house)
                        .scaleEffect(showHouseAnimation ? 1 : 0.5)
                        .opacity(showHouseAnimation ? 1 : 0)
                        .animation(
                            .spring(response: 0.6, dampingFraction: 0.7)
                            .delay(Double(House.allCases.firstIndex(of: house) ?? 0) * 0.1),
                            value: showHouseAnimation
                        )
                }
            }
        }
    }

    // MARK: - Role Selection Section
    private var roleSelectionSection: some View {
        VStack(spacing: 20) {
            Text("Sign in as")
                .font(.headline)
                .foregroundColor(.white.opacity(0.8))

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(UserRole.allCases) { role in
                    RoleCard(role: role)
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3)) {
                                authManager.selectRole(role)
                            }
                        }
                }
            }
            .padding(.horizontal, 24)
        }
    }
}

// MARK: - House Icon Component
struct HouseIcon: View {
    let house: House

    var body: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(house.color)
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: house.icon)
                        .font(.title2)
                        .foregroundColor(.white)
                )
                .shadow(color: house.color.opacity(0.5), radius: 8)

            Text(house.shortName)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(.white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(width: 70)
    }
}

// MARK: - Role Card Component
struct RoleCard: View {
    let role: UserRole
    @State private var isPressed = false

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: role.icon)
                .font(.system(size: 28))
                .foregroundColor(Color(hex: role.accentColor))

            Text(role.rawValue)
                .font(.headline)
                .foregroundColor(.white)

            Text(role.description)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 120)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(hex: role.accentColor).opacity(0.3), lineWidth: 1)
                )
        )
        .scaleEffect(isPressed ? 0.95 : 1)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            withAnimation(.easeInOut(duration: 0.1)) {
                isPressed = pressing
            }
        }, perform: {})
    }
}

#Preview {
    LandingView()
        .environmentObject(AuthManager())
}
