import Foundation

enum UserRole: String, CaseIterable, Identifiable, Codable {
    case student = "Student"
    case parent = "Parent"
    case staff = "Staff"
    case admin = "Admin"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .student: return "person.fill"
        case .parent: return "figure.2.and.child.holdinghands"
        case .staff: return "person.badge.key.fill"
        case .admin: return "gearshape.fill"
        }
    }

    var description: String {
        switch self {
        case .student:
            return "View your points and house standings"
        case .parent:
            return "Track your child's progress"
        case .staff:
            return "Award points and view house standings"
        case .admin:
            return "Full access to all features"
        }
    }

    var accentColor: String {
        switch self {
        case .student: return "4A90D9"
        case .parent: return "7B68EE"
        case .staff: return "2ECC71"
        case .admin: return "E74C3C"
        }
    }
}

struct User: Identifiable, Codable {
    let id: String
    let email: String
    let name: String
    let role: UserRole
    var house: House?

    // For students
    var grade: String?
    var section: String?
    var gender: String?

    // For staff
    var staffRole: String?
}
