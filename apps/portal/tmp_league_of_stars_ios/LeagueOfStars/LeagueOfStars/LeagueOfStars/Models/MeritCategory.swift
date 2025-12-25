import Foundation

// MARK: - The Three Rs

enum MeritR: String, CaseIterable, Identifiable {
    case respect = "Respect"
    case responsibility = "Responsibility"
    case righteousness = "Righteousness"

    var id: String { rawValue }

    var description: String {
        switch self {
        case .respect:
            return "Honoring Others and Community"
        case .responsibility:
            return "Taking Ownership and Initiative"
        case .righteousness:
            return "Living Islamic Values"
        }
    }

    var icon: String {
        switch self {
        case .respect: return "hand.wave.fill"
        case .responsibility: return "checkmark.seal.fill"
        case .righteousness: return "star.fill"
        }
    }

    var subcategories: [MeritSubcategory] {
        switch self {
        case .respect:
            return [
                MeritSubcategory(name: "Polite Language & Manners", points: 5, description: "Using kind words, greetings, waiting your turn"),
                MeritSubcategory(name: "Helping Others", points: 10, description: "Assisting peers, showing sportsmanship"),
                MeritSubcategory(name: "Inclusion", points: 10, description: "Inviting others to sit, play, or join activities"),
                MeritSubcategory(name: "Conflict Resolution", points: 20, description: "Walking away from fights, making peace"),
                MeritSubcategory(name: "Standing Up for Others", points: 50, description: "Defending against bullying, encouraging kindness")
            ]
        case .responsibility:
            return [
                MeritSubcategory(name: "Personal Accountability", points: 5, description: "Owning mistakes, following through with commitments"),
                MeritSubcategory(name: "Cleanliness & Care", points: 10, description: "Keeping class, performing wuḍūʾ correctly, lockers, and campus clean"),
                MeritSubcategory(name: "Proactive Help", points: 10, description: "Helping teachers, assisting with school tasks without prompting"),
                MeritSubcategory(name: "Self-Discipline", points: 20, description: "Following instructions the first time, staying calm under pressure")
            ]
        case .righteousness:
            return [
                MeritSubcategory(name: "Prayer Etiquette", points: 10, description: "Proper ṣalāh behavior, lining up properly, respecting the muṣallā"),
                MeritSubcategory(name: "Avoiding Harm", points: 20, description: "Not mocking, gossiping, or backbiting"),
                MeritSubcategory(name: "Generosity of Spirit", points: 20, description: "Sharing, giving freely, thinking of others first"),
                MeritSubcategory(name: "Controlling the Nafs", points: 20, description: "Resisting temptation, managing anger, overcoming selfishness")
            ]
        }
    }
}

// MARK: - Subcategory

struct MeritSubcategory: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let points: Int
    let description: String
    let fullTitle: String

    init(name: String, points: Int, description: String) {
        self.name = name
        self.points = points
        self.description = description
        self.fullTitle = description.isEmpty ? name : "\(name) – \(description)"
    }
}

struct MeritCategoryRow: Identifiable, Hashable {
    let id: String
    let rTitle: String
    let subcategoryTitle: String
    let points: Int
}

struct MeritCategoryGroup: Identifiable, Hashable {
    let id: String
    let rKey: MeritR
    let rTitle: String
    let description: String
    let subcategories: [MeritSubcategory]
}

// MARK: - Merit Entry (for logging points)

struct MeritEntry: Identifiable, Codable {
    let id: String
    let timestamp: Date
    let dateOfEvent: Date
    let staffName: String
    let studentName: String
    let grade: String
    let section: String
    let house: House
    let r: String
    let subcategory: String
    let points: Int
    let notes: String
}

// MARK: - Sample Student Data (for testing)

struct Student: Identifiable, Codable {
    let id: String
    let name: String
    let grade: String
    let section: String
    let house: House
    let gender: String
    let password: String
    let parentCode: String  // Unique code for parent verification

    var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// Sample students for testing
extension Student {
    static let sampleStudents: [Student] = [
        Student(id: "1", name: "Ahmed Khan", grade: "7", section: "A", house: .abuBakr, gender: "M", password: "test123", parentCode: "AK7001"),
        Student(id: "2", name: "Fatima Ali", grade: "7", section: "A", house: .khadijah, gender: "F", password: "test123", parentCode: "FA7002"),
        Student(id: "3", name: "Omar Hassan", grade: "7", section: "B", house: .umar, gender: "M", password: "test123", parentCode: "OH7003"),
        Student(id: "4", name: "Aisha Rahman", grade: "7", section: "B", house: .aishah, gender: "F", password: "test123", parentCode: "AR7004"),
        Student(id: "5", name: "Yusuf Ahmad", grade: "8", section: "A", house: .abuBakr, gender: "M", password: "test123", parentCode: "YA8005"),
        Student(id: "6", name: "Maryam Malik", grade: "8", section: "A", house: .khadijah, gender: "F", password: "test123", parentCode: "MM8006"),
        Student(id: "7", name: "Ibrahim Qureshi", grade: "8", section: "B", house: .umar, gender: "M", password: "test123", parentCode: "IQ8007"),
        Student(id: "8", name: "Khadijah Hussain", grade: "8", section: "B", house: .aishah, gender: "F", password: "test123", parentCode: "KH8008"),
        Student(id: "9", name: "Bilal Farooq", grade: "9", section: "A", house: .abuBakr, gender: "M", password: "test123", parentCode: "BF9009"),
        Student(id: "10", name: "Zainab Siddiqui", grade: "9", section: "A", house: .khadijah, gender: "F", password: "test123", parentCode: "ZS9010"),
        Student(id: "11", name: "Hamza Sheikh", grade: "9", section: "B", house: .umar, gender: "M", password: "test123", parentCode: "HS9011"),
        Student(id: "12", name: "Sara Iqbal", grade: "9", section: "B", house: .aishah, gender: "F", password: "test123", parentCode: "SI9012")
    ]
}
