import SwiftUI

struct LandingView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showHouseAnimation = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                AppTheme.Gradients.ivory
                    .ignoresSafeArea()

                VStack(spacing: 30) {
                    // Header
                    headerSection
                        .padding(.top, 30)

                    // Houses Display
                    housesSection

                    // Role Selection
                    roleSelectionSection

                    Spacer()
                }
                .padding(.horizontal, 16)
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
            Image("LeagueCrest")
                .resizable()
                .scaledToFit()
                .frame(width: 104, height: 104)
                .shadow(color: AppTheme.Colors.gold.opacity(0.35), radius: 10)

            Text("League of Stars")
                .font(AppTheme.Fonts.display(size: 34, weight: .bold))
                .foregroundColor(AppTheme.Colors.charcoal)

            Text("Brighter Horizon Academy")
                .font(AppTheme.Fonts.body(size: 14))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
        }
    }

    // MARK: - Houses Section
    private var housesSection: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
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
        .padding(.horizontal, 30)
    }

    // MARK: - Role Selection Section
    private var roleSelectionSection: some View {
        VStack(spacing: 20) {
            Text("Sign in as")
                .font(AppTheme.Fonts.body(size: 16, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal)

            let roles = UserRole.allCases.filter { $0 != .admin }
            VStack(spacing: 14) {
                ForEach(roles) { role in
                    RoleCard(role: role)
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3)) {
                                authManager.selectRole(role)
                            }
                        }
                }
            }
            .padding(.horizontal, 20)
        }
    }
}

// MARK: - House Icon Component
struct HouseIcon: View {
    let house: House

    var body: some View {
        VStack(spacing: 6) {
            Image(house.imageName)
                .resizable()
                .scaledToFit()
                .frame(width: 85, height: 85)
                .shadow(color: house.color.opacity(0.3), radius: 6)

            Text(house.shortName)
                .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Role Card Component
struct RoleCard: View {
    let role: UserRole
    @State private var isPressed = false

    var body: some View {
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 14)
                .fill(AppTheme.Gradients.gold)
                .frame(width: 52, height: 52)
                .overlay(
                    Image(systemName: role.icon)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundColor(AppTheme.Colors.charcoal)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(role.rawValue)
                    .font(AppTheme.Fonts.display(size: 16, weight: .semibold))
                    .foregroundColor(AppTheme.Colors.charcoal)

                Text(role.description)
                    .font(AppTheme.Fonts.body(size: 11))
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(AppTheme.Colors.gold)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .regalCardBackground(cornerRadius: 16)
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
