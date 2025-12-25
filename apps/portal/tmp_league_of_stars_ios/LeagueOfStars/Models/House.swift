import SwiftUI

enum House: String, CaseIterable, Identifiable, Codable {
    case abuBakr = "House of Abū Bakr"
    case khadijah = "House of Khadījah"
    case umar = "House of ʿUmar"
    case aishah = "House of ʿĀʾishah"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .abuBakr:
            return Color(hex: "2f0a61") // Purple
        case .khadijah:
            return Color(hex: "055437") // Green
        case .umar:
            return Color(hex: "000068") // Navy Blue
        case .aishah:
            return Color(hex: "910000") // Dark Red
        }
    }

    var shortName: String {
        switch self {
        case .abuBakr: return "Abū Bakr"
        case .khadijah: return "Khadījah"
        case .umar: return "ʿUmar"
        case .aishah: return "ʿĀʾishah"
        }
    }

    var icon: String {
        switch self {
        case .abuBakr: return "star.fill"
        case .khadijah: return "heart.fill"
        case .umar: return "shield.fill"
        case .aishah: return "book.fill"
        }
    }
}

// MARK: - Color Extension for Hex Support
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
