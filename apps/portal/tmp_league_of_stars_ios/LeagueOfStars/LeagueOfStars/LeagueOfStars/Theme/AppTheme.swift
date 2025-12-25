import SwiftUI
import UIKit

enum AppTheme {
    enum Colors {
        static let background = Color(hex: "FAF9F7")
        static let foreground = Color(hex: "1A1A2E")
        static let royalPurple = Color(hex: "2F0A61")
        static let royalPurpleLight = Color(hex: "4A1A8A")
        static let gold = Color(hex: "C9A227")
        static let goldLight = Color(hex: "E8D48B")
        static let goldDark = Color(hex: "9A7B1A")
        static let cream = Color(hex: "FAF9F7")
        static let ivory = Color(hex: "F5F3EF")
        static let charcoal = Color(hex: "1A1A2E")
        static let nightTop = Color(hex: "1A1A2E")
        static let nightMid = Color(hex: "16162A")
        static let nightBottom = Color(hex: "0F0F1A")
    }

    enum Gradients {
        static let gold = LinearGradient(
            colors: [Colors.gold, Colors.goldLight],
            startPoint: .leading,
            endPoint: .trailing
        )
        static let royal = LinearGradient(
            colors: [Colors.royalPurpleLight, Colors.royalPurple],
            startPoint: .top,
            endPoint: .bottom
        )
        static let ivory = LinearGradient(
            colors: [Colors.cream, Colors.ivory],
            startPoint: .top,
            endPoint: .bottom
        )
        static let night = LinearGradient(
            colors: [Colors.nightTop, Colors.nightMid, Colors.nightBottom],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    enum Fonts {
        static func display(size: CGFloat, weight: Font.Weight = .semibold) -> Font {
            if let name = availableFontName(["Playfair Display", "PlayfairDisplay-Regular", "PlayfairDisplay"]) {
                return Font.custom(name, size: size).weight(weight)
            }
            return .system(size: size, weight: weight, design: .serif)
        }

        static func body(size: CGFloat, weight: Font.Weight = .regular) -> Font {
            if let name = availableFontName(["Cinzel", "Cinzel-Regular", "CinzelRoman-Regular"]) {
                return Font.custom(name, size: size).weight(weight)
            }
            return .system(size: size, weight: weight, design: .serif)
        }

        private static func availableFontName(_ names: [String]) -> String? {
            for name in names where UIFont(name: name, size: 12) != nil {
                return name
            }
            return nil
        }
    }
}

extension View {
    func regalCardBackground(cornerRadius: CGFloat = 16) -> some View {
        background(
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(AppTheme.Gradients.ivory)
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(AppTheme.Colors.gold.opacity(0.2), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 4)
        )
    }

    func regalInputBackground(cornerRadius: CGFloat = 12) -> some View {
        background(
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .stroke(AppTheme.Colors.gold.opacity(0.2), lineWidth: 1)
                )
        )
    }
}
