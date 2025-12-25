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

            // My Profile / Points - Available to all
            profileTab
                .tabItem {
                    Label(profileTabTitle, systemImage: profileTabIcon)
                }
                .tag(1)

            // Add Points - Staff and Admin only
            if canAddPoints {
                AddPointsView()
                    .tabItem {
                        Label("Add Points", systemImage: "plus.circle.fill")
                    }
                    .tag(2)
            }

            // Staff Performance - Admin only
            if authManager.currentUser?.role == .admin {
                StaffPerformanceView()
                    .tabItem {
                        Label("Staff Stats", systemImage: "chart.bar.fill")
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
        return role == .staff || role == .admin
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
        case .staff, .admin:
            StudentListView()
        case .none:
            EmptyView()
        }
    }
}

// MARK: - Leaderboard View

struct LeaderboardView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // House Cards
                        ForEach(Array(House.allCases.enumerated()), id: \.element.id) { index, house in
                            HouseLeaderboardCard(house: house, rank: index + 1, points: samplePoints(for: index))
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Leaderboard")
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }

    private func samplePoints(for index: Int) -> Int {
        [2450, 2280, 2150, 1980][index]
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
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(rankColor)
                .frame(width: 50)

            // House Icon
            Circle()
                .fill(house.color)
                .frame(width: 50, height: 50)
                .overlay(
                    Image(systemName: house.icon)
                        .foregroundColor(.white)
                )

            // House Name
            VStack(alignment: .leading, spacing: 4) {
                Text(house.shortName)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(house.rawValue)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
            }

            Spacer()

            // Points
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(points)")
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                Text("points")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.6))
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(house.color.opacity(0.3), lineWidth: 1)
                )
        )
    }

    private var rankColor: Color {
        switch rank {
        case 1: return .yellow
        case 2: return Color(hex: "C0C0C0")
        case 3: return Color(hex: "CD7F32")
        default: return .white.opacity(0.6)
        }
    }
}

// MARK: - Student Profile View

struct StudentProfileView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                VStack(spacing: 24) {
                    // Profile Header
                    VStack(spacing: 12) {
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 80, height: 80)
                            .overlay(
                                Text(authManager.currentUser?.name.prefix(1).uppercased() ?? "S")
                                    .font(.title)
                                    .fontWeight(.bold)
                                    .foregroundColor(.blue)
                            )

                        Text(authManager.currentUser?.name ?? "Student")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)

                        if let house = authManager.currentUser?.house {
                            HStack {
                                Circle()
                                    .fill(house.color)
                                    .frame(width: 12, height: 12)
                                Text(house.rawValue)
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                    }
                    .padding(.top, 20)

                    // Points Summary
                    HStack(spacing: 24) {
                        StatBox(title: "Total Points", value: "125", color: .green)
                        StatBox(title: "This Month", value: "45", color: .blue)
                        StatBox(title: "Rank", value: "#12", color: .orange)
                    }
                    .padding(.horizontal)

                    // Recent Points (Placeholder)
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Activity")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal)

                        Text("Points history will appear here")
                            .foregroundColor(.white.opacity(0.5))
                            .frame(maxWidth: .infinity, minHeight: 100)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(12)
                            .padding(.horizontal)
                    }

                    Spacer()
                }
            }
            .navigationTitle("My Points")
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}

struct StatBox: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.white.opacity(0.6))
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }
}

// MARK: - Parent Child View

struct ParentChildView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                VStack {
                    Text("Your child's progress will appear here")
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .navigationTitle("My Child")
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
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
                Color(hex: "1a1a2e").ignoresSafeArea()

                if isLoading {
                    ProgressView("Loading students...")
                        .foregroundColor(.white)
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundColor(.orange)
                        Text(error)
                            .foregroundColor(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                        Button("Retry") {
                            Task { await loadStudents() }
                        }
                        .foregroundColor(.green)
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
                                            StudentRow(student: student)
                                        }
                                    } header: {
                                        HStack {
                                            Text("Class \(group.classLabel)")
                                                .font(.headline)
                                                .fontWeight(.bold)
                                                .foregroundColor(.white)
                                            Spacer()
                                            Text("\(group.students.count) students")
                                                .font(.caption)
                                                .foregroundColor(.white.opacity(0.6))
                                        }
                                        .padding(.horizontal)
                                        .padding(.vertical, 8)
                                        .background(Color(hex: "1a1a2e"))
                                    }
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
            .navigationTitle("Students (\(students.count))")
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
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
            students = try await GoogleSheetsService.shared.fetchStudents()
            print("DEBUG: Loaded \(students.count) students from Google Sheets")
            let uniqueGrades = Set(students.map { $0.grade })
            print("DEBUG: Unique grades found: \(uniqueGrades.sorted())")
            print("DEBUG: Sample students - first 5 grades: \(students.prefix(5).map { "'\($0.grade)'" })")
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
                .foregroundColor(isSelected ? .white : .white.opacity(0.7))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.green : Color.white.opacity(0.1))
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
                    .foregroundColor(.white)

                HStack(spacing: 8) {
                    Text("Grade \(student.grade)\(student.section)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))

                    Circle()
                        .fill(student.house.color)
                        .frame(width: 8, height: 8)

                    Text(student.house.shortName)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.white.opacity(0.3))
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
    }
}

// MARK: - Add Points View

struct AddPointsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var selectedStudent: Student?
    @State private var selectedR: MeritR?
    @State private var selectedSubcategory: MeritSubcategory?
    @State private var notes: String = ""
    @State private var showStudentPicker = false
    @State private var showSuccessAlert = false
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

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
                                                .foregroundColor(.white)
                                            Text("Grade \(student.grade)\(student.section) • \(student.house.shortName)")
                                                .font(.caption)
                                                .foregroundColor(.white.opacity(0.6))
                                        }
                                    } else {
                                        Image(systemName: "person.badge.plus")
                                            .foregroundColor(.white.opacity(0.5))
                                        Text("Tap to select a student")
                                            .foregroundColor(.white.opacity(0.5))
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.white.opacity(0.3))
                                }
                                .padding()
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                            }
                        }

                        // Step 2: Select Category (R)
                        sectionCard(title: "2. Select Category", icon: "tag.fill") {
                            VStack(spacing: 12) {
                                ForEach(MeritR.allCases) { r in
                                    Button {
                                        withAnimation {
                                            selectedR = r
                                            selectedSubcategory = nil
                                        }
                                    } label: {
                                        HStack {
                                            Image(systemName: r.icon)
                                                .foregroundColor(selectedR == r ? .green : .white.opacity(0.5))
                                                .frame(width: 24)

                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(r.rawValue)
                                                    .font(.subheadline)
                                                    .fontWeight(selectedR == r ? .semibold : .regular)
                                                    .foregroundColor(.white)
                                                Text(r.description)
                                                    .font(.caption)
                                                    .foregroundColor(.white.opacity(0.5))
                                            }

                                            Spacer()

                                            if selectedR == r {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .foregroundColor(.green)
                                            }
                                        }
                                        .padding()
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .fill(selectedR == r ? Color.green.opacity(0.15) : Color.white.opacity(0.05))
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12)
                                                        .stroke(selectedR == r ? Color.green.opacity(0.3) : Color.clear, lineWidth: 1)
                                                )
                                        )
                                    }
                                }
                            }
                        }

                        // Step 3: Select Subcategory
                        if let r = selectedR {
                            sectionCard(title: "3. Select Reason", icon: "list.bullet") {
                                VStack(spacing: 8) {
                                    ForEach(r.subcategories) { sub in
                                        Button {
                                            withAnimation {
                                                selectedSubcategory = sub
                                            }
                                        } label: {
                                            HStack {
                                                VStack(alignment: .leading, spacing: 2) {
                                                    Text(sub.name)
                                                        .font(.subheadline)
                                                        .foregroundColor(.white)
                                                    Text(sub.description)
                                                        .font(.caption)
                                                        .foregroundColor(.white.opacity(0.5))
                                                        .lineLimit(2)
                                                }

                                                Spacer()

                                                Text("+\(sub.points)")
                                                    .font(.headline)
                                                    .foregroundColor(.green)

                                                if selectedSubcategory?.id == sub.id {
                                                    Image(systemName: "checkmark.circle.fill")
                                                        .foregroundColor(.green)
                                                }
                                            }
                                            .padding()
                                            .background(
                                                RoundedRectangle(cornerRadius: 12)
                                                    .fill(selectedSubcategory?.id == sub.id ? Color.green.opacity(0.15) : Color.white.opacity(0.05))
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
                                    .foregroundColor(.white)
                                    .padding()
                                    .background(Color.white.opacity(0.05))
                                    .cornerRadius(12)
                                    .overlay(
                                        Group {
                                            if notes.isEmpty {
                                                Text("Add any additional notes...")
                                                    .foregroundColor(.white.opacity(0.3))
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
                           let r = selectedR,
                           let sub = selectedSubcategory {
                            Button {
                                submitPoints()
                            } label: {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text("Award \(sub.points) points")
                                            .fontWeight(.semibold)
                                        Text("to \(student.name) for \(r.rawValue)")
                                            .font(.caption)
                                            .opacity(0.8)
                                    }

                                    Spacer()

                                    Image(systemName: "arrow.right.circle.fill")
                                        .font(.title2)
                                }
                                .foregroundColor(.white)
                                .padding()
                                .background(
                                    LinearGradient(
                                        colors: [.green, .green.opacity(0.8)],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(16)
                            }
                            .padding(.top, 8)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Add Points")
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .sheet(isPresented: $showStudentPicker) {
                StudentPickerSheet(selectedStudent: $selectedStudent, searchText: $searchText)
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
        }
    }

    private func sectionCard<Content: View>(title: String, icon: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .foregroundColor(.green)
                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
            }

            content()
        }
    }

    private func submitPoints() {
        // In real app, this would save to Google Sheets
        showSuccessAlert = true
    }

    private func resetForm() {
        selectedStudent = nil
        selectedR = nil
        selectedSubcategory = nil
        notes = ""
    }
}

// MARK: - Student Picker Sheet

struct StudentPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedStudent: Student?
    @Binding var searchText: String

    var filteredStudents: [Student] {
        if searchText.isEmpty {
            return Student.sampleStudents
        }
        return Student.sampleStudents.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

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
                                            .foregroundColor(.white)
                                        Text("Grade \(student.grade)\(student.section) • \(student.house.shortName)")
                                            .font(.caption)
                                            .foregroundColor(.white.opacity(0.6))
                                    }

                                    Spacer()

                                    if selectedStudent?.id == student.id {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundColor(.green)
                                    }
                                }
                                .padding()
                                .background(Color.white.opacity(0.05))
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Select Student")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .searchable(text: $searchText, prompt: "Search students...")
        }
    }
}

// MARK: - Staff Performance View

struct StaffPerformanceView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                VStack {
                    Text("Staff performance stats will appear here")
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .navigationTitle("Staff Stats")
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            ZStack {
                Color(hex: "1a1a2e").ignoresSafeArea()

                VStack(spacing: 20) {
                    // User Info
                    if let user = authManager.currentUser {
                        VStack(spacing: 8) {
                            Text(user.name)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)

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
            .toolbarBackground(Color(hex: "1a1a2e"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
        }
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
