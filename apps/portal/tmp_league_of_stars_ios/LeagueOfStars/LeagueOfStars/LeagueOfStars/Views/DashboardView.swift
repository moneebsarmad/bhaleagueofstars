import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            // Leaderboard - Available to all
            LeaderboardView()
                .tabItem {
                    Label("Leaderboard", systemImage: "trophy.fill")
                }
                .tag(0)

            // My House - Students only
            if authManager.currentUser?.role == .student {
                StudentHouseDashboard()
                    .tabItem {
                        Label("My House", systemImage: "house.fill")
                    }
                    .tag(1)
            }

            // My Profile / Points - Available to all
            profileTab
                .tabItem {
                    Label(profileTabTitle, systemImage: profileTabIcon)
                }
                .tag(2)

            // Add Points - Staff only
            if authManager.currentUser?.role == .staff {
                AddPointsView()
                    .tabItem {
                        Label("Add Points", systemImage: "plus.circle.fill")
                    }
                    .tag(3)
            }

            // Settings
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(4)
        }
        .tint(accentColor)
    }

    private var canAddPoints: Bool {
        guard let role = authManager.currentUser?.role else { return false }
        return role == .staff
    }

    private var profileTabTitle: String {
        switch authManager.currentUser?.role {
        case .student:
            return "My Points"
        case .parent:
            return "My Child"
        default:
            return "Students"
        }
    }

    private var profileTabIcon: String {
        switch authManager.currentUser?.role {
        case .student:
            return "star.fill"
        case .parent:
            return "figure.2.and.child.holdinghands"
        default:
            return "person.3.fill"
        }
    }

    private var accentColor: Color {
        guard let role = authManager.currentUser?.role else { return .blue }
        return Color(hex: role.accentColor)
    }

    @ViewBuilder
    private var profileTab: some View {
        switch authManager.currentUser?.role {
        case .student:
            StudentProfileView()
        case .parent:
            ParentChildView()
        case .staff:
            StudentListView()
        case .admin, .none:
            EmptyView()
        }
    }
}

// MARK: - Leaderboard View

struct LeaderboardView: View {
    @State private var totals: [House: Int] = [:]
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // House Cards
                        ForEach(rankedHouses, id: \.house.id) { item in
                            HouseLeaderboardCard(house: item.house, rank: item.rank, points: item.points)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Leaderboard")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
        }
        .task {
            await loadHouseTotals()
        }
    }

    private var rankedHouses: [(house: House, points: Int, rank: Int)] {
        let base = House.allCases.map { house in
            (house: house, points: totals[house] ?? 0)
        }
        let sorted = base.sorted { lhs, rhs in
            if lhs.points == rhs.points { return lhs.house.rawValue < rhs.house.rawValue }
            return lhs.points > rhs.points
        }
        return sorted.enumerated().map { index, item in
            (house: item.house, points: item.points, rank: index + 1)
        }
    }

    private func loadHouseTotals() async {
        isLoading = true
        defer { isLoading = false }

        do {
            var result: [House: Int] = [:]
            House.allCases.forEach { result[$0] = 0 }
            let standings = try await SupabaseService.shared.fetchHouseStandings()
            for item in standings {
                result[item.house] = item.points
            }
            totals = result
        } catch {
            print("DEBUG: Leaderboard load error: \(error)")
        }
    }
}

struct HouseLeaderboardCard: View {
    let house: House
    let rank: Int
    let points: Int

    var body: some View {
        HStack(spacing: 16) {
            // Rank
            Text("#\(rank)")
                .font(AppTheme.Fonts.display(size: 20, weight: .bold))
                .foregroundColor(rankColor)
                .frame(width: 50)

            // House Icon
            Image(house.imageName)
                .resizable()
                .scaledToFit()
                .frame(width: 50, height: 50)
                .shadow(color: house.color.opacity(0.3), radius: 6)

            // House Name
            VStack(alignment: .leading, spacing: 4) {
                Text(house.shortName)
                    .font(AppTheme.Fonts.display(size: 16, weight: .semibold))
                    .foregroundColor(AppTheme.Colors.charcoal)

                Text(house.tagline)
                    .font(AppTheme.Fonts.body(size: 11))
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
            }

            Spacer()

            // Points
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(points)")
                    .font(AppTheme.Fonts.display(size: 18, weight: .bold))
                    .foregroundColor(AppTheme.Colors.charcoal)

                Text("points")
                    .font(AppTheme.Fonts.body(size: 11))
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(house.color.opacity(0.2), lineWidth: 1)
        )
    }

    private var rankColor: Color {
        switch rank {
        case 1: return .yellow
        case 2: return Color(hex: "C0C0C0")
        case 3: return Color(hex: "CD7F32")
        default: return AppTheme.Colors.charcoal.opacity(0.6)
        }
    }
}

// MARK: - Student Profile View

struct StudentProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var meritEntries: [MeritEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    // Calculate total points
    var totalPoints: Int {
        meritEntries.reduce(0) { $0 + $1.points }
    }

    // Group points by R category
    var pointsByR: [(r: String, points: Int, icon: String)] {
        return MeritR.allCases.map { meritR in
            let entries = meritEntries.filter { entry in
                entry.r.lowercased().contains(meritR.rawValue.lowercased())
            }
            let total = entries.reduce(0) { $0 + $1.points }
            return (r: meritR.rawValue, points: total, icon: meritR.icon)
        }
    }

    var houseColor: Color {
        authManager.currentUser?.house?.color ?? .blue
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading your points...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Profile Header Card
                            profileHeaderCard

                            // Total Points Card
                            totalPointsCard

                            // Points by R Breakdown
                            pointsBreakdownCard

                            // Recent Activity
                            if !meritEntries.isEmpty {
                                recentActivityCard
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        await loadMeritEntries()
                    }
                }
            }
            .navigationTitle("My Points")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .task {
                await loadMeritEntries()
            }
        }
    }

    // MARK: - Profile Header Card
    private var profileHeaderCard: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(houseColor.opacity(0.2))
                .frame(width: 70, height: 70)
                .overlay(
                    Text(initials)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(houseColor)
                )

            VStack(alignment: .leading, spacing: 6) {
                Text(authManager.currentUser?.name ?? "Student")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(AppTheme.Colors.charcoal)

                HStack(spacing: 12) {
                    if let grade = authManager.currentUser?.grade,
                       let section = authManager.currentUser?.section {
                        Label("Grade \(grade)\(section)", systemImage: "graduationcap.fill")
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }

                    if let house = authManager.currentUser?.house {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(house.color)
                                .frame(width: 10, height: 10)
                            Text(house.rawValue)
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }
                    }
                }
            }

            Spacer()
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Total Points Card
    private var totalPointsCard: some View {
        VStack(spacing: 8) {
            Text("Total Points")
                .font(.subheadline)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

            Text("\(totalPoints)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(houseColor)

            Text("points earned")
                .font(.caption)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Points Breakdown Card
    private var pointsBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Points by Category")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            ForEach(pointsByR, id: \.r) { item in
                HStack {
                    Image(systemName: item.icon)
                        .font(.title3)
                        .foregroundColor(colorForR(item.r))
                        .frame(width: 32)

                    Text(item.r)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.Colors.charcoal)

                    Spacer()

                    Text("\(item.points)")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(colorForR(item.r))
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(colorForR(item.r).opacity(0.1))
                )
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Recent Activity Card
    private var recentActivityCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Activity")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            ForEach(meritEntries.prefix(5)) { entry in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.subcategory)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(AppTheme.Colors.charcoal)

                        Text(entry.r.components(separatedBy: " – ").first ?? entry.r)
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }

                    Spacer()

                    Text("+\(entry.points)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.Colors.gold)
                }
                .padding(.vertical, 8)

                if entry.id != meritEntries.prefix(5).last?.id {
                    Divider()
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Helper Functions
    private var initials: String {
        let name = authManager.currentUser?.name ?? ""
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    private func colorForR(_ r: String) -> Color {
        switch r {
        case "Respect": return .blue
        case "Responsibility": return .orange
        case "Righteousness": return .purple
        default: return .gray
        }
    }

    private func loadMeritEntries() async {
        isLoading = true
        errorMessage = nil

        do {
            let allEntries = try await SupabaseService.shared.fetchMeritLog()
            let studentName = authManager.currentUser?.name ?? ""
            let studentNameLower = studentName.lowercased().trimmingCharacters(in: .whitespaces)

            meritEntries = allEntries.filter {
                $0.studentName.lowercased().trimmingCharacters(in: .whitespaces) == studentNameLower
            }.sorted { $0.dateOfEvent > $1.dateOfEvent }

            print("DEBUG: Loaded \(meritEntries.count) merit entries for \(studentName)")
        } catch {
            print("DEBUG: Error loading merit entries: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

struct StatBox: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Text(value)
                .font(AppTheme.Fonts.display(size: 20, weight: .bold))
                .foregroundColor(color)

            Text(title)
                .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding()
        .regalCardBackground(cornerRadius: 12)
    }
}

// MARK: - Parent Child View

struct ParentChildView: View {
    @State private var linkedChildren: [Student] = []
    @State private var selectedChildIndex: Int = 0
    @State private var showAddChild = false
    @State private var allStudents: [Student] = []
    @State private var meritEntries: [MeritEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    // UserDefaults key for storing linked children names
    private let linkedChildrenKey = "linkedChildrenNames"

    var selectedChild: Student? {
        guard !linkedChildren.isEmpty, selectedChildIndex < linkedChildren.count else { return nil }
        return linkedChildren[selectedChildIndex]
    }

    // Get merit entries for selected child
    var childMeritEntries: [MeritEntry] {
        guard let child = selectedChild else { return [] }
        let childNameLower = child.name.lowercased().trimmingCharacters(in: .whitespaces)
        return meritEntries.filter {
            $0.studentName.lowercased().trimmingCharacters(in: .whitespaces) == childNameLower
        }.sorted { $0.dateOfEvent > $1.dateOfEvent }
    }

    // Total points for selected child
    var childTotalPoints: Int {
        childMeritEntries.reduce(0) { $0 + $1.points }
    }

    // Points by R category
    var pointsByR: [(r: String, points: Int, icon: String)] {
        MeritR.allCases.map { meritR in
            let entries = childMeritEntries.filter { entry in
                entry.r.lowercased().contains(meritR.rawValue.lowercased())
            }
            let total = entries.reduce(0) { $0 + $1.points }
            return (r: meritR.rawValue, points: total, icon: meritR.icon)
        }
    }

    // House points and rank
    var housePoints: [(house: House, points: Int)] {
        House.allCases.map { house in
            let points = meritEntries
                .filter { $0.house == house }
                .reduce(0) { $0 + $1.points }
            return (house: house, points: points)
        }.sorted { $0.points > $1.points }
    }

    var childHouseRank: Int {
        guard let child = selectedChild else { return 0 }
        if let index = housePoints.firstIndex(where: { $0.house == child.house }) {
            return index + 1
        }
        return 0
    }

    var childHousePoints: Int {
        guard let child = selectedChild else { return 0 }
        return housePoints.first(where: { $0.house == child.house })?.points ?? 0
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else if linkedChildren.isEmpty {
                    // No children linked - show add child prompt
                    noChildrenView
                } else {
                    // Show child dashboard
                    ScrollView {
                        VStack(spacing: 20) {
                            // Child Selector (if multiple children)
                            if linkedChildren.count > 1 {
                                childSelectorView
                            }

                            // Child Profile Card
                            childProfileCard

                            // Points Summary
                            pointsSummaryCard

                            // House Status
                            houseStatusCard

                            // Points Breakdown
                            pointsBreakdownCard

                            // Recent Activity
                            recentActivityCard
                        }
                        .padding()
                    }
                    .refreshable {
                        await loadData()
                    }
                }
            }
            .navigationTitle("My Child")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddChild = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(Color(hex: "7B68EE"))
                    }
                }
            }
            .sheet(isPresented: $showAddChild) {
                AddChildSheet(
                    allStudents: allStudents,
                    linkedChildren: $linkedChildren,
                    onChildAdded: { saveLinkedChildren() }
                )
            }
            .task {
                await loadData()
            }
        }
    }

    // MARK: - No Children View
    private var noChildrenView: some View {
        VStack(spacing: 24) {
            Image(systemName: "figure.2.and.child.holdinghands")
                .font(.system(size: 60))
                .foregroundColor(Color(hex: "7B68EE").opacity(0.6))

            VStack(spacing: 8) {
                Text("No Child Linked")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(AppTheme.Colors.charcoal)

                Text("Link your child to view their points and progress")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    .multilineTextAlignment(.center)
            }

            Button {
                showAddChild = true
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Child")
                }
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 14)
                .background(Color(hex: "7B68EE"))
                .cornerRadius(12)
            }
        }
        .padding()
    }

    // MARK: - Child Selector View
    private var childSelectorView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(linkedChildren.enumerated()), id: \.element.id) { index, child in
                    Button {
                        withAnimation {
                            selectedChildIndex = index
                        }
                    } label: {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(child.house.color.opacity(0.3))
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Text(child.initials)
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(child.house.color)
                                )

                            Text(child.name.components(separatedBy: " ").first ?? child.name)
                                .font(.subheadline)
                                .fontWeight(selectedChildIndex == index ? .bold : .medium)
                                .foregroundColor(selectedChildIndex == index ? AppTheme.Colors.charcoal : AppTheme.Colors.charcoal.opacity(0.6))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(selectedChildIndex == index ? child.house.color.opacity(0.2) : Color.white)
                                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                        )
                    }
                }
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Child Profile Card
    private var childProfileCard: some View {
        HStack(spacing: 16) {
            if let child = selectedChild {
                Circle()
                    .fill(child.house.color.opacity(0.2))
                    .frame(width: 70, height: 70)
                    .overlay(
                        Text(child.initials)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(child.house.color)
                    )

                VStack(alignment: .leading, spacing: 6) {
                    Text(child.name)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.Colors.charcoal)

                    HStack(spacing: 12) {
                        Label("Grade \(child.grade)\(child.section)", systemImage: "graduationcap.fill")
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                        HStack(spacing: 4) {
                            Circle()
                                .fill(child.house.color)
                                .frame(width: 10, height: 10)
                            Text(child.house.rawValue)
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }
                    }
                }

                Spacer()

                // Remove child button
                Menu {
                    Button(role: .destructive) {
                        removeChild(at: selectedChildIndex)
                    } label: {
                        Label("Remove Child", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Points Summary Card
    private var pointsSummaryCard: some View {
        VStack(spacing: 8) {
            Text("Total Points")
                .font(.subheadline)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

            Text("\(childTotalPoints)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(selectedChild?.house.color ?? .blue)

            Text("points earned")
                .font(.caption)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - House Status Card
    private var houseStatusCard: some View {
        HStack(spacing: 16) {
            if let child = selectedChild {
                Image(child.house.imageName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 50, height: 50)
                    .shadow(color: child.house.color.opacity(0.3), radius: 6)

                VStack(alignment: .leading, spacing: 4) {
                    Text(child.house.rawValue)
                        .font(.headline)
                        .foregroundColor(AppTheme.Colors.charcoal)

                    HStack(spacing: 8) {
                        Text(rankText)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(rankColor)

                        Text("•")
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                        Text("\(childHousePoints) pts")
                            .font(.subheadline)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }
                }

                Spacer()

                // Rank badge
                ZStack {
                    Circle()
                        .fill(rankColor.opacity(0.15))
                        .frame(width: 44, height: 44)

                    Image(systemName: rankIcon)
                        .font(.title3)
                        .foregroundColor(rankColor)
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Points Breakdown Card
    private var pointsBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Points by Category")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            ForEach(pointsByR, id: \.r) { item in
                HStack {
                    Image(systemName: item.icon)
                        .font(.title3)
                        .foregroundColor(colorForR(item.r))
                        .frame(width: 32)

                    Text(item.r)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.Colors.charcoal)

                    Spacer()

                    Text("\(item.points)")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(colorForR(item.r))
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(colorForR(item.r).opacity(0.1))
                )
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Recent Activity Card
    private var recentActivityCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Activity")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            if childMeritEntries.isEmpty {
                Text("No activity yet")
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(Array(childMeritEntries.prefix(5).enumerated()), id: \.element.id) { index, entry in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.subcategory)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(AppTheme.Colors.charcoal)

                            Text(entry.r.components(separatedBy: " – ").first ?? entry.r)
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text("+\(entry.points)")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(AppTheme.Colors.gold)

                            Text(formatDate(entry.dateOfEvent))
                                .font(.caption2)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }
                    }
                    .padding(.vertical, 8)

                    if index < min(childMeritEntries.count - 1, 4) {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Helper Properties
    private var rankIcon: String {
        switch childHouseRank {
        case 1: return "crown.fill"
        case 2: return "medal.fill"
        case 3: return "medal.fill"
        default: return "number"
        }
    }

    private var rankColor: Color {
        switch childHouseRank {
        case 1: return .yellow
        case 2: return Color(hex: "C0C0C0")
        case 3: return Color(hex: "CD7F32")
        default: return .gray
        }
    }

    private var rankText: String {
        switch childHouseRank {
        case 1: return "1st Place"
        case 2: return "2nd Place"
        case 3: return "3rd Place"
        case 4: return "4th Place"
        default: return "\(childHouseRank)th"
        }
    }

    private func colorForR(_ r: String) -> Color {
        switch r {
        case "Respect": return .blue
        case "Responsibility": return .orange
        case "Righteousness": return .purple
        default: return .gray
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    // MARK: - Data Management
    private func loadData() async {
        isLoading = true

        do {
            async let studentsTask = SupabaseService.shared.fetchStudents()
            async let entriesTask = SupabaseService.shared.fetchMeritLog()

            let (students, entries) = try await (studentsTask, entriesTask)
            allStudents = students
            meritEntries = entries

            // Load linked children from UserDefaults
            loadLinkedChildren()

            print("DEBUG: Parent view - Loaded \(students.count) students and \(entries.count) merit entries")
        } catch {
            print("DEBUG: Parent view error: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func loadLinkedChildren() {
        if let savedNames = UserDefaults.standard.array(forKey: linkedChildrenKey) as? [String] {
            linkedChildren = savedNames.compactMap { name in
                allStudents.first { $0.name.lowercased() == name.lowercased() }
            }
            // Adjust selected index if needed
            if selectedChildIndex >= linkedChildren.count {
                selectedChildIndex = max(0, linkedChildren.count - 1)
            }
        }
    }

    private func saveLinkedChildren() {
        let names = linkedChildren.map { $0.name }
        UserDefaults.standard.set(names, forKey: linkedChildrenKey)
    }

    private func removeChild(at index: Int) {
        guard index < linkedChildren.count else { return }
        linkedChildren.remove(at: index)
        if selectedChildIndex >= linkedChildren.count {
            selectedChildIndex = max(0, linkedChildren.count - 1)
        }
        saveLinkedChildren()
    }
}

// MARK: - Add Child Sheet (Secure with Parent Code)
struct AddChildSheet: View {
    let allStudents: [Student]
    @Binding var linkedChildren: [Student]
    let onChildAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var childName = ""
    @State private var parentCode = ""
    @State private var errorMessage: String?
    @State private var isVerifying = false
    @State private var matchedStudent: Student?

    // Check if we have a potential match based on name
    var potentialMatches: [Student] {
        guard !childName.isEmpty else { return [] }
        let searchTerm = childName.lowercased().trimmingCharacters(in: .whitespaces)
        return allStudents.filter { student in
            let studentName = student.name.lowercased()
            return studentName.contains(searchTerm) &&
                   !linkedChildren.contains { $0.name.lowercased() == student.name.lowercased() }
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 12) {
                            Image(systemName: "lock.shield.fill")
                                .font(.system(size: 50))
                                .foregroundColor(Color(hex: "7B68EE"))

                            Text("Secure Child Linking")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(AppTheme.Colors.charcoal)

                            Text("Enter your child's name and the parent verification code provided by the school")
                                .font(.subheadline)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 20)

                        // Form
                        VStack(spacing: 16) {
                            // Child Name Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Child's Full Name")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                                HStack {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                                    TextField("Enter child's name", text: $childName)
                                        .foregroundColor(AppTheme.Colors.charcoal)
                                        .autocapitalization(.words)
                                }
                                .padding()
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                            }

                            // Show potential matches
                            if !potentialMatches.isEmpty && matchedStudent == nil {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Select your child:")
                                        .font(.caption)
                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                                    ForEach(potentialMatches.prefix(5)) { student in
                                        Button {
                                            matchedStudent = student
                                            childName = student.name
                                        } label: {
                                            HStack(spacing: 12) {
                                                Circle()
                                                    .fill(student.house.color.opacity(0.2))
                                                    .frame(width: 36, height: 36)
                                                    .overlay(
                                                        Text(student.initials)
                                                            .font(.caption2)
                                                            .fontWeight(.bold)
                                                            .foregroundColor(student.house.color)
                                                    )

                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(student.name)
                                                        .font(.subheadline)
                                                        .fontWeight(.medium)
                                                        .foregroundColor(AppTheme.Colors.charcoal)

                                                    Text("Grade \(student.grade)\(student.section) • \(student.house.shortName)")
                                                        .font(.caption)
                                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                                }

                                                Spacer()

                                                Image(systemName: "chevron.right")
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                            }
                                            .padding()
                                            .background(Color.white)
                                            .cornerRadius(12)
                                        }
                                    }
                                }
                            }

                            // Selected child indicator
                            if let student = matchedStudent {
                                HStack(spacing: 12) {
                                    Circle()
                                        .fill(student.house.color.opacity(0.2))
                                        .frame(width: 44, height: 44)
                                        .overlay(
                                            Text(student.initials)
                                                .font(.caption)
                                                .fontWeight(.bold)
                                                .foregroundColor(student.house.color)
                                        )

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(student.name)
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(AppTheme.Colors.charcoal)

                                        Text("Grade \(student.grade)\(student.section) • \(student.house.rawValue)")
                                            .font(.caption)
                                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                    }

                                    Spacer()

                                    Button {
                                        matchedStudent = nil
                                        childName = ""
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                    }
                                }
                                .padding()
                                .background(student.house.color.opacity(0.1))
                                .cornerRadius(12)
                            }

                            // Parent Code Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Parent Verification Code")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                                HStack {
                                    Image(systemName: "key.fill")
                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                                    SecureField("Enter parent code", text: $parentCode)
                                        .foregroundColor(AppTheme.Colors.charcoal)
                                        .textInputAutocapitalization(.characters)
                                }
                                .padding()
                                .background(Color.white)
                                .cornerRadius(12)
                                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                            }
                        }
                        .padding(.horizontal)

                        // Error Message
                        if let error = errorMessage {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text(error)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }

                        // Verify Button
                        Button {
                            verifyAndAddChild()
                        } label: {
                            HStack {
                                if isVerifying {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Image(systemName: "checkmark.shield.fill")
                                    Text("Verify & Link Child")
                                }
                            }
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                (matchedStudent != nil && !parentCode.isEmpty)
                                    ? Color(hex: "7B68EE")
                                    : Color.gray
                            )
                            .cornerRadius(12)
                        }
                        .disabled(matchedStudent == nil || parentCode.isEmpty || isVerifying)
                        .padding(.horizontal)

                        // Help text
                        VStack(spacing: 8) {
                            Text("Don't have a parent code?")
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                            Text("Contact your school administration to receive your unique parent verification code.")
                                .font(.caption2)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 20)
                    }
                }
            }
            .navigationTitle("Add Child")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func verifyAndAddChild() {
        guard let student = matchedStudent else {
            errorMessage = "Please select your child from the list"
            return
        }

        isVerifying = true
        errorMessage = nil

        // Verify the parent code matches
        let enteredCode = parentCode.trimmingCharacters(in: .whitespaces).uppercased()
        let storedCode = student.parentCode.trimmingCharacters(in: .whitespaces).uppercased()

        // Simulate a brief delay for security feel
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if storedCode.isEmpty {
                errorMessage = "No parent code is set for this student. Please contact the school."
                isVerifying = false
            } else if enteredCode == storedCode {
                // Success - add the child
                linkedChildren.append(student)
                onChildAdded()
                dismiss()
            } else {
                errorMessage = "Invalid parent code. Please check and try again."
                isVerifying = false
            }
        }
    }
}

// MARK: - Student List View

struct StudentListView: View {
    @State private var searchText = ""
    @State private var selectedGrade: String? = nil
    @State private var students: [Student] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    // Dynamically get all unique grades from student data
    var grades: [String] {
        let uniqueGrades = Set(students.map { $0.grade })
        return uniqueGrades.sorted {
            (Int($0) ?? 0) < (Int($1) ?? 0)
        }
    }

    var filteredStudents: [Student] {
        var result = students

        if let grade = selectedGrade {
            result = result.filter { $0.grade == grade }
        }

        if !searchText.isEmpty {
            result = result.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        // Sort by grade (numerically) then by section (alphabetically) then by name
        result.sort { student1, student2 in
            let grade1 = Int(student1.grade) ?? 0
            let grade2 = Int(student2.grade) ?? 0

            if grade1 != grade2 {
                return grade1 < grade2
            }

            if student1.section != student2.section {
                return student1.section < student2.section
            }

            return student1.name < student2.name
        }

        return result
    }

    // Group students by class (grade + section) for section headers
    var groupedStudents: [(classLabel: String, students: [Student])] {
        let grouped = Dictionary(grouping: filteredStudents) { student in
            "\(student.grade)\(student.section)"
        }

        return grouped.keys.sorted { key1, key2 in
            // Extract grade and section for proper sorting
            let grade1 = Int(key1.dropLast()) ?? 0
            let section1 = String(key1.suffix(1))
            let grade2 = Int(key2.dropLast()) ?? 0
            let section2 = String(key2.suffix(1))

            if grade1 != grade2 {
                return grade1 < grade2
            }
            return section1 < section2
        }.map { key in
            (classLabel: key, students: grouped[key] ?? [])
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading students...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundColor(.orange)
                        Text(error)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                            .multilineTextAlignment(.center)
                        Button("Retry") {
                            Task { await loadStudents() }
                        }
                        .foregroundColor(AppTheme.Colors.gold)
                    }
                    .padding()
                } else {
                    VStack(spacing: 0) {
                        // Grade Filter
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                FilterChip(title: "All", isSelected: selectedGrade == nil) {
                                    selectedGrade = nil
                                }
                                ForEach(grades, id: \.self) { grade in
                                    FilterChip(title: "Grade \(grade)", isSelected: selectedGrade == grade) {
                                        selectedGrade = grade
                                    }
                                }
                            }
                            .padding(.horizontal)
                            .padding(.vertical, 12)
                        }

                        // Student List with Section Headers
                        ScrollView {
                            LazyVStack(spacing: 12, pinnedViews: [.sectionHeaders]) {
                                ForEach(groupedStudents, id: \.classLabel) { group in
                                    Section {
                                        ForEach(group.students) { student in
                                            NavigationLink(destination: StudentDetailView(student: student)) {
                                                StudentRow(student: student)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                        }
                                    } header: {
                                        HStack {
                                            Text("Class \(group.classLabel)")
                                                .font(.headline)
                                                .fontWeight(.bold)
                                                .foregroundColor(AppTheme.Colors.charcoal)
                                            Spacer()
                                            Text("\(group.students.count) students")
                                                .font(.caption)
                                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                        }
                                        .padding(.horizontal)
                                        .padding(.vertical, 8)
                                        .background(AppTheme.Colors.background)
                                    }
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle("Students (\(students.count))")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .searchable(text: $searchText, prompt: "Search students...")
            .task {
                await loadStudents()
            }
            .refreshable {
                await loadStudents()
            }
        }
    }

    private func loadStudents() async {
        isLoading = true
        errorMessage = nil

        do {
            students = try await SupabaseService.shared.fetchStudents()
            print("DEBUG: Loaded \(students.count) students from Supabase")
        } catch {
            print("DEBUG: Error loading students: \(error)")
            errorMessage = error.localizedDescription
            // Fallback to sample data if fetch fails
            students = Student.sampleStudents
        }

        isLoading = false
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .foregroundColor(isSelected ? AppTheme.Colors.charcoal : AppTheme.Colors.charcoal.opacity(0.6))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? AppTheme.Colors.gold.opacity(0.25) : AppTheme.Colors.ivory)
                        .overlay(
                            Capsule()
                                .stroke(isSelected ? AppTheme.Colors.gold.opacity(0.6) : AppTheme.Colors.gold.opacity(0.2), lineWidth: 1)
                        )
                )
        }
    }
}

struct StudentRow: View {
    let student: Student

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(student.house.color.opacity(0.3))
                .frame(width: 44, height: 44)
                .overlay(
                    Text(student.initials)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(student.house.color)
                )

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(student.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(AppTheme.Colors.charcoal)

                HStack(spacing: 8) {
                    Text("Grade \(student.grade)\(student.section)")
                        .font(.caption)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                    Circle()
                        .fill(student.house.color)
                        .frame(width: 8, height: 8)

                    Text(student.house.shortName)
                        .font(.caption)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.5))
        }
        .padding()
        .regalCardBackground(cornerRadius: 12)
    }
}

// MARK: - Student Detail View

struct StudentDetailView: View {
    let student: Student
    @State private var meritEntries: [MeritEntry] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    // Calculate total points
    var totalPoints: Int {
        meritEntries.reduce(0) { $0 + $1.points }
    }

    // Group points by R category
    var pointsByR: [(r: String, points: Int, icon: String)] {
        return MeritR.allCases.map { meritR in
            // Match entries where the R field contains the category name (e.g., "Responsibility – Taking Ownership...")
            let entries = meritEntries.filter { entry in
                entry.r.lowercased().contains(meritR.rawValue.lowercased())
            }
            let total = entries.reduce(0) { $0 + $1.points }
            return (r: meritR.rawValue, points: total, icon: meritR.icon)
        }
    }

    var body: some View {
        ZStack {
            AppTheme.Colors.background.ignoresSafeArea()

            if isLoading {
                ProgressView("Loading points...")
                    .foregroundColor(AppTheme.Colors.charcoal)
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(error)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        .multilineTextAlignment(.center)
                    Button("Retry") {
                        Task { await loadMeritEntries() }
                    }
                    .foregroundColor(AppTheme.Colors.gold)
                }
                .padding()
            } else {
                ScrollView {
                    VStack(spacing: 24) {
                        // Student Header Card
                        studentHeaderCard

                        // Total Points Card
                        totalPointsCard

                        // Points by R Breakdown
                        pointsBreakdownCard

                        // Recent Activity (if any)
                        if !meritEntries.isEmpty {
                            recentActivityCard
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(student.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarColorScheme(.light, for: .navigationBar)
        .task {
            await loadMeritEntries()
        }
    }

    // MARK: - Student Header Card
    private var studentHeaderCard: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(student.house.color.opacity(0.2))
                .frame(width: 70, height: 70)
                .overlay(
                    Text(student.initials)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(student.house.color)
                )

            VStack(alignment: .leading, spacing: 6) {
                Text(student.name)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(AppTheme.Colors.charcoal)

                HStack(spacing: 12) {
                    Label("Grade \(student.grade)\(student.section)", systemImage: "graduationcap.fill")
                        .font(.caption)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                    HStack(spacing: 4) {
                        Circle()
                            .fill(student.house.color)
                            .frame(width: 10, height: 10)
                        Text(student.house.rawValue)
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }
                }
            }

            Spacer()
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Total Points Card
    private var totalPointsCard: some View {
        VStack(spacing: 8) {
            Text("Total Points")
                .font(.subheadline)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

            Text("\(totalPoints)")
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .foregroundColor(student.house.color)

            Text("points earned")
                .font(.caption)
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Points Breakdown Card
    private var pointsBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Points by Category")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            ForEach(pointsByR, id: \.r) { item in
                HStack {
                    Image(systemName: item.icon)
                        .font(.title3)
                        .foregroundColor(colorForR(item.r))
                        .frame(width: 32)

                    Text(item.r)
                        .font(.subheadline)
                        .foregroundColor(AppTheme.Colors.charcoal)

                    Spacer()

                    Text("\(item.points)")
                        .font(.title3)
                        .fontWeight(.semibold)
                        .foregroundColor(colorForR(item.r))
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(colorForR(item.r).opacity(0.1))
                )
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Recent Activity Card
    private var recentActivityCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent Activity")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            ForEach(meritEntries.prefix(5)) { entry in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.subcategory)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(AppTheme.Colors.charcoal)

                        Text(entry.r)
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }

                    Spacer()

                    Text("+\(entry.points)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.Colors.gold)
                }
                .padding(.vertical, 8)

                if entry.id != meritEntries.prefix(5).last?.id {
                    Divider()
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Helper Functions
    private func colorForR(_ r: String) -> Color {
        switch r {
        case "Respect": return .blue
        case "Responsibility": return .orange
        case "Righteousness": return .purple
        default: return .gray
        }
    }

    private func loadMeritEntries() async {
        isLoading = true
        errorMessage = nil

        do {
            let allEntries = try await SupabaseService.shared.fetchMeritLog()
            print("DEBUG: Total merit entries loaded: \(allEntries.count)")
            print("DEBUG: Looking for student: '\(student.name)'")

            // Filter entries for this specific student (case-insensitive, trimmed)
            let studentNameLower = student.name.lowercased().trimmingCharacters(in: .whitespaces)
            meritEntries = allEntries.filter {
                $0.studentName.lowercased().trimmingCharacters(in: .whitespaces) == studentNameLower
            }.sorted { $0.dateOfEvent > $1.dateOfEvent }

            print("DEBUG: Found \(meritEntries.count) merit entries for '\(student.name)'")

            // Debug: Show some sample student names from merit log
            if meritEntries.isEmpty && !allEntries.isEmpty {
                let sampleNames = allEntries.prefix(5).map { "'\($0.studentName)'" }.joined(separator: ", ")
                print("DEBUG: Sample student names in merit log: \(sampleNames)")
            }
        } catch {
            print("DEBUG: Error loading merit entries: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Add Points View

struct AddPointsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedStudent: Student?
    @State private var selectedCategory: MeritCategoryGroup?
    @State private var selectedSubcategory: MeritSubcategory?
    @State private var notes: String = ""
    @State private var showStudentPicker = false
    @State private var showSuccessAlert = false
    @State private var searchText = ""
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    @State private var showErrorAlert = false
    @State private var categoryGroups: [MeritCategoryGroup] = []
    @State private var isLoadingCategories = true

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Step 1: Select Student
                        sectionCard(title: "1. Select Student", icon: "person.fill") {
                            Button {
                                showStudentPicker = true
                            } label: {
                                HStack {
                                    if let student = selectedStudent {
                                        Circle()
                                            .fill(student.house.color.opacity(0.3))
                                            .frame(width: 36, height: 36)
                                            .overlay(
                                                Text(student.initials)
                                                    .font(.caption)
                                                    .fontWeight(.semibold)
                                                    .foregroundColor(student.house.color)
                                            )

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(student.name)
                                                .font(.subheadline)
                                                .foregroundColor(AppTheme.Colors.charcoal)
                                            Text("Grade \(student.grade)\(student.section) • \(student.house.shortName)")
                                                .font(.caption)
                                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                        }
                                    } else {
                                        Image(systemName: "person.badge.plus")
                                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                        Text("Tap to select a student")
                                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.5))
                                }
                                .padding()
                                .regalInputBackground(cornerRadius: 12)
                            }
                        }

                        // Step 2: Select Category (R)
                        sectionCard(title: "2. Select Category", icon: "tag.fill") {
                            VStack(spacing: 12) {
                                if isLoadingCategories {
                                    HStack(spacing: 12) {
                                        ProgressView()
                                        Text("Loading categories...")
                                            .font(.caption)
                                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                    }
                                    .padding(.vertical, 8)
                                } else if categoryGroups.isEmpty {
                                    Text("No categories available.")
                                        .font(.caption)
                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                        .padding(.vertical, 8)
                                } else {
                                    ForEach(categoryGroups) { group in
                                    Button {
                                        withAnimation {
                                            selectedCategory = group
                                            selectedSubcategory = nil
                                        }
                                    } label: {
                                        HStack {
                                            Image(systemName: group.rKey.icon)
                                                .foregroundColor(selectedCategory?.id == group.id ? AppTheme.Colors.gold : AppTheme.Colors.charcoal.opacity(0.6))
                                                .frame(width: 24)

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(group.rKey.rawValue)
                                                    .font(.subheadline)
                                                    .fontWeight(selectedCategory?.id == group.id ? .semibold : .regular)
                                                    .foregroundColor(AppTheme.Colors.charcoal)
                                                Text(group.description)
                                                    .font(.caption)
                                                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                            }

                                            Spacer()

                                            if selectedCategory?.id == group.id {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(AppTheme.Colors.gold)
                                            }
                                        }
                                        .padding()
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(selectedCategory?.id == group.id ? AppTheme.Colors.gold.opacity(0.12) : AppTheme.Colors.ivory)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(selectedCategory?.id == group.id ? AppTheme.Colors.gold.opacity(0.35) : AppTheme.Colors.gold.opacity(0.12), lineWidth: 1)
                                                )
                                        )
                                    }
                                    }
                                }
                            }
                        }

                        // Step 3: Select Subcategory
                        if let group = selectedCategory, !isLoadingCategories, !categoryGroups.isEmpty {
                            sectionCard(title: "3. Select Reason", icon: "list.bullet") {
                                VStack(spacing: 8) {
                                    ForEach(group.subcategories) { sub in
                                        Button {
                                            withAnimation {
                                                selectedSubcategory = sub
                                            }
                                        } label: {
                                            HStack {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(sub.name)
                                                        .font(.subheadline)
                                                        .foregroundColor(AppTheme.Colors.charcoal)
                                                    Text(sub.description)
                                                        .font(.caption)
                                                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                                        .lineLimit(2)
                                                }

                                                Spacer()

                                                Text("+\(sub.points)")
                                                    .font(.headline)
                                                    .foregroundColor(AppTheme.Colors.gold)

                                                if selectedSubcategory?.id == sub.id {
                                                    Image(systemName: "checkmark.circle.fill")
                                                        .foregroundColor(AppTheme.Colors.gold)
                                                }
                                            }
                                            .padding()
                                            .background(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .fill(selectedSubcategory?.id == sub.id ? AppTheme.Colors.gold.opacity(0.12) : AppTheme.Colors.ivory)
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: 12)
                                                            .stroke(selectedSubcategory?.id == sub.id ? AppTheme.Colors.gold.opacity(0.35) : AppTheme.Colors.gold.opacity(0.12), lineWidth: 1)
                                                    )
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Step 4: Notes (Optional)
                        if selectedSubcategory != nil {
                            sectionCard(title: "4. Add Notes (Optional)", icon: "note.text") {
                                TextField("", text: $notes, axis: .vertical)
                                    .foregroundColor(AppTheme.Colors.charcoal)
                                    .padding()
                                    .regalInputBackground(cornerRadius: 12)
                                    .overlay(
                                        Group {
                                            if notes.isEmpty {
                                                Text("Add any additional notes...")
                                                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.5))
                                                    .padding(.leading, 16)
                                                    .allowsHitTesting(false)
                                            }
                                        },
                                        alignment: .leading
                                    )
                            }
                        }

                        // Submit Button
                        if let student = selectedStudent,
                           let group = selectedCategory,
                           let sub = selectedSubcategory {
                            Button {
                                Task {
                                    await submitPoints()
                                }
                            } label: {
                                HStack {
                                    if isSubmitting {
                                        ProgressView()
                                            .tint(.white)
                                        Text("Submitting...")
                                            .fontWeight(.semibold)
                                    } else {
                                        VStack(alignment: .leading) {
                                            Text("Award \(sub.points) points")
                                                .fontWeight(.semibold)
                                            Text("to \(student.name) for \(group.rKey.rawValue)")
                                                .font(.caption)
                                                .opacity(0.8)
                                        }

                                        Spacer()

                                        Image(systemName: "arrow.right.circle.fill")
                                            .font(.title2)
                                    }
                                }
                                .foregroundColor(.white)
                                .padding()
                                .frame(maxWidth: .infinity)
                                .background(AppTheme.Gradients.royal)
                                .cornerRadius(16)
                            }
                            .disabled(isSubmitting)
                            .padding(.top, 8)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Add Points")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .sheet(isPresented: $showStudentPicker) {
                StudentPickerSheet(selectedStudent: $selectedStudent, searchText: $searchText)
            }
            .task {
                await loadCategories()
            }
            .alert("Points Awarded!", isPresented: $showSuccessAlert) {
                Button("OK") {
                    resetForm()
                }
            } message: {
                if let student = selectedStudent, let sub = selectedSubcategory {
                    Text("\(sub.points) points awarded to \(student.name)")
                }
            }
            .alert("Error", isPresented: $showErrorAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "Failed to submit points")
            }
        }
    }

    private func sectionCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundColor(AppTheme.Colors.gold)
                Text(title)
                    .font(AppTheme.Fonts.display(size: 16, weight: .semibold))
                    .foregroundColor(AppTheme.Colors.charcoal)
            }

            content()
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    private func submitPoints() async {
        guard let student = selectedStudent,
              let group = selectedCategory,
              let sub = selectedSubcategory else { return }

        isSubmitting = true
        errorMessage = nil

        do {
            // Get staff name from auth manager
            let staffName = authManager.currentUser?.name ?? "Unknown Staff"

            try await SupabaseService.shared.addMeritEntry(
                staffName: staffName,
                student: student,
                r: group.rTitle,
                subcategory: sub.fullTitle,
                points: sub.points,
                notes: notes
            )

            print("DEBUG: Successfully added merit entry for \(student.name)")
            showSuccessAlert = true
        } catch {
            print("DEBUG: Error submitting points: \(error)")
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }

        isSubmitting = false
    }

    private func resetForm() {
        selectedStudent = nil
        selectedCategory = nil
        selectedSubcategory = nil
        notes = ""
    }

    private func loadCategories() async {
        isLoadingCategories = true
        defer { isLoadingCategories = false }

        do {
            let rows = try await SupabaseService.shared.fetchMeritCategories()
            categoryGroups = groupCategories(rows)
        } catch {
            print("DEBUG: Merit categories load error: \(error)")
        }
    }

    private func groupCategories(_ rows: [MeritCategoryRow]) -> [MeritCategoryGroup] {
        let grouped = Dictionary(grouping: rows, by: { $0.rTitle })
        return grouped.compactMap { rTitle, items in
            let (base, description) = splitTitleDescription(rTitle)
            guard let rKey = matchMeritR(base) else { return nil }

            let subs = items.map { row -> MeritSubcategory in
                let (name, desc) = splitTitleDescription(row.subcategoryTitle)
                return MeritSubcategory(name: name, points: row.points, description: desc)
            }.sorted { $0.points > $1.points }

            return MeritCategoryGroup(
                id: rTitle,
                rKey: rKey,
                rTitle: rTitle,
                description: description.isEmpty ? rKey.description : description,
                subcategories: subs
            )
        }.sorted { $0.rKey.rawValue < $1.rKey.rawValue }
    }

    private func splitTitleDescription(_ value: String) -> (String, String) {
        let separators = [" – ", " - "]
        for sep in separators {
            if let range = value.range(of: sep) {
                let title = String(value[..<range.lowerBound]).trimmingCharacters(in: .whitespaces)
                let desc = String(value[range.upperBound...]).trimmingCharacters(in: .whitespaces)
                return (title, desc)
            }
        }
        return (value.trimmingCharacters(in: .whitespaces), "")
    }

    private func matchMeritR(_ value: String) -> MeritR? {
        let lower = value.lowercased()
        if lower.contains("respect") { return .respect }
        if lower.contains("responsibility") { return .responsibility }
        if lower.contains("righteousness") { return .righteousness }
        return nil
    }
}

// MARK: - Student Picker Sheet

struct StudentPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedStudent: Student?
    @Binding var searchText: String
    @State private var students: [Student] = []
    @State private var isLoading = true

    var filteredStudents: [Student] {
        var result = students

        if !searchText.isEmpty {
            result = result.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        // Sort by grade, then section, then name
        return result.sorted { s1, s2 in
            let grade1 = Int(s1.grade) ?? 0
            let grade2 = Int(s2.grade) ?? 0
            if grade1 != grade2 { return grade1 < grade2 }
            if s1.section != s2.section { return s1.section < s2.section }
            return s1.name < s2.name
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading students...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(filteredStudents) { student in
                                Button {
                                    selectedStudent = student
                                    dismiss()
                                } label: {
                                    HStack(spacing: 12) {
                                        Circle()
                                            .fill(student.house.color.opacity(0.3))
                                            .frame(width: 40, height: 40)
                                            .overlay(
                                                Text(student.initials)
                                                    .font(.caption)
                                                    .fontWeight(.semibold)
                                                    .foregroundColor(student.house.color)
                                            )

                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(student.name)
                                                .font(.subheadline)
                                                .foregroundColor(AppTheme.Colors.charcoal)
                                            Text("Grade \(student.grade)\(student.section) • \(student.house.shortName)")
                                                .font(.caption)
                                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                                        }

                                        Spacer()

                                        if selectedStudent?.id == student.id {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(AppTheme.Colors.gold)
                                        }
                                    }
                                    .padding()
                                    .regalCardBackground(cornerRadius: 12)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Select Student")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(AppTheme.Colors.charcoal)
                }
            }
            .searchable(text: $searchText, prompt: "Search students...")
            .task {
                await loadStudents()
            }
        }
    }

    private func loadStudents() async {
        isLoading = true
        do {
            students = try await SupabaseService.shared.fetchStudents()
        } catch {
            print("DEBUG: Error loading students in picker: \(error)")
            students = []
        }
        isLoading = false
    }
}

// MARK: - Staff Performance View

// MARK: - Admin Dashboard View

struct AdminDashboardView: View {
    @State private var selectedSection = 0
    @State private var meritEntries: [MeritEntry] = []
    @State private var allStudents: [Student] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading dashboard...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Section Picker
                            sectionPicker

                            switch selectedSection {
                            case 0:
                                overviewSection
                            case 1:
                                houseStandingsSection
                            case 2:
                                starsSection
                            case 3:
                                analyticsSection
                            default:
                                overviewSection
                            }
                        }
                        .padding()
                    }
                    .refreshable {
                        await loadData()
                    }
                }
            }
            .navigationTitle("Admin Dashboard")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .task {
                await loadData()
            }
        }
    }

    // MARK: - Section Picker
    private var sectionPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(["Overview", "Houses", "Stars", "Analytics"].enumerated()), id: \.offset) { index, title in
                    Button {
                        withAnimation {
                            selectedSection = index
                        }
                    } label: {
                        Text(title)
                            .font(.subheadline)
                            .fontWeight(selectedSection == index ? .bold : .medium)
                            .foregroundColor(selectedSection == index ? .white : AppTheme.Colors.charcoal)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 20)
                                    .fill(selectedSection == index ? Color(hex: "E74C3C") : Color.white)
                                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                            )
                    }
                }
            }
        }
    }

    // MARK: - Overview Section
    private var overviewSection: some View {
        VStack(spacing: 20) {
            // Key Stats Grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                AdminStatCard(title: "Total Points", value: "\(totalPoints)", icon: "star.fill", color: .yellow)
                AdminStatCard(title: "Total Records", value: "\(meritEntries.count)", icon: "doc.fill", color: .blue)
                AdminStatCard(title: "Active Students", value: "\(activeStudents)", icon: "graduationcap.fill", color: AppTheme.Colors.gold)
                AdminStatCard(title: "Active Staff", value: "\(activeStaff)", subtitle: "of \(totalStaff) total", icon: "person.badge.key.fill", color: .orange)
                AdminStatCard(title: "This Week", value: "+\(pointsThisWeek)", icon: "chart.line.uptrend.xyaxis", color: .purple)
                AdminStatCard(title: "Participation", value: "\(staffParticipationRate)%", subtitle: "This week: \(staffActiveThisWeek)/\(totalStaff)", icon: "chart.bar.fill", color: .teal)
            }

            // Quick House Overview
            VStack(alignment: .leading, spacing: 12) {
                Text("House Overview")
                    .font(.headline)
                    .foregroundColor(AppTheme.Colors.charcoal)

                ForEach(houseRankings, id: \.house.id) { ranking in
                    HStack(spacing: 12) {
                        Circle()
                            .fill(ranking.house.color)
                            .frame(width: 36, height: 36)
                            .overlay(
                                Text("\(ranking.rank)")
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            )

                        Text(ranking.house.rawValue)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(AppTheme.Colors.charcoal)

                        Spacer()

                        Text("\(ranking.points) pts")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(ranking.house.color)

                        // Progress bar
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(AppTheme.Colors.gold.opacity(0.15))
                                    .frame(height: 8)

                                RoundedRectangle(cornerRadius: 4)
                                    .fill(ranking.house.color)
                                    .frame(width: geo.size.width * ranking.percentage, height: 8)
                            }
                        }
                        .frame(width: 80, height: 8)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(AppTheme.Colors.ivory)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(AppTheme.Colors.gold.opacity(0.2), lineWidth: 1)
                            )
                    )
                }
            }
            .padding()
            .regalCardBackground(cornerRadius: 16)
        }
    }

    // MARK: - House Standings Section
    private var houseStandingsSection: some View {
        VStack(spacing: 16) {
            ForEach(houseRankings, id: \.house.id) { ranking in
                HouseStandingCard(
                    house: ranking.house,
                    rank: ranking.rank,
                    points: ranking.points,
                    percentage: ranking.percentage,
                    topStudents: topStudentsForHouse(ranking.house)
                )
            }
        }
    }

    // MARK: - Stars Section
    private var starsSection: some View {
        VStack(spacing: 20) {
            // Stars of the Week
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(AppTheme.Colors.gold)
                    Text("Stars of the Week")
                        .font(.headline)
                        .foregroundColor(AppTheme.Colors.charcoal)
                }

                HStack(spacing: 12) {
                    if let overallStar = starsOfTheWeek.overall {
                        StarCard(title: "Overall Star", student: overallStar.student, points: overallStar.points, color: AppTheme.Colors.gold, icon: "star.fill")
                    }

                    if let hsStar = starsOfTheWeek.highSchool {
                        StarCard(title: "High School", student: hsStar.student, points: hsStar.points, color: AppTheme.Colors.royalPurple, icon: "graduationcap.fill")
                    }

                    if let msStar = starsOfTheWeek.middleSchool {
                        StarCard(title: "Middle School", student: msStar.student, points: msStar.points, color: AppTheme.Colors.royalPurpleLight, icon: "books.vertical.fill")
                    }
                }
            }
            .padding()
            .regalCardBackground(cornerRadius: 16)

            // Top 10 All Time
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "medal.fill")
                        .foregroundColor(.yellow)
                    Text("Top 10 Students (All Time)")
                        .font(.headline)
                        .foregroundColor(AppTheme.Colors.charcoal)
                }

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 12) {
                    ForEach(Array(topStudentsAllTime.prefix(10).enumerated()), id: \.element.student.id) { index, item in
                        TopStudentCard(rank: index + 1, student: item.student, points: item.points)
                    }
                }
            }
            .padding()
            .regalCardBackground(cornerRadius: 16)
        }
    }

    // MARK: - Analytics Section
    private var analyticsSection: some View {
        VStack(spacing: 20) {
            // Summary Stats
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                AnalyticStatCard(title: "Total Points", value: "\(totalPoints)")
                AnalyticStatCard(title: "Total Records", value: "\(meritEntries.count)")
                AnalyticStatCard(title: "Unique Students", value: "\(activeStudents)")
                AnalyticStatCard(title: "Active Staff", value: "\(activeStaff)")
                AnalyticStatCard(title: "Avg/Student", value: String(format: "%.1f", avgPointsPerStudent))
                AnalyticStatCard(title: "Avg/Award", value: String(format: "%.1f", avgPointsPerAward))
            }

            // Points by House
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "building.columns.fill")
                        .foregroundColor(.blue)
                    Text("Points by House")
                        .font(.headline)
                        .foregroundColor(AppTheme.Colors.charcoal)
                }

                ForEach(houseRankings, id: \.house.id) { ranking in
                    HStack {
                        Text(ranking.house.shortName)
                            .font(.caption)
                            .frame(width: 60, alignment: .leading)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 6)
                                    .fill(Color.gray.opacity(0.1))

                                RoundedRectangle(cornerRadius: 6)
                                    .fill(ranking.house.color)
                                    .frame(width: geo.size.width * ranking.percentage)
                            }
                        }
                        .frame(height: 24)

                        Text("\(ranking.points)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .frame(width: 50, alignment: .trailing)
                            .foregroundColor(AppTheme.Colors.charcoal)
                    }
                }
            }
            .padding()
            .regalCardBackground(cornerRadius: 16)

            // Points by R Category
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "chart.pie.fill")
                        .foregroundColor(.purple)
                    Text("Points by Category")
                        .font(.headline)
                        .foregroundColor(AppTheme.Colors.charcoal)
                }

                ForEach(pointsByCategory, id: \.category) { item in
                    HStack {
                        Circle()
                            .fill(item.color)
                            .frame(width: 12, height: 12)

                        Text(item.category)
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal)

                        Spacer()

                        Text("\(item.points) pts")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                        Text("(\(String(format: "%.1f", item.percentage))%)")
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    }
                }
            }
            .padding()
            .regalCardBackground(cornerRadius: 16)

            // Points by Grade
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: "graduationcap.fill")
                        .foregroundColor(AppTheme.Colors.gold)
                    Text("Points by Grade")
                        .font(.headline)
                        .foregroundColor(AppTheme.Colors.charcoal)
                }

                let gradeData = pointsByGrade
                let maxGradePoints = gradeData.map { $0.points }.max() ?? 1

                HStack(alignment: .bottom, spacing: 8) {
                    ForEach(gradeData, id: \.grade) { item in
                        VStack(spacing: 4) {
                            Text("\(item.points)")
                                .font(.caption2)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color(hex: "1a365d"))
                                .frame(height: CGFloat(item.points) / CGFloat(maxGradePoints) * 100)

                            Text(item.grade)
                                .font(.caption2)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 140)
            }
            .padding()
            .regalCardBackground(cornerRadius: 16)
        }
    }

    // MARK: - Computed Properties
    private var totalPoints: Int {
        meritEntries.reduce(0) { $0 + $1.points }
    }

    private var activeStudents: Int {
        Set(meritEntries.map { $0.studentName.lowercased() }).count
    }

    private var activeStaff: Int {
        Set(meritEntries.map { $0.staffName.lowercased() }).count
    }

    private var totalStaff: Int {
        max(activeStaff, 66) // Placeholder for total staff count
    }

    private var pointsThisWeek: Int {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!
        return meritEntries.filter { $0.dateOfEvent >= startOfWeek }.reduce(0) { $0 + $1.points }
    }

    private var staffActiveThisWeek: Int {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!
        let thisWeekEntries = meritEntries.filter { $0.dateOfEvent >= startOfWeek }
        return Set(thisWeekEntries.map { $0.staffName.lowercased() }).count
    }

    private var staffParticipationRate: Int {
        guard totalStaff > 0 else { return 0 }
        return Int(Double(activeStaff) / Double(totalStaff) * 100)
    }

    private var houseRankings: [(house: House, rank: Int, points: Int, percentage: CGFloat)] {
        let housePoints = House.allCases.map { house in
            let points = meritEntries.filter { $0.house == house }.reduce(0) { $0 + $1.points }
            return (house: house, points: points)
        }.sorted { $0.points > $1.points }

        let maxPoints = housePoints.first?.points ?? 1

        return housePoints.enumerated().map { index, item in
            (house: item.house, rank: index + 1, points: item.points, percentage: CGFloat(item.points) / CGFloat(maxPoints))
        }
    }

    private func topStudentsForHouse(_ house: House) -> [(student: Student, points: Int)] {
        let houseStudents = allStudents.filter { $0.house == house }
        return houseStudents.map { student in
            let points = meritEntries
                .filter { $0.studentName.lowercased() == student.name.lowercased() }
                .reduce(0) { $0 + $1.points }
            return (student: student, points: points)
        }
        .sorted { $0.points > $1.points }
        .prefix(5)
        .map { $0 }
    }

    private var topStudentsAllTime: [(student: Student, points: Int)] {
        allStudents.map { student in
            let points = meritEntries
                .filter { $0.studentName.lowercased() == student.name.lowercased() }
                .reduce(0) { $0 + $1.points }
            return (student: student, points: points)
        }
        .sorted { $0.points > $1.points }
    }

    private var starsOfTheWeek: (overall: (student: Student, points: Int)?, highSchool: (student: Student, points: Int)?, middleSchool: (student: Student, points: Int)?) {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!
        let thisWeekEntries = meritEntries.filter { $0.dateOfEvent >= startOfWeek }

        let studentPointsThisWeek = allStudents.map { student in
            let points = thisWeekEntries
                .filter { $0.studentName.lowercased() == student.name.lowercased() }
                .reduce(0) { $0 + $1.points }
            return (student: student, points: points)
        }.filter { $0.points > 0 }

        let overall = studentPointsThisWeek.max { $0.points < $1.points }

        let highSchool = studentPointsThisWeek
            .filter { Int($0.student.grade) ?? 0 >= 9 }
            .max { $0.points < $1.points }

        let middleSchool = studentPointsThisWeek
            .filter { Int($0.student.grade) ?? 0 < 9 }
            .max { $0.points < $1.points }

        return (overall: overall, highSchool: highSchool, middleSchool: middleSchool)
    }

    private var avgPointsPerStudent: Double {
        guard activeStudents > 0 else { return 0 }
        return Double(totalPoints) / Double(activeStudents)
    }

    private var avgPointsPerAward: Double {
        guard meritEntries.count > 0 else { return 0 }
        return Double(totalPoints) / Double(meritEntries.count)
    }

    private var pointsByCategory: [(category: String, points: Int, percentage: Double, color: Color)] {
        let categories = [
            ("Respect", Color.green),
            ("Responsibility", Color(hex: "1a365d")),
            ("Righteousness", Color.blue)
        ]

        let results = categories.map { category, color in
            let points = meritEntries
                .filter { $0.r.lowercased().contains(category.lowercased()) }
                .reduce(0) { $0 + $1.points }
            return (category: category, points: points, color: color)
        }

        let total = results.reduce(0) { $0 + $1.points }

        return results.map { item in
            let percentage = total > 0 ? Double(item.points) / Double(total) * 100 : 0
            return (category: item.category, points: item.points, percentage: percentage, color: item.color)
        }
    }

    private var pointsByGrade: [(grade: String, points: Int)] {
        let grades = ["6", "7", "8", "9", "10", "11", "12"]
        return grades.map { grade in
            let points = meritEntries
                .filter { $0.grade == grade }
                .reduce(0) { $0 + $1.points }
            return (grade: grade, points: points)
        }
    }

    // MARK: - Data Loading
    private func loadData() async {
        isLoading = true

        do {
            async let studentsTask = SupabaseService.shared.fetchStudents()
            async let entriesTask = SupabaseService.shared.fetchMeritLog()

            let (students, entries) = try await (studentsTask, entriesTask)
            allStudents = students
            meritEntries = entries

            print("DEBUG: Admin Dashboard - Loaded \(students.count) students and \(entries.count) entries")
        } catch {
            print("DEBUG: Admin Dashboard error: \(error)")
        }

        isLoading = false
    }
}

// MARK: - Admin Stat Card
struct AdminStatCard: View {
    let title: String
    let value: String
    var subtitle: String? = nil
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Spacer()
            }

            Text(value)
                .font(AppTheme.Fonts.display(size: 20, weight: .bold))
                .foregroundColor(AppTheme.Colors.charcoal)

            Text(title)
                .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(AppTheme.Fonts.body(size: 10))
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.5))
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 12)
    }
}

// MARK: - House Standing Card
struct HouseStandingCard: View {
    let house: House
    let rank: Int
    let points: Int
    let percentage: CGFloat
    let topStudents: [(student: Student, points: Int)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("House of \(house.rawValue)")
                    .font(AppTheme.Fonts.display(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                Text("\(points)")
                    .font(AppTheme.Fonts.display(size: 22, weight: .bold))
                    .foregroundColor(.white)
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.3))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(AppTheme.Colors.goldLight)
                        .frame(width: geo.size.width * percentage, height: 8)
                }
            }
            .frame(height: 8)

            Text("\(String(format: "%.1f", percentage * 100))% of total points")
                .font(AppTheme.Fonts.body(size: 11))
                .foregroundColor(.white.opacity(0.8))

            // Top 5 students
            HStack(spacing: 8) {
                ForEach(Array(topStudents.prefix(5).enumerated()), id: \.element.student.id) { index, item in
                    VStack(spacing: 4) {
                        Text("\(index + 1). \(item.student.name.components(separatedBy: " ").first ?? "")")
                            .font(AppTheme.Fonts.body(size: 10, weight: .semibold))
                            .foregroundColor(.white)
                            .lineLimit(1)

                        Text("\(item.points) pts")
                            .font(AppTheme.Fonts.body(size: 10))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(
            LinearGradient(
                colors: [house.color, house.color.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
    }
}

// MARK: - Star Card
struct StarCard: View {
    let title: String
    let student: Student
    let points: Int
    let color: Color
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)

            Text(title)
                .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

            Text(student.name)
                .font(AppTheme.Fonts.display(size: 14, weight: .bold))
                .foregroundColor(AppTheme.Colors.charcoal)
                .lineLimit(1)

            Text("\(student.house.shortName) • Grade \(student.grade) • \(points) pts")
                .font(AppTheme.Fonts.body(size: 10))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding()
        .regalCardBackground(cornerRadius: 12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Top Student Card
struct TopStudentCard: View {
    let rank: Int
    let student: Student
    let points: Int

    var rankIcon: String {
        switch rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return "\(rank)"
        }
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(rankIcon)
                .font(rank <= 3 ? .title3 : .caption)

            VStack(alignment: .leading, spacing: 2) {
                Text(student.name)
                    .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                    .foregroundColor(AppTheme.Colors.charcoal)
                    .lineLimit(1)

                Text("\(student.house.shortName) • \(points) pts")
                    .font(AppTheme.Fonts.body(size: 10))
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.55))
            }

            Spacer()
        }
        .padding(10)
        .regalCardBackground(cornerRadius: 10)
    }
}

// MARK: - Analytic Stat Card
struct AnalyticStatCard: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

            Text(value)
                .font(AppTheme.Fonts.display(size: 20, weight: .bold))
                .foregroundColor(AppTheme.Colors.charcoal)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .regalCardBackground(cornerRadius: 12)
    }
}

// MARK: - Staff Engagement View

struct StaffEngagementView: View {
    @State private var meritEntries: [MeritEntry] = []
    @State private var isLoading = true

    // Staff activity tiers
    enum StaffTier: String, CaseIterable {
        case champion = "Champion"
        case active = "Active"
        case moderate = "Moderate"
        case needsSupport = "Needs Support"
        case inactive = "Inactive"

        var color: Color {
            switch self {
            case .champion: return .green
            case .active: return .blue
            case .moderate: return .orange
            case .needsSupport: return .red
            case .inactive: return .gray
            }
        }

        var icon: String {
            switch self {
            case .champion: return "star.circle.fill"
            case .active: return "checkmark.circle.fill"
            case .moderate: return "minus.circle.fill"
            case .needsSupport: return "exclamationmark.circle.fill"
            case .inactive: return "xmark.circle.fill"
            }
        }

        var description: String {
            switch self {
            case .champion: return "50+ points this month"
            case .active: return "20-49 points this month"
            case .moderate: return "10-19 points this month"
            case .needsSupport: return "1-9 points this month"
            case .inactive: return "No points this month"
            }
        }
    }

    struct StaffMember: Identifiable {
        let id = UUID()
        let name: String
        let pointsAwarded: Int
        let entriesCount: Int
        let lastActiveDate: Date?
        let tier: StaffTier
        let pointsThisMonth: Int
        let pointsThisWeek: Int
    }

    var staffMembers: [StaffMember] {
        let calendar = Calendar.current
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: Date()))!
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!

        let staffNames = Set(meritEntries.map { $0.staffName })

        return staffNames.map { name in
            let staffEntries = meritEntries.filter { $0.staffName == name }
            let totalPoints = staffEntries.reduce(0) { $0 + $1.points }
            let monthEntries = staffEntries.filter { $0.dateOfEvent >= startOfMonth }
            let weekEntries = staffEntries.filter { $0.dateOfEvent >= startOfWeek }
            let monthPoints = monthEntries.reduce(0) { $0 + $1.points }
            let weekPoints = weekEntries.reduce(0) { $0 + $1.points }
            let lastDate = staffEntries.map { $0.dateOfEvent }.max()

            let tier: StaffTier
            if monthPoints >= 50 {
                tier = .champion
            } else if monthPoints >= 20 {
                tier = .active
            } else if monthPoints >= 10 {
                tier = .moderate
            } else if monthPoints >= 1 {
                tier = .needsSupport
            } else {
                tier = .inactive
            }

            return StaffMember(
                name: name,
                pointsAwarded: totalPoints,
                entriesCount: staffEntries.count,
                lastActiveDate: lastDate,
                tier: tier,
                pointsThisMonth: monthPoints,
                pointsThisWeek: weekPoints
            )
        }.sorted { $0.pointsAwarded > $1.pointsAwarded }
    }

    var staffByTier: [(tier: StaffTier, count: Int, members: [StaffMember])] {
        StaffTier.allCases.map { tier in
            let members = staffMembers.filter { $0.tier == tier }
            return (tier: tier, count: members.count, members: members)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading staff data...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Tier Overview
                            tierOverviewSection

                            // Top Performers
                            topPerformersSection

                            // Needs Support
                            needsSupportSection

                            // All Staff List
                            allStaffSection
                        }
                        .padding()
                    }
                    .refreshable {
                        await loadData()
                    }
                }
            }
            .navigationTitle("Staff Engagement")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .task {
                await loadData()
            }
        }
    }

    // MARK: - Tier Overview Section
    private var tierOverviewSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Staff Activity Tiers")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(staffByTier, id: \.tier.rawValue) { item in
                    HStack(spacing: 12) {
                        Image(systemName: item.tier.icon)
                            .font(.title2)
                            .foregroundColor(item.tier.color)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(item.count)")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(AppTheme.Colors.charcoal)

                            Text(item.tier.rawValue)
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }

                        Spacer()
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(item.tier.color.opacity(0.1))
                    )
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Top Performers Section
    private var topPerformersSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "trophy.fill")
                    .foregroundColor(.yellow)
                Text("Top Performers")
                    .font(.headline)
                    .foregroundColor(AppTheme.Colors.charcoal)
            }

            ForEach(Array(staffMembers.filter { $0.tier == .champion || $0.tier == .active }.prefix(5).enumerated()), id: \.element.id) { index, staff in
                StaffRow(staff: staff, rank: index + 1, showRank: true)
            }

            if staffMembers.filter({ $0.tier == .champion || $0.tier == .active }).isEmpty {
                Text("No top performers this month")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding()
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Needs Support Section
    private var needsSupportSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Needs Support")
                    .font(.headline)
                    .foregroundColor(AppTheme.Colors.charcoal)

                Spacer()

                Text("\(staffMembers.filter { $0.tier == .needsSupport || $0.tier == .inactive }.count) staff")
                    .font(.caption)
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
            }

            let needsSupport = staffMembers.filter { $0.tier == .needsSupport || $0.tier == .inactive }

            if needsSupport.isEmpty {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(AppTheme.Colors.gold)
                    Text("All staff are actively participating!")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else {
                ForEach(needsSupport.prefix(5)) { staff in
                    StaffRow(staff: staff, rank: nil, showRank: false)
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - All Staff Section
    private var allStaffSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "person.3.fill")
                    .foregroundColor(.blue)
                Text("All Staff (\(staffMembers.count))")
                    .font(.headline)
                    .foregroundColor(AppTheme.Colors.charcoal)
            }

            ForEach(staffMembers) { staff in
                StaffRow(staff: staff, rank: nil, showRank: false)
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Data Loading
    private func loadData() async {
        isLoading = true

        do {
            meritEntries = try await SupabaseService.shared.fetchMeritLog()
            print("DEBUG: Staff Engagement - Loaded \(meritEntries.count) entries")
        } catch {
            print("DEBUG: Staff Engagement error: \(error)")
        }

        isLoading = false
    }
}

// MARK: - Staff Row
struct StaffRow: View {
    let staff: StaffEngagementView.StaffMember
    let rank: Int?
    let showRank: Bool

    var body: some View {
        HStack(spacing: 12) {
            if showRank, let rank = rank {
                Text("\(rank)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .frame(width: 24, height: 24)
                    .background(rank <= 3 ? Color.yellow : Color.gray)
                    .cornerRadius(12)
            }

            Image(systemName: staff.tier.icon)
                .foregroundColor(staff.tier.color)

            VStack(alignment: .leading, spacing: 2) {
                Text(staff.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(AppTheme.Colors.charcoal)

                HStack(spacing: 8) {
                    Text("\(staff.pointsAwarded) pts total")
                        .font(.caption)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                    Text("•")
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))

                    Text("\(staff.entriesCount) awards")
                        .font(.caption)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("\(staff.pointsThisMonth) this month")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(staff.tier.color)

                if let lastDate = staff.lastActiveDate {
                    Text("Last: \(formatDate(lastDate))")
                        .font(.caption2)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(staff.tier.color.opacity(0.05))
        )
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// Keep the old name for compatibility
struct StaffPerformanceView: View {
    var body: some View {
        StaffEngagementView()
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                VStack(spacing: 20) {
                    // User Info
                    if let user = authManager.currentUser {
                        VStack(spacing: 8) {
                            Text(user.name)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(AppTheme.Colors.charcoal)

                            Text(user.role.rawValue)
                                .font(.subheadline)
                                .foregroundColor(Color(hex: user.role.accentColor))
                        }
                        .padding(.top, 20)
                    }

                    Spacer()

                    // Sign Out Button
                    Button {
                        authManager.signOut()
                    } label: {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.2))
                        .foregroundColor(.red)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 40)
                }
            }
            .navigationTitle("Settings")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
        }
    }
}

// MARK: - Student House Dashboard

struct StudentHouseDashboard: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var allMeritEntries: [MeritEntry] = []
    @State private var allStudents: [Student] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var userHouse: House {
        authManager.currentUser?.house ?? .abuBakr
    }

    // Calculate house points for all houses
    private var housePoints: [(house: House, points: Int)] {
        House.allCases.map { house in
            let points = allMeritEntries
                .filter { $0.house == house }
                .reduce(0) { $0 + $1.points }
            return (house: house, points: points)
        }.sorted { $0.points > $1.points }
    }

    // Get user's house rank (1st, 2nd, etc.)
    private var userHouseRank: Int {
        if let index = housePoints.firstIndex(where: { $0.house == userHouse }) {
            return index + 1
        }
        return 0
    }

    // Get user's house total points
    private var userHousePoints: Int {
        housePoints.first(where: { $0.house == userHouse })?.points ?? 0
    }

    // Students in user's house with their points
    private var houseStudentsWithPoints: [(student: Student, points: Int)] {
        let houseStudents = allStudents.filter { $0.house == userHouse }
        return houseStudents.map { student in
            let studentNameLower = student.name.lowercased().trimmingCharacters(in: .whitespaces)
            let points = allMeritEntries
                .filter { $0.studentName.lowercased().trimmingCharacters(in: .whitespaces) == studentNameLower }
                .reduce(0) { $0 + $1.points }
            return (student: student, points: points)
        }.sorted { $0.points > $1.points }
    }

    // Top 5 students in the house
    private var topHouseStudents: [(student: Student, points: Int)] {
        Array(houseStudentsWithPoints.prefix(5))
    }

    // Current user's rank in house
    private var userRankInHouse: Int {
        let userName = authManager.currentUser?.name.lowercased().trimmingCharacters(in: .whitespaces) ?? ""
        if let index = houseStudentsWithPoints.firstIndex(where: {
            $0.student.name.lowercased().trimmingCharacters(in: .whitespaces) == userName
        }) {
            return index + 1
        }
        return 0
    }

    // House merit entries for the current user's house
    private var houseMeritEntries: [MeritEntry] {
        allMeritEntries.filter { $0.house == userHouse }
    }

    // Weekly points for the last 4 weeks
    private var weeklyTrends: [(week: String, points: Int)] {
        let calendar = Calendar.current
        let now = Date()

        return (0..<4).reversed().map { weeksAgo in
            let weekStart = calendar.date(byAdding: .weekOfYear, value: -weeksAgo, to: now)!
            let weekEnd = calendar.date(byAdding: .day, value: 7, to: weekStart)!

            let points = houseMeritEntries
                .filter { $0.dateOfEvent >= weekStart && $0.dateOfEvent < weekEnd }
                .reduce(0) { $0 + $1.points }

            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            let label = weeksAgo == 0 ? "This Week" : formatter.string(from: weekStart)

            return (week: label, points: points)
        }
    }

    // House statistics
    private var totalStudentsInHouse: Int {
        allStudents.filter { $0.house == userHouse }.count
    }

    private var averagePointsPerStudent: Int {
        guard totalStudentsInHouse > 0 else { return 0 }
        return userHousePoints / totalStudentsInHouse
    }

    // Points earned this week
    private var pointsThisWeek: Int {
        let calendar = Calendar.current
        let startOfWeek = calendar.date(from: calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: Date()))!

        return houseMeritEntries
            .filter { $0.dateOfEvent >= startOfWeek }
            .reduce(0) { $0 + $1.points }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.Colors.background.ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading house data...")
                        .foregroundColor(AppTheme.Colors.charcoal)
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // House Status Card
                            houseStatusCard

                            // House Statistics
                            houseStatisticsCard

                            // Weekly Trends
                            weeklyTrendsCard

                            // House Leaderboard
                            houseLeaderboardCard

                            // Recent House Activity
                            recentHouseActivityCard
                        }
                        .padding()
                    }
                    .refreshable {
                        await loadData()
                    }
                }
            }
            .navigationTitle("My House")
            .toolbarBackground(AppTheme.Colors.background, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.light, for: .navigationBar)
            .task {
                await loadData()
            }
        }
    }

    // MARK: - House Status Card
    private var houseStatusCard: some View {
        VStack(spacing: 16) {
            // House Icon and Name
            HStack(spacing: 16) {
                Image(userHouse.imageName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 70, height: 70)
                    .shadow(color: userHouse.color.opacity(0.4), radius: 8, x: 0, y: 4)

                VStack(alignment: .leading, spacing: 4) {
                    Text(userHouse.rawValue)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.Colors.charcoal)

                    HStack(spacing: 8) {
                        // Rank Badge
                        HStack(spacing: 4) {
                            Image(systemName: rankIcon)
                                .foregroundColor(rankColor)
                            Text(rankText)
                                .fontWeight(.semibold)
                                .foregroundColor(rankColor)
                        }
                        .font(.subheadline)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(rankColor.opacity(0.15))
                        .cornerRadius(8)
                    }
                }

                Spacer()
            }

            // Total Points
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("House Total")
                        .font(.caption)
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    Text("\(userHousePoints)")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundColor(userHouse.color)
                }

                Spacer()

                // Points Behind/Ahead
                if userHouseRank > 1 {
                    let leadingPoints = housePoints[0].points
                    let difference = leadingPoints - userHousePoints
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("\(difference) pts behind")
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        Text(housePoints[0].house.rawValue)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(housePoints[0].house.color)
                    }
                } else {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Leading by")
                            .font(.caption)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        if housePoints.count > 1 {
                            let lead = userHousePoints - housePoints[1].points
                            Text("\(lead) pts")
                                .font(.headline)
                                .foregroundColor(AppTheme.Colors.gold)
                        }
                    }
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - House Statistics Card
    private var houseStatisticsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("House Statistics")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            HStack(spacing: 12) {
                StatCard(
                    title: "Students",
                    value: "\(totalStudentsInHouse)",
                    icon: "person.3.fill",
                    color: userHouse.color
                )

                StatCard(
                    title: "Avg Points",
                    value: "\(averagePointsPerStudent)",
                    icon: "chart.bar.fill",
                    color: AppTheme.Colors.royalPurpleLight
                )

                StatCard(
                    title: "This Week",
                    value: "+\(pointsThisWeek)",
                    icon: "calendar",
                    color: AppTheme.Colors.gold
                )
            }

            // User's rank in house
            if userRankInHouse > 0 {
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                    Text("You are ranked")
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    Text("#\(userRankInHouse)")
                        .fontWeight(.bold)
                        .foregroundColor(userHouse.color)
                    Text("in your house")
                        .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    Spacer()
                }
                .font(.subheadline)
                .padding()
                .background(userHouse.color.opacity(0.1))
                .cornerRadius(12)
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Weekly Trends Card
    private var weeklyTrendsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Weekly Trends")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            HStack(alignment: .bottom, spacing: 12) {
                ForEach(weeklyTrends, id: \.week) { trend in
                    VStack(spacing: 8) {
                        Text("\(trend.points)")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(userHouse.color)

                        // Bar
                        let maxPoints = weeklyTrends.map { $0.points }.max() ?? 1
                        let height = maxPoints > 0 ? CGFloat(trend.points) / CGFloat(maxPoints) * 80 : 0

                        RoundedRectangle(cornerRadius: 6)
                            .fill(
                                LinearGradient(
                                    colors: [userHouse.color, userHouse.color.opacity(0.6)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )
                            .frame(height: max(height, 10))

                        Text(trend.week)
                            .font(.caption2)
                            .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 130)
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - House Leaderboard Card
    private var houseLeaderboardCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("House Leaderboard")
                    .font(.headline)
                    .foregroundColor(AppTheme.Colors.charcoal)

                Spacer()

                Text("Top 5")
                    .font(.caption)
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
            }

            if topHouseStudents.isEmpty {
                Text("No students found")
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(Array(topHouseStudents.enumerated()), id: \.element.student.id) { index, item in
                    let isCurrentUser = item.student.name.lowercased() == authManager.currentUser?.name.lowercased()

                    HStack(spacing: 12) {
                        // Rank
                        ZStack {
                            Circle()
                                .fill(index < 3 ? medalColor(for: index) : Color.gray.opacity(0.2))
                                .frame(width: 28, height: 28)

                            Text("\(index + 1)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(index < 3 ? .white : .gray)
                        }

                        // Student Info
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(item.student.name)
                                    .font(.subheadline)
                                    .fontWeight(isCurrentUser ? .bold : .medium)
                                    .foregroundColor(AppTheme.Colors.charcoal)

                                if isCurrentUser {
                                    Text("(You)")
                                        .font(.caption)
                                        .foregroundColor(userHouse.color)
                                }
                            }

                            Text("Grade \(item.student.grade)\(item.student.section)")
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }

                        Spacer()

                        // Points
                        Text("\(item.points)")
                            .font(.headline)
                            .foregroundColor(userHouse.color)
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(isCurrentUser ? userHouse.color.opacity(0.1) : Color.clear)
                    )

                    if index < topHouseStudents.count - 1 && !isCurrentUser {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Recent House Activity Card
    private var recentHouseActivityCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Recent House Activity")
                .font(.headline)
                .foregroundColor(AppTheme.Colors.charcoal)

            let recentEntries = houseMeritEntries
                .sorted { $0.dateOfEvent > $1.dateOfEvent }
                .prefix(5)

            if recentEntries.isEmpty {
                Text("No recent activity")
                    .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(Array(recentEntries)) { entry in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.studentName)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(AppTheme.Colors.charcoal)

                            Text(entry.subcategory)
                                .font(.caption)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text("+\(entry.points)")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(AppTheme.Colors.gold)

                            Text(formatDate(entry.dateOfEvent))
                                .font(.caption2)
                                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
                        }
                    }
                    .padding(.vertical, 6)

                    if entry.id != recentEntries.last?.id {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .regalCardBackground(cornerRadius: 16)
    }

    // MARK: - Helper Properties
    private var rankIcon: String {
        switch userHouseRank {
        case 1: return "crown.fill"
        case 2: return "medal.fill"
        case 3: return "medal.fill"
        default: return "number"
        }
    }

    private var rankColor: Color {
        switch userHouseRank {
        case 1: return .yellow
        case 2: return Color(hex: "C0C0C0")  // Silver
        case 3: return Color(hex: "CD7F32")  // Bronze
        default: return .gray
        }
    }

    private var rankText: String {
        switch userHouseRank {
        case 1: return "1st Place"
        case 2: return "2nd Place"
        case 3: return "3rd Place"
        case 4: return "4th Place"
        default: return "\(userHouseRank)th"
        }
    }

    private func medalColor(for index: Int) -> Color {
        switch index {
        case 0: return .yellow
        case 1: return Color(hex: "C0C0C0")  // Silver
        case 2: return Color(hex: "CD7F32")  // Bronze
        default: return .gray
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    // MARK: - Data Loading
    private func loadData() async {
        isLoading = true

        do {
            async let entriesTask = SupabaseService.shared.fetchMeritLog()
            async let studentsTask = SupabaseService.shared.fetchStudents()

            let (entries, students) = try await (entriesTask, studentsTask)
            allMeritEntries = entries
            allStudents = students

            print("DEBUG: House Dashboard - Loaded \(entries.count) merit entries and \(students.count) students")
        } catch {
            print("DEBUG: House Dashboard error: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Stat Card Helper View
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(value)
                .font(AppTheme.Fonts.display(size: 18, weight: .bold))
                .foregroundColor(AppTheme.Colors.charcoal)

            Text(title)
                .font(AppTheme.Fonts.body(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.Colors.charcoal.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .regalCardBackground(cornerRadius: 12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.2), lineWidth: 1)
        )
    }
}

#Preview {
    let authManager = AuthManager()
    authManager.currentUser = User(
        id: "1",
        email: "student@bha.edu",
        name: "Ahmed",
        role: .student,
        house: .abuBakr
    )
    authManager.isAuthenticated = true

    return DashboardView()
        .environmentObject(authManager)
}
